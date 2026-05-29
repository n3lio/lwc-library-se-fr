import { LightningElement, api } from 'lwc';

const SIZE_MAP = {
    s:  { title: '1.5rem', sub: '0.85rem' },
    m:  { title: '2.25rem', sub: '1rem' },
    l:  { title: '3rem', sub: '1.15rem' },
    xl: { title: '4rem', sub: '1.3rem' }
};

const SPEED_MAP = {
    slow: 1.6,
    normal: 1,
    fast: 0.55
};

export default class SeFrSplashBanner extends LightningElement {
    @api language = 'fr';
    @api title = 'Bonjour 👋';
    @api subtitle = '';
    @api textSize = 'l';
    // waves | aurora | mesh | orbs | conic | geometric | constellation | grid
    @api bgStyle = 'waves';
    @api colorPrimary = '#0176d3';
    @api colorSecondary = '#a445ff';
    @api colorTertiary = '#ff6ec7';
    @api height = 220;
    @api darkText = false;
    @api animationSpeed = 'normal';
    @api alignment = 'center';
    @api ctaLabel = '';
    @api ctaUrl = '';

    get hostStyle() {
        const speed = SPEED_MAP[this.animationSpeed] || 1;
        return [
            `--sb-height: ${Number(this.height) || 220}px;`,
            `--sb-color-primary: ${this.colorPrimary};`,
            `--sb-color-secondary: ${this.colorSecondary};`,
            `--sb-color-tertiary: ${this.colorTertiary};`,
            `--sb-speed: ${speed};`
        ].join(' ');
    }

    get textStyle() {
        const sizes = SIZE_MAP[this.textSize] || SIZE_MAP.l;
        return `--sb-title-size: ${sizes.title}; --sb-sub-size: ${sizes.sub};`;
    }

    get rootClass() {
        const align = this.alignment === 'left' ? 'sb-align_left'
            : this.alignment === 'right' ? 'sb-align_right'
            : 'sb-align_center';
        return `sb-root sb-bg_${this.bgStyle} ${this.darkText ? 'sb-text_dark' : 'sb-text_light'} ${align}`;
    }

    get isWaves()        { return this.bgStyle === 'waves'; }
    get isAurora()       { return this.bgStyle === 'aurora'; }
    get isMesh()         { return this.bgStyle === 'mesh'; }
    get isOrbs()         { return this.bgStyle === 'orbs'; }
    get isConic()        { return this.bgStyle === 'conic'; }
    get isGeometric()    { return this.bgStyle === 'geometric'; }
    get isConstellation(){ return this.bgStyle === 'constellation'; }
    get isGrid()         { return this.bgStyle === 'grid'; }

    get hasSubtitle() { return !!this.subtitle && this.subtitle.trim().length > 0; }
    get hasCta() { return !!this.ctaLabel && !!this.ctaUrl; }

    handleCtaClick(event) {
        if (!this.ctaUrl) return;
        // Let the browser handle the link normally; the @click attribute is here so the SE
        // can route to a Salesforce internal URL via target=_self.
        event.stopPropagation();
    }
}
