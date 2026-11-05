import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/**
 * CCO FR - Visit Shelf Space
 * Relevé linéaire manuel : facings par catégorie / segment / marque (Ma marque vs Concurrence)
 * avec historique (précédent + A-1) et calcul automatique de la Part de Linéaire (PDL).
 *
 * Inspiré de dimShelfSpace (DIM / DBI) — adapté bilingue, prop-driven (brand name, seed JSON).
 *
 * Au save : publie `shelf:done` dans localStorage `sefr-visit-progress::<visitId>` pour que
 * seFrVisitPlan coche automatiquement l'étape "Relevé linéaire".
 */

const STORAGE_PREFIX = 'sefr-visit-progress::';
const SHELF_DATA_PREFIX = 'sefr-shelf-data::';
const SHELF_INSIGHTS_PREFIX = 'sefr-shelf-insights::';
const STEP_KEY = 'shelf';

const DICT = {
    fr: {
        cardTitle: 'Relevé linéaire',
        cardIcon: 'standard:dashboard',
        saveBtn: 'Enregistrer',
        copyPrevBtn: 'Reprendre les valeurs précédentes',
        copyPrevShort: 'Reprendre A-1',
        copyPrevToast: 'Valeurs précédentes recopiées — ajustez-les si besoin.',
        pdlNow: 'PDL actuelle',
        pdlPrev: 'Précédente',
        pdlEvo: 'Évolution',
        headSegment: 'Segment',
        headBrand: 'Marque',
        headFacingsNow: 'Facings',
        headFacingsPrev: 'Facings',
        headFacingsA1: 'Facings',
        headSegTotalNow: 'Total segment',
        headSegTotalPrev: 'Total segment',
        subNow: 'Actuel',
        subPrev: 'Précédent',
        subA1: 'A-1',
        toastTitle: 'Relevé enregistré',
        toastMsg: 'PDL {brand} actuelle : {now} (précédente : {prev})',
        unitPt: 'pt',
        unitPts: 'pts'
    },
    en: {
        cardTitle: 'Shelf audit',
        cardIcon: 'standard:dashboard',
        saveBtn: 'Save',
        copyPrevBtn: 'Copy previous values',
        copyPrevShort: 'Copy previous',
        copyPrevToast: 'Previous values copied — adjust as needed.',
        pdlNow: 'Current share',
        pdlPrev: 'Previous',
        pdlEvo: 'Change',
        headSegment: 'Segment',
        headBrand: 'Brand',
        headFacingsNow: 'Facings',
        headFacingsPrev: 'Facings',
        headFacingsA1: 'Facings',
        headSegTotalNow: 'Segment total',
        headSegTotalPrev: 'Segment total',
        subNow: 'Current',
        subPrev: 'Previous',
        subA1: 'Y-1',
        toastTitle: 'Audit saved',
        toastMsg: '{brand} shelf share: {now} (previous: {prev})',
        unitPt: 'pt',
        unitPts: 'pts'
    }
};

// Default seed — CPG épicerie générique. Supplanté par la prop `seedJson` si fournie.
const DEFAULT_SEED = [
    { id: '1', category: 'Boissons rafraîchissantes', segment: 'Colas', brand: 'main',       facingsCurrent: null, facingsPrev: 16, facingsA1: 14, facingsSegPrev: 48, facingsSegA1: 46 },
    { id: '2', category: 'Boissons rafraîchissantes', segment: 'Colas', brand: 'competitor', facingsCurrent: null, facingsPrev: 32, facingsA1: 32, facingsSegPrev: 48, facingsSegA1: 46 },
    { id: '3', category: 'Boissons rafraîchissantes', segment: 'Jus',   brand: 'main',       facingsCurrent: null, facingsPrev: 10, facingsA1: 12, facingsSegPrev: 30, facingsSegA1: 32 },
    { id: '4', category: 'Boissons rafraîchissantes', segment: 'Jus',   brand: 'competitor', facingsCurrent: null, facingsPrev: 20, facingsA1: 20, facingsSegPrev: 30, facingsSegA1: 32 },
    { id: '5', category: 'Snacks salés',              segment: 'Chips', brand: 'main',       facingsCurrent: null, facingsPrev: 12, facingsA1: 10, facingsSegPrev: 36, facingsSegA1: 34 },
    { id: '6', category: 'Snacks salés',              segment: 'Chips', brand: 'competitor', facingsCurrent: null, facingsPrev: 24, facingsA1: 24, facingsSegPrev: 36, facingsSegA1: 34 },
    { id: '7', category: 'Snacks sucrés',             segment: 'Biscuits', brand: 'main',       facingsCurrent: null, facingsPrev: 14, facingsA1: 12, facingsSegPrev: 42, facingsSegA1: 40 },
    { id: '8', category: 'Snacks sucrés',             segment: 'Biscuits', brand: 'competitor', facingsCurrent: null, facingsPrev: 28, facingsA1: 28, facingsSegPrev: 42, facingsSegA1: 40 },
    { id: '9', category: 'Produits laitiers',         segment: 'Yaourts',  brand: 'main',       facingsCurrent: null, facingsPrev: 18, facingsA1: 16, facingsSegPrev: 50, facingsSegA1: 48 },
    { id: '10', category: 'Produits laitiers',        segment: 'Yaourts',  brand: 'competitor', facingsCurrent: null, facingsPrev: 32, facingsA1: 32, facingsSegPrev: 50, facingsSegA1: 48 }
];

