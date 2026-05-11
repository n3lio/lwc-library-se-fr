import { LightningElement, api } from 'lwc';

const LABELS = {
    en: {
        cardTitle: 'Active Segments',
        defaultSegments: 'High-value customers,Frequent buyers,Recent activity,Cross-sell eligible'
    },
    fr: {
        cardTitle: 'Segments actifs',
        defaultSegments: 'Clients à forte valeur,Acheteurs fréquents,Activité récente,Éligibles au cross-sell'
    }
};

// Soft pastel palette used when colorMode='random'. Each segment picks one deterministically from
// its index so the same list renders the same colors on every re-render.
const PASTEL_PALETTE = [
    { bg: '#e3f2fd', fg: '#0c4a6e' },  // light blue
    { bg: '#fce7f3', fg: '#831843' },  // light pink
    { bg: '#dcfce7', fg: '#166534' },  // light green
    { bg: '#fef3c7', fg: '#92400e' },  // light amber
    { bg: '#ede9fe', fg: '#5b21b6' },  // light violet
    { bg: '#ffedd5', fg: '#9a3412' },  // light orange
    { bg: '#cffafe', fg: '#155e75' },  // light cyan
    { bg: '#fae8ff', fg: '#6b21a8' }   // light fuchsia
];

const DEFAULT_SINGLE_COLOR = '#ecebea'; // light grey — the current SLDS badge look

// Picks a readable foreground for an arbitrary hex background (relative luminance threshold).
function contrastText(hex) {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return '#181818';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#181818' : '#ffffff';
}

export default class SeFrActiveSegments extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:groups';
    @api segmentsCsv;

    // 'random' (default) | 'custom' | 'single'
    @api colorMode = 'random';
    // Used in 'custom' mode. CSV of hex colors, one per segment. Repeats / cycles if shorter.
    @api customColorsCsv;
    // Used in 'single' mode. One hex color for every tag.
    @api singleColor = DEFAULT_SINGLE_COLOR;

    get labels() { return LABELS[this.language] || LABELS.en; }

    get resolvedSegmentsCsv() {
        return this.segmentsCsv && this.segmentsCsv.trim().length > 0
            ? this.segmentsCsv
            : this.labels.defaultSegments;
    }

    _customColors() {
        return (this.customColorsCsv || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }

    _colorForIndex(i) {
        if (this.colorMode === 'custom') {
            const list = this._customColors();
            if (list.length === 0) return { bg: DEFAULT_SINGLE_COLOR, fg: '#181818' };
            const bg = list[i % list.length];
            return { bg, fg: contrastText(bg) };
        }
        if (this.colorMode === 'single') {
            const bg = this.singleColor || DEFAULT_SINGLE_COLOR;
            return { bg, fg: contrastText(bg) };
        }
        // random (default) — deterministic per index
        return PASTEL_PALETTE[i % PASTEL_PALETTE.length];
    }

    get segments() {
        const list = (this.resolvedSegmentsCsv || '').split(',').map(s => s.trim()).filter(Boolean);
        return list.map((name, i) => {
            const c = this._colorForIndex(i);
            return {
                id: `${i}`,
                name,
                style: `background-color: ${c.bg}; color: ${c.fg};`
            };
        });
    }

    get displayTitle() {
        const title = this.cardTitle || this.labels.cardTitle;
        const count = this.segments.length;
        return `${title} (${count})`;
    }
}
