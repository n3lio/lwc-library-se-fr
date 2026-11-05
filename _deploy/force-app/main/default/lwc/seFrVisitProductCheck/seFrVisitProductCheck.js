import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getProducts from '@salesforce/apex/SE_FR_ProductCheckController.getProducts';

/**
 * CCO FR - Visit Product Check
 * Relevé produits terrain : liste de produits (depuis le Standard Pricebook par défaut),
 * chaque produit "Présent" / "Rupture" + prix constaté facultatif + note.
 *
 * Publie la progression dans localStorage sous `sefr-visit-progress::<recordId>` dès la
 * première interaction utilisateur → seFrVisitPlan coche automatiquement l'étape "products".
 */

const STORAGE_PREFIX = 'sefr-visit-progress::';
const STATE_PREFIX = 'sefr-product-check::';
const STEP_KEY = 'products';

const DICT = {
    fr: {
        cardTitle: 'Relevé produits',
        cardIcon: 'standard:product_item',
        loading: 'Chargement du catalogue…',
        empty: 'Aucun produit actif dans le pricebook.',
        presentLabel: 'Présent',
        oosLabel: 'Rupture',
        clearLabel: '—',
        unitPriceLabel: 'Catalogue',
        observedPricePh: 'Prix constaté',
        notePh: 'Note (facultative)',
        progressDone: 'relevés',
        progressTotal: 'produits',
        toastSavedTitle: 'Relevé en cours',
        toastSavedMsg: 'Progression enregistrée.',
        hint: 'Pour chaque produit, indiquez s\'il est présent en rayon ou en rupture. Ajoutez le prix observé si besoin.'
    },
    en: {
        cardTitle: 'Product audit',
        cardIcon: 'standard:product_item',
        loading: 'Loading catalog…',
        empty: 'No active products in the pricebook.',
        presentLabel: 'Present',
        oosLabel: 'Out of stock',
        clearLabel: '—',
        unitPriceLabel: 'List',
        observedPricePh: 'Observed price',
        notePh: 'Note (optional)',
        progressDone: 'audited',
        progressTotal: 'products',
        toastSavedTitle: 'Audit in progress',
        toastSavedMsg: 'Progress saved.',
        hint: 'For each product, flag it as present on shelf or out of stock. Add the observed price if needed.'
    }
};

export default class SeFrVisitProductCheck extends LightningElement {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon;
    @api maxCount = 12;

    products = [];
    isLoading = true;
    error;
    _state = {}; // { productId: { status: 'present'|'oos'|null, price: str, note: str } }
    _publishedOnce = false;

    @wire(getProducts, { recordId: '$recordId', maxCount: '$maxCount' })
    wiredProducts({ data, error }) {
        this.isLoading = false;
        if (data) {
            this._loadLocalState();
            this.products = data.map(p => ({
                ...p,
                displayPrice: this._formatPrice(p.unitPrice, p.currencyIsoCode),
                observedPrice: this._state[p.productId]?.price || '',
                note: this._state[p.productId]?.note || '',
                presentClass: this._cls(this._state[p.productId]?.status === 'present', 'sefrvpc-pill sefrvpc-pill--present'),
                oosClass: this._cls(this._state[p.productId]?.status === 'oos', 'sefrvpc-pill sefrvpc-pill--oos'),
                status: this._state[p.productId]?.status || null,
                hasImage: !!p.imageUrl,
                imageUrl: p.imageUrl || '',
                initial: (p.name || '?').trim().charAt(0).toUpperCase()
            }));
            this.error = null;
        } else if (error) {
            this.error = error.body?.message || error.message || 'Erreur de chargement';
            this.products = [];
        }
    }

    _cls(active, base) {
        return base + (active ? ' sefrvpc-pill--active' : '');
    }

    _loadLocalState() {
        if (!this.recordId) return;
        try {
            const raw = window.localStorage.getItem(STATE_PREFIX + this.recordId) || '';
            const parsed = raw ? JSON.parse(raw) : {};
            // New shape: { byId, present, ruptures, priceAlerts, notes, ... }
            // Legacy shape: flat map keyed by productId.
            if (parsed && parsed.byId && typeof parsed.byId === 'object') {
                this._state = parsed.byId;
            } else if (parsed && (parsed.ruptures || parsed.present || parsed.priceAlerts)) {
                this._state = parsed.byId || {};
            } else {
                this._state = parsed || {};
            }
            this._publishedOnce = Object.keys(this._state).length > 0;
        } catch (e) {
            this._state = {};
        }
    }