export default class SeFrVisitShelfSpace extends LightningElement {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon;
    @api brandName = 'Ma marque';
    @api competitorLabel;
    @api seedJson;

    @track shelfData = [];
    @track isSaved = false;

    connectedCallback() {
        this._initData();
    }

    _initData() {
        // 1) try restoring previous save
        if (this.recordId) {
            try {
                const raw = window.localStorage.getItem(SHELF_DATA_PREFIX + this.recordId);
                if (raw) {
                    const restored = JSON.parse(raw);
                    if (Array.isArray(restored) && restored.length) {
                        this.shelfData = restored;
                        this.isSaved = true;
                        this._recalcSegment();
                        return;
                    }
                }
            } catch (e) { /* ignore */ }
        }
        // 2) parse custom seed if provided
        let seed = DEFAULT_SEED;
        if (this.seedJson) {
            try {
                const parsed = JSON.parse(this.seedJson);
                if (Array.isArray(parsed) && parsed.length) seed = parsed;
            } catch (e) { /* fallback to default */ }
        }
        // Deep clone + recompute segments
        this.shelfData = JSON.parse(JSON.stringify(seed));
        this._recalcSegment();
    }

    get labels() { return DICT[this.language === 'en' ? 'en' : 'fr']; }
    get effectiveTitle() { return (this.cardTitle && this.cardTitle.trim()) ? this.cardTitle : this.labels.cardTitle; }
    get effectiveIcon()  { return (this.cardIcon && this.cardIcon.trim())  ? this.cardIcon  : this.labels.cardIcon; }
    get effectiveCompetitorLabel() {
        if (this.competitorLabel && this.competitorLabel.trim()) return this.competitorLabel;
        return this.language === 'en' ? 'Competition' : 'Concurrence';
    }

    _brandDisplay(code) {
        return code === 'main' ? this.brandName : this.effectiveCompetitorLabel;
    }

    get pdlGlobalPct() { return this._computePdl('facingsCurrent', 'facingsSegment'); }
    get pdlPrevPct()   { return this._computePdl('facingsPrev',    'facingsSegPrev'); }
    get pdlGlobal()    { const p = this.pdlGlobalPct; return p == null ? '—' : p + '%'; }
    get pdlPrev()      { const p = this.pdlPrevPct;   return p == null ? '—' : p + '%'; }

    _computePdl(mainField, segField) {
        const mainTotal = this.shelfData
            .filter(r => r.brand === 'main')
            .reduce((s, r) => s + (r[mainField] || 0), 0);
        const segTotal = this.shelfData
            .filter(r => r.brand === 'main')
            .reduce((s, r) => s + (r[segField] || 0), 0);
        if (segTotal === 0) return null;
        return Math.round((mainTotal / segTotal) * 100);
    }

    get pdlEvolution() {
        const now = this.pdlGlobalPct;
        const prev = this.pdlPrevPct;
        if (now == null || prev == null) return '—';
        const delta = Math.round((now - prev) * 10) / 10;
        const unit = Math.abs(delta) === 1 ? this.labels.unitPt : this.labels.unitPts;
        if (delta > 0) return '+' + delta + ' ' + unit;
        if (delta < 0) return delta + ' ' + unit;
        return '= 0 ' + this.labels.unitPt;
    }

    get pdlEvolutionClass() {
        const now = this.pdlGlobalPct;
        const prev = this.pdlPrevPct;
        if (now == null || prev == null) return 'sefrvss-pdl__value sefrvss-pdl__value--muted';
        const delta = now - prev;
        if (delta > 0.5)  return 'sefrvss-pdl__value sefrvss-pdl__value--up';
        if (delta < -0.5) return 'sefrvss-pdl__value sefrvss-pdl__value--down';
        return 'sefrvss-pdl__value sefrvss-pdl__value--muted';
    }

