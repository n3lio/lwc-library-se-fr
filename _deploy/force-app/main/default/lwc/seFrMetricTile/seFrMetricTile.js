import { LightningElement, api } from 'lwc';

const LABELS = {
    fr: {
        cardTitle: 'Indicateur',
        metricLabel: 'CA (12 mois)',
        trendSuffix: 'vs préc.',
        defaultSeriesJson: JSON.stringify([2.1, 2.4, 2.7, 3.0, 3.2, 3.1, 3.3, 3.5, 3.4, 3.6, 3.7, 3.85]),
        defaultTrend: '+14,2%',
        defaultValue: '38,5 k€',
        target: 'Objectif'
    },
    en: {
        cardTitle: 'Metric',
        metricLabel: 'Revenue (12 mo.)',
        trendSuffix: 'vs prev.',
        defaultSeriesJson: JSON.stringify([2.1, 2.4, 2.7, 3.0, 3.2, 3.1, 3.3, 3.5, 3.4, 3.6, 3.7, 3.85]),
        defaultTrend: '+14.2%',
        defaultValue: '$38.5k',
        target: 'Target'
    }
};

const DEFAULT_VIEWBOX_W = 600;
// Padding tuned so stroke-linecap dots and bar tops never get clipped on the edges.
const PAD = 10;