    _saveLocalState() {
        try {
            // Derive named arrays so that seFrVisitSummaryAI (and the Einstein prompt)
            // can speak by product name instead of by Id.
            const present = [];
            const ruptures = [];
            const priceAlerts = [];
            const notes = [];
            (this.products || []).forEach(p => {
                const st = this._state[p.productId];
                if (!st) return;
                const base = { id: p.productId, name: p.name, code: p.productCode };
                if (st.status === 'present') present.push(base);
                if (st.status === 'oos') ruptures.push(base);
                const obsNum = this._parsePrice(st.price);
                if (obsNum != null && p.unitPrice != null && Math.abs(obsNum - p.unitPrice) >= 0.01) {
                    const deltaPct = p.unitPrice > 0
                        ? Math.round(((obsNum - p.unitPrice) / p.unitPrice) * 100)
                        : null;
                    priceAlerts.push({
                        ...base,
                        observedPrice: obsNum,
                        listPrice: p.unitPrice,
                        currencyIsoCode: p.currencyIsoCode || null,
                        deltaPct
                    });
                }
                if (st.note && st.note.trim()) {
                    notes.push({ ...base, note: st.note.trim() });
                }
            });
            const payload = {
                at: new Date().toISOString(),
                byId: this._state,
                items: this.products.length,
                audited: present.length + ruptures.length,
                present,
                ruptures,
                priceAlerts,
                notes
            };
            window.localStorage.setItem(STATE_PREFIX + this.recordId, JSON.stringify(payload));
        } catch (e) { /* ignore */ }
    }

    _parsePrice(v) {
        if (v == null || v === '') return null;
        const n = parseFloat(String(v).replace(',', '.').replace(/[^0-9.-]/g, ''));
        return isNaN(n) ? null : n;
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

    get labels() { return DICT[this.language === 'en' ? 'en' : 'fr']; }
    get effectiveTitle() { return (this.cardTitle && this.cardTitle.trim()) ? this.cardTitle : this.labels.cardTitle; }
    get effectiveIcon() { return (this.cardIcon && this.cardIcon.trim()) ? this.cardIcon : this.labels.cardIcon; }

    get doneCount() {
        return this.products.filter(p => this._state[p.productId]?.status).length;
    }
    get totalCount() { return this.products.length; }

    get hasProducts() { return !this.isLoading && this.products.length > 0; }
    get isEmpty() { return !this.isLoading && this.products.length === 0 && !this.error; }

    _refreshProducts() {
        // Reproject the array to force reactive refresh of pill classes.
        this.products = this.products.map(p => {
            const s = this._state[p.productId]?.status || null;
            return {
                ...p,
                status: s,
                observedPrice: this._state[p.productId]?.price || '',
                note: this._state[p.productId]?.note || '',
                presentClass: this._cls(s === 'present', 'sefrvpc-pill sefrvpc-pill--present'),
                oosClass: this._cls(s === 'oos', 'sefrvpc-pill sefrvpc-pill--oos'),
                hasImage: !!p.imageUrl,
                initial: p.initial || (p.name || '?').trim().charAt(0).toUpperCase()
            };
        });
    }

    _ensurePublished() {
        if (!this._publishedOnce) {
            this._publishProgress(STEP_KEY, true);
            this._publishedOnce = true;
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastSavedTitle,
                message: this.labels.toastSavedMsg,
                variant: 'success'
            }));
        }
    }

    handlePresent(event) {
        const pid = event.currentTarget.dataset.id;
        const cur = this._state[pid] || {};
        this._state[pid] = { ...cur, status: cur.status === 'present' ? null : 'present' };
        this._saveLocalState();
        this._refreshProducts();
        this._ensurePublished();
    }
    handleOos(event) {
        const pid = event.currentTarget.dataset.id;
        const cur = this._state[pid] || {};
        this._state[pid] = { ...cur, status: cur.status === 'oos' ? null : 'oos' };
        this._saveLocalState();
        this._refreshProducts();
        this._ensurePublished();
    }
    handlePriceChange(event) {
        const pid = event.currentTarget.dataset.id;
        const cur = this._state[pid] || {};
        this._state[pid] = { ...cur, price: event.target.value };
        this._saveLocalState();
        this._ensurePublished();
    }
    handleNoteChange(event) {
        const pid = event.currentTarget.dataset.id;
        const cur = this._state[pid] || {};
        this._state[pid] = { ...cur, note: event.target.value };
        this._saveLocalState();
        this._ensurePublished();
    }

    _formatPrice(v, iso) {
        if (v == null) return '';
        try {
            return new Intl.NumberFormat(this.language === 'en' ? 'en-US' : 'fr-FR', {
                style: 'currency',
                currency: iso || (this.language === 'en' ? 'USD' : 'EUR'),
                maximumFractionDigits: 2
            }).format(v);
        } catch (e) {
            return `${v}`;
        }
    }
}