    get categories() {
        const cats = [...new Set(this.shelfData.map(r => r.category))];
        return cats.map(cat => ({
            name: cat,
            rows: this.shelfData.filter(r => r.category === cat).map(r => ({
                ...r,
                brandDisplay: this._brandDisplay(r.brand),
                rowClass: r.brand === 'main' ? 'sefrvss-row sefrvss-row--main' : 'sefrvss-row sefrvss-row--competitor',
                prevDisplay:    r.facingsPrev    != null ? r.facingsPrev    : '—',
                a1Display:      r.facingsA1      != null ? r.facingsA1      : '—',
                segNowDisplay:  r.facingsSegment != null ? r.facingsSegment : '—',
                segPrevDisplay: r.facingsSegPrev != null ? r.facingsSegPrev : '—'
            }))
        }));
    }

    handleCopyPrev() {
        this.shelfData = this.shelfData.map(r => ({
            ...r,
            facingsCurrent: r.facingsPrev != null ? r.facingsPrev : r.facingsCurrent
        }));
        this._recalcSegment();
        this.isSaved = false;
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.copyPrevShort,
            message: this.labels.copyPrevToast,
            variant: 'success'
        }));
    }

    get canCopyPrev() {
        return this.shelfData.some(r => r.facingsPrev != null);
    }

    handleFacingsChange(event) {
        const rowId = event.currentTarget.dataset.rowid;
        const value = parseInt(event.detail.value, 10);
        this.shelfData = this.shelfData.map(r => {
            if (r.id === rowId) return { ...r, facingsCurrent: isNaN(value) ? null : value };
            return r;
        });
        this._recalcSegment();
        this.isSaved = false;
    }

    _recalcSegment() {
        const groups = {};
        this.shelfData.forEach(r => {
            const key = r.category + '|' + r.segment;
            if (!groups[key]) groups[key] = 0;
            groups[key] += (r.facingsCurrent || 0);
        });
        this.shelfData = this.shelfData.map(r => {
            const key = r.category + '|' + r.segment;
            return { ...r, facingsSegment: groups[key] || null };
        });
    }

    handleSave() {
        this.isSaved = true;
        try {
            window.localStorage.setItem(SHELF_DATA_PREFIX + this.recordId, JSON.stringify(this.shelfData));
        } catch (e) { /* ignore */ }
        this._publishProgress(STEP_KEY, true);
        this._publishShelfInsights();
        const msg = this.labels.toastMsg
            .replace('{brand}', this.brandName)
            .replace('{now}',   this.pdlGlobal)
            .replace('{prev}',  this.pdlPrev);
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.toastTitle,
            message: msg,
            variant: 'success'
        }));
    }

    _publishProgress(stepKey, done) {
        if (!this.recordId) return;
        try {
            const key = STORAGE_PREFIX + this.recordId;
            const raw = window.localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            if (done) obj[stepKey] = { done: true, at: new Date().toISOString() };
            else delete obj[stepKey];
            window.localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) { /* ignore */ }
    }

    _publishShelfInsights() {
        try {
            const grouped = {};
            let totalMain = 0;
            let totalAll = 0;
            let totalPrev = 0;
            this.shelfData.forEach(r => {
                const key = r.category + '|' + r.segment;
                if (!grouped[key]) grouped[key] = { main: 0, total: 0, prev: 0 };
                if (r.brand === 'main') {
                    grouped[key].main += (r.facingsCurrent || 0);
                    grouped[key].prev += (r.facingsPrev || 0);
                    totalMain += (r.facingsCurrent || 0);
                    totalPrev += (r.facingsPrev || 0);
                }
                grouped[key].total += (r.facingsCurrent || 0);
                totalAll += (r.facingsCurrent || 0);
            });
            const segments = [];
            const lowPdl = [];
            Object.entries(grouped).forEach(([k, v]) => {
                if (v.total > 0) {
                    const pdl = Math.round((v.main / v.total) * 100);
                    const [cat, seg] = k.split('|');
                    const entry = { category: cat, segment: seg, pdl, main: v.main, prev: v.prev, total: v.total };
                    segments.push(entry);
                    if (pdl < 30 || v.main < v.prev) {
                        lowPdl.push(entry);
                    }
                }
            });
            segments.sort((a, b) => b.pdl - a.pdl);
            const topSegments = segments.slice(0, 3);
            const brandSharePct = totalAll > 0 ? Math.round((totalMain / totalAll) * 100) : null;
            const competitionSharePct = brandSharePct != null ? (100 - brandSharePct) : null;
            const deltaFacings = totalMain - totalPrev;
            window.localStorage.setItem(SHELF_INSIGHTS_PREFIX + this.recordId,
                JSON.stringify({
                    at: new Date().toISOString(),
                    brand: this.brandName,
                    brandSharePct,
                    competitionSharePct,
                    brandFacings: totalMain,
                    totalFacings: totalAll,
                    deltaFacings,
                    segmentsCount: segments.length,
                    topSegments,
                    lowPdl
                }));
        } catch (e) { /* ignore */ }
    }
}
