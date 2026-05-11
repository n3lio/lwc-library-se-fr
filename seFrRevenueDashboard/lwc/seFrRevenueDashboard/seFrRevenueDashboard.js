import { LightningElement, api } from 'lwc';

const DEFAULT_CHART = [
    { y1: 8200, y2: 8900, y3: 9500 },
    { y1: 7500, y2: 8100, y3: 8800 },
    { y1: 9100, y2: 8500, y3: 10200 },
    { y1: 8800, y2: 9300, y3: 10050 },
    { y1: 9500, y2: 10100, y3: 0 },
    { y1: 10200, y2: 11500, y3: 0 },
    { y1: 8000, y2: 8800, y3: 0 },
    { y1: 4500, y2: 5200, y3: 0 },
    { y1: 11000, y2: 12500, y3: 0 },
    { y1: 10500, y2: 11200, y3: 0 },
    { y1: 9800, y2: 10300, y3: 0 },
    { y1: 11200, y2: 12100, y3: 0 }
];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_FR = ['Janv.', 'Févr.', 'Mars', 'Avr.', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

const LABELS = {
    en: {
        cardTitle: 'Revenue trend (3 years)',
        kpi1Label: 'YTD Revenue',
        kpi2Label: 'YoY Trend',
        kpi3Label: 'Previous Year Total',
        noData: 'No data',
        months: MONTHS_EN,
        buildDefaultChart() {
            return JSON.stringify(DEFAULT_CHART.map((d, i) => ({ month: MONTHS_EN[i], ...d })));
        }
    },
    fr: {
        cardTitle: 'Évolution du CA (sur 3 ans)',
        kpi1Label: 'CA cumulé',
        kpi2Label: 'Tendance YoY',
        kpi3Label: "Total de l'année précédente",
        noData: 'Pas de données',
        months: MONTHS_FR,
        buildDefaultChart() {
            return JSON.stringify(DEFAULT_CHART.map((d, i) => ({ month: MONTHS_FR[i], ...d })));
        }
    }
};

export default class SeFrRevenueDashboard extends LightningElement {
    @api recordId;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:performance';
    @api currencyCode = 'EUR';
    @api localeTag = 'fr-FR';

    @api year1Label = '2024';
    @api year2Label = '2025';
    @api year3Label = '2026';

    @api kpi1Label;
    @api kpi1Value = 38550;
    @api kpi2Label;
    @api kpi2Value = '+14.2%';
    @api kpi3Label;
    @api kpi3Value = 114200;

    @api chartMaxScale = 15000;
    @api chartDataJson;

    @api currentYearColor = 'var(--slds-g-color-accent-base-50, #0176d3)';

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedKpi1Label() { return this.kpi1Label || this.labels.kpi1Label; }
    get resolvedKpi2Label() { return this.kpi2Label || this.labels.kpi2Label; }
    get resolvedKpi3Label() { return this.kpi3Label || this.labels.kpi3Label; }

    get accentStyle() {
        return `--se-accent: ${this.currentYearColor};`;
    }

    _chartLang;
    chartData = [];

    connectedCallback() { this._rebuildChart(); }
    renderedCallback() {
        if (this._chartLang !== this.language) this._rebuildChart();
    }

    _rebuildChart() {
        const effectiveJson = this.chartDataJson && this.chartDataJson.trim().length
            ? this.chartDataJson
            : this.labels.buildDefaultChart();
        let raw;
        try { raw = JSON.parse(effectiveJson); }
        catch (e) { raw = DEFAULT_CHART.map((d, i) => ({ month: this.labels.months[i], ...d })); }

        const maxScale = Number(this.chartMaxScale) || 15000;
        const noDataLabel = this.labels.noData;
        this.chartData = raw.map((item, i) => ({
            ...item,
            id: i + 1,
            h1: `height: ${(item.y1 / maxScale) * 100}%;`,
            h2: `height: ${(item.y2 / maxScale) * 100}%;`,
            h3: `height: ${(item.y3 / maxScale) * 100}%;`,
            t1: `${this.year1Label}: ${this.formatCurrency(item.y1)}`,
            t2: `${this.year2Label}: ${this.formatCurrency(item.y2)}`,
            t3: item.y3 > 0 ? `${this.year3Label}: ${this.formatCurrency(item.y3)}` : noDataLabel,
            show3: item.y3 > 0
        }));
        this._chartLang = this.language;
    }

    get kpi1Display() { return typeof this.kpi1Value === 'number' ? this.formatCurrency(this.kpi1Value) : this.formatCurrency(Number(this.kpi1Value)) || this.kpi1Value; }
    get kpi3Display() { return typeof this.kpi3Value === 'number' ? this.formatCurrency(this.kpi3Value) : this.formatCurrency(Number(this.kpi3Value)) || this.kpi3Value; }

    get yAxisLabels() {
        const max = Number(this.chartMaxScale) || 15000;
        return [
            this.formatShort(max),
            this.formatShort(max * 2 / 3),
            this.formatShort(max / 3),
            this.formatShort(0)
        ];
    }

    formatCurrency(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) return '';
        return new Intl.NumberFormat(this.localeTag, {
            style: 'currency',
            currency: this.currencyCode,
            maximumFractionDigits: 0
        }).format(Number(value));
    }

    formatShort(value) {
        if (value >= 1000) {
            return `${Math.round(value / 1000)}k`;
        }
        return `${value}`;
    }
}