export default class SeFrMetricTile extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:metrics';
    @api hideCardTitle = false;
    @api metricLabel;
    @api seriesJson;
    @api trendDisplay;
    @api currentValueDisplay;
    @api currentValue;                      // optional numeric value — auto-formats via Intl
    @api currencyCode = 'EUR';

    // Visual variant. Default: line (back-compat with v1).
    @api chartStyle = 'line';               // 'line' | 'area' | 'bar' | 'mini-donut'

    // Optional comparison series (forecast / target). Same length as primary recommended.
    @api secondarySeriesJson = '';
    @api secondarySeriesColor = '#747474';

    // Optional horizontal target line.
    @api targetValue;
    @api targetLineColor = '#FE9339';
    @api showTargetLabel = false;

    // Y-axis scaling. 'auto' (data min/max), 'from-zero' (min=0), 'fixed' (yMin/yMax).
    @api scalingMode = 'auto';
    @api yMin;
    @api yMax;

    // Mini-donut variant — render a donut filling currentValue / targetValue.
    @api donutTrack = '#E5E5E5';

    @api accentColor = '#0176d3';
    @api height = 70;
    @api width = 0;                         // 0 = auto (uses default viewBox width 600)

    // Hover tooltip on data points (line / area / bar). Off by default to keep printable.
    @api enableTooltip = false;

    // Kept for backwards compatibility with existing FlexiPages — no longer read.
    @api trendPositive = false;

    _hovered = -1;

    get labels() { return LABELS[this.language] || LABELS.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedMetricLabel() { return this.metricLabel || this.labels.metricLabel; }
    get resolvedTrendDisplay() { return this.trendDisplay || this.labels.defaultTrend; }
    get trendSuffix() { return this.labels.trendSuffix; }
    get showCardWrapper() { return !this.hideCardTitle; }

    /**
     * Display value precedence:
     *   1. `currentValueDisplay` (string, manual format) → wins
     *   2. `currentValue` (numeric) → formatted via Intl with `currencyCode`
     *   3. dictionary default ('38,5 k€' / '$38.5k')
     */
    get resolvedValueDisplay() {
        if (this.currentValueDisplay) return this.currentValueDisplay;
        if (this.currentValue != null && this.currentValue !== '') {
            const n = Number(this.currentValue);
            if (Number.isFinite(n)) {
                try {
                    const locale = this.language === 'fr' ? 'fr-FR' : 'en-US';
                    return new Intl.NumberFormat(locale, {
                        style: 'currency',
                        currency: this.currencyCode || 'EUR',
                        notation: 'compact',
                        maximumFractionDigits: 1
                    }).format(n);
                } catch (e) { /* fall through */ }
            }
        }
        return this.labels.defaultValue;
    }

    get parsedData() {
        const raw = this.seriesJson || this.labels.defaultSeriesJson;
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr.map(Number).filter(n => !Number.isNaN(n)) : [];
        } catch (e) { return []; }
    }
    get parsedSecondary() {
        if (!this.secondarySeriesJson) return [];
        try {
            const arr = JSON.parse(this.secondarySeriesJson);
            return Array.isArray(arr) ? arr.map(Number).filter(n => !Number.isNaN(n)) : [];
        } catch (e) { return []; }
    }

    get _dataBounds() {
        const data = this.parsedData;
        const sec = this.parsedSecondary;
        const allValues = [...data, ...sec];
        if (this.targetValue != null && this.targetValue !== '') {
            const t = Number(this.targetValue);
            if (Number.isFinite(t)) allValues.push(t);
        }
        let min = Math.min(...allValues);
        let max = Math.max(...allValues);
        if (this.scalingMode === 'from-zero') {
            min = Math.min(0, min);
        } else if (this.scalingMode === 'fixed') {
            const ymin = Number(this.yMin);
            const ymax = Number(this.yMax);
            if (Number.isFinite(ymin)) min = ymin;
            if (Number.isFinite(ymax)) max = ymax;
        }
        if (max === min) max = min + 1;
        return { min, max };
    }

    get _viewBoxWidth() {
        const w = Number(this.width) || 0;
        return w > 0 ? w : DEFAULT_VIEWBOX_W;
    }
    get _viewBoxHeight() { return Number(this.height) || 70; }

    _yFor(value, h) {
        const { min, max } = this._dataBounds;
        return h - PAD - ((value - min) / (max - min)) * (h - 2 * PAD);
    }

    // Compute everything once for the chosen chartStyle.
    get chartGeometry() {
        const data = this.parsedData;
        const sec = this.parsedSecondary;
        const w = this._viewBoxWidth;
        const h = this._viewBoxHeight;
        if (data.length < 2) {
            return { hasData: false, viewBox: `0 0 ${w} ${h}`, width: w, height: h };
        }
        const stepX = (w - 2 * PAD) / (data.length - 1);
        const points = data.map((v, i) => ({
            x: PAD + i * stepX,
            y: this._yFor(v, h),
            value: v
        }));
        const secPoints = sec.length === data.length
            ? sec.map((v, i) => ({ x: PAD + i * stepX, y: this._yFor(v, h), value: v }))
            : [];

        // Path strings
        const path = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
        const area = `${path} L${points[points.length - 1].x},${h - PAD} L${points[0].x},${h - PAD} Z`;
        const secPath = secPoints.length
            ? secPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
            : '';

        // Bars
        const barWidth = Math.max(2, (w - 2 * PAD) / data.length * 0.7);
        const bars = points.map((p, i) => ({
            x: p.x - barWidth / 2,
            y: p.y,
            width: barWidth,
            height: Math.max(1, h - PAD - p.y),
            value: p.value,
            key: `b${i}`
        }));

        // Target line
        const targetY = (this.targetValue != null && this.targetValue !== '' && Number.isFinite(Number(this.targetValue)))
            ? this._yFor(Number(this.targetValue), h)
            : null;

        return {
            hasData: true,
            viewBox: `0 0 ${w} ${h}`,
            width: w,
            height: h,
            path,
            area,
            secPath,
            bars,
            points,
            secPoints,
            lastPoint: points[points.length - 1],
            lastSecPoint: secPoints.length ? secPoints[secPoints.length - 1] : null,
            targetY
        };
    }

    get viewBox() { return this.chartGeometry.viewBox; }

    // Style flags consumed by the template
    // 'line' = curve only (no fill below). 'area' = curve + filled area.
    get isLine()      { return this.chartStyle === 'line' || this.chartStyle === 'area'; }
    get isBar()       { return this.chartStyle === 'bar'; }
    get isMiniDonut() { return this.chartStyle === 'mini-donut'; }
    get isAreaFilled(){ return this.chartStyle === 'area'; }
    get hasSecondary(){ return this.chartGeometry.secPath && this.chartGeometry.secPath.length > 0; }
    get hasTargetLine(){ return this.chartGeometry.targetY != null && !this.isMiniDonut; }
    get targetLineY() { return this.chartGeometry.targetY; }
    get chartLineWidth() { return this._viewBoxWidth; }

    get svgPath() { return this.chartGeometry.path; }
    get svgArea() { return this.chartGeometry.area; }
    get svgSecPath() { return this.chartGeometry.secPath; }
    get bars() { return this.chartGeometry.bars; }
    get lastPointX() { return this.chartGeometry.lastPoint ? this.chartGeometry.lastPoint.x : 0; }
    get lastPointY() { return this.chartGeometry.lastPoint ? this.chartGeometry.lastPoint.y : 0; }

    /**
     * Mini-donut: renders a circular progress arc filling
     * currentValue / targetValue (or last data / max if target absent).
     * Sized off a fixed 100×100 viewBox — the SVG is then scaled by CSS to a 90×90 box.
     * Using a fixed viewBox keeps the rotate(-90 cx cy) origin in sync with the geometry.
     */
    get donutGeometry() {
        const size = 100;
        const r = size / 2 - 8;
        const cx = size / 2;
        const cy = size / 2;
        const circumference = 2 * Math.PI * r;
        const data = this.parsedData;
        const numerator = (this.currentValue != null && this.currentValue !== '')
            ? Number(this.currentValue)
            : (data.length ? data[data.length - 1] : 0);
        const denominator = (this.targetValue != null && this.targetValue !== '')
            ? Number(this.targetValue)
            : (data.length ? Math.max(...data) : 1);
        const ratio = denominator ? Math.max(0, Math.min(1, numerator / denominator)) : 0;
        const dashArr = circumference;
        const dashOff = circumference * (1 - ratio);
        return {
            size, r, cx, cy, circumference,
            ratio,
            dashArray: dashArr,
            dashOffset: dashOff,
            viewBox: `0 0 ${size} ${size}`,
            percentLabel: Math.round(ratio * 100) + '%'
        };
    }

    get donutSize() { return this.donutGeometry.size; }
    get donutCx() { return this.donutGeometry.cx; }
    get donutCy() { return this.donutGeometry.cy; }
    get donutR() { return this.donutGeometry.r; }
    get donutDashArray() { return this.donutGeometry.dashArray; }
    get donutDashOffset() { return this.donutGeometry.dashOffset; }
    get donutViewBox() { return this.donutGeometry.viewBox; }
    get donutPercent() { return this.donutGeometry.percentLabel; }

    get containerStyle() {
        return `--spark-color: ${this.accentColor}; --spark-fill: ${this.accentColor}22; --spark-secondary: ${this.secondarySeriesColor}; --spark-target: ${this.targetLineColor}; --spark-donut-track: ${this.donutTrack};`;
    }

    // Trend color autodetection (back-compat) — '+12%' green, '-8%' red, '0%' neutral.
    get trendClass() {
        const t = (this.resolvedTrendDisplay || '').trim();
        if (!t) return 'trend trend_neutral';
        if (t.startsWith('-') || t.startsWith('−')) return 'trend trend_neg';
        const numericBody = t.replace(/^[+\s]*/, '').replace(/[^\d.,-]/g, '').replace(',', '.');
        const n = parseFloat(numericBody);
        if (!Number.isNaN(n) && n === 0) return 'trend trend_neutral';
        return 'trend trend_pos';
    }
    get hasTrend() { return !!this.resolvedTrendDisplay; }

    get targetLabel() {
        if (this.targetValue == null || this.targetValue === '') return '';
        const t = Number(this.targetValue);
        if (!Number.isFinite(t)) return '';
        try {
            const locale = this.language === 'fr' ? 'fr-FR' : 'en-US';
            return this.labels.target + ' ' + new Intl.NumberFormat(locale, {
                style: 'currency', currency: this.currencyCode || 'EUR',
                notation: 'compact', maximumFractionDigits: 1
            }).format(t);
        } catch (e) {
            return this.labels.target + ' ' + t;
        }
    }
    get showTargetChip() { return this.showTargetLabel && !!this.targetLabel; }
}
