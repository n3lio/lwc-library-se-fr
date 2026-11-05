import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getVisitContext from '@salesforce/apex/SE_FR_VisitRestockOrderController.getVisitContext';
import getRestockProducts from '@salesforce/apex/SE_FR_VisitRestockOrderController.getRestockProducts';
import createRestockOrder from '@salesforce/apex/SE_FR_VisitRestockOrderController.createRestockOrder';

/**
 * seFrVisitRestockOrder — 3rd order component for the Visit page.
 *
 * How it differs from seFrOrderEntry (fast cadencier grid) and seFrVisitQuickOrder (visual
 * recommendation catalogue): this one is specifically tied to the OUTPUT of the Relevé
 * produits tab (seFrVisitProductCheck). It reads the ruptures published to localStorage,
 * resolves live Pricebook metadata via Apex, lets the SE pick quantities on a tight grid,
 * then one-clicks a Draft Order + OrderItems on the Visit's Account.
 *
 * Not a mock — real Apex, real inserts. The screen must never show the word Simulation.
 */
const LS_PREFIX = 'sefr-product-check::';

const I18N = {
    fr: {
        emptyTitle: 'Aucune rupture détectée',
        emptyHint: 'Lancez le Relevé produits et marquez les produits en rupture. Ils apparaîtront ici pour conversion en bon de commande.',
        emptyCta: 'Aller au relevé produits',
        headlineRuptures: '{n} produit·s en rupture à réassortir',
        headlineOne: '1 produit en rupture à réassortir',
        headlineAlerts: '+ {n} alertes prix',
        selectAll: 'Tout sélectionner',
        clearAll: 'Tout décocher',
        colSelect: '',
        colProduct: 'Produit',
        colCode: 'Code',
        colQty: 'Quantité',
        colPrice: 'Prix unitaire',
        colTotal: 'Total ligne',
        tagRupture: 'Rupture',
        tagPriceAlert: 'Alerte prix',
        actionConvert: 'Convertir en commande',
        actionConvertSingular: 'Créer la commande',
        totalLabel: 'Total estimé',
        selectedLabel: '{n} ligne·s sélectionnée·s',
        selectedLabelOne: '1 ligne sélectionnée',
        selectedLabelNone: 'aucune ligne sélectionnée',
        toastSuccessTitle: 'Commande créée',
        toastSuccessBody: 'Commande {num} créée avec {n} ligne·s.',
        toastErrorTitle: 'Création impossible',
        toastWarnNothing: 'Sélectionnez au moins une ligne à commander.',
        openOrder: 'Ouvrir la commande',
        loading: 'Chargement',
        inRupture: 'En rupture',
        observedPrice: 'Prix relevé',
        listPrice: 'Prix catalogue',
        delta: 'Écart',
        noPricebook: 'Produits sans entrée de prix active — non commandables.',
        skipped: '{n} produit·s ignoré·s (pas de prix catalogue actif).',
        refresh: 'Rafraîchir',
        cardTitleDefault: 'Réassort rupture → commande'
    },
    en: {
        emptyTitle: 'No stockout detected',
        emptyHint: 'Run the Product check and tag items as out of stock. They will appear here to be converted into an order.',
        emptyCta: 'Go to product check',
        headlineRuptures: '{n} stockout products to reorder',
        headlineOne: '1 stockout product to reorder',
        headlineAlerts: '+ {n} price alerts',
        selectAll: 'Select all',
        clearAll: 'Clear all',
        colSelect: '',
        colProduct: 'Product',
        colCode: 'Code',
        colQty: 'Quantity',
        colPrice: 'Unit price',
        colTotal: 'Line total',
        tagRupture: 'Stockout',
        tagPriceAlert: 'Price alert',
        actionConvert: 'Convert to order',
        actionConvertSingular: 'Create order',
        totalLabel: 'Estimated total',
        selectedLabel: '{n} lines selected',
        selectedLabelOne: '1 line selected',
        selectedLabelNone: 'no line selected',
        toastSuccessTitle: 'Order created',
        toastSuccessBody: 'Order {num} created with {n} lines.',
        toastErrorTitle: 'Could not create the order',
        toastWarnNothing: 'Select at least one line to order.',
        openOrder: 'Open the order',
        loading: 'Loading',
        inRupture: 'Out of stock',
        observedPrice: 'Observed price',
        listPrice: 'List price',
        delta: 'Delta',
        noPricebook: 'Some products have no active price entry — not orderable.',
        skipped: '{n} products skipped (no active list price).',
        refresh: 'Refresh',
        cardTitleDefault: 'Rupture → order'
    }
};

export default class SeFrVisitRestockOrder extends NavigationMixin(LightningElement) {
    @api recordId;
    ctxVisitId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:product_item';
    @api defaultQuantity = 6;
    @api includePriceAlerts = false;
    @api currencySymbol = '€';
    @api localeTag = 'fr-FR';

    @track lines = [];        // [{productId, name, code, qty, unitPrice, pricebookEntryId, selected, isAlert, deltaPct}]
    @track accountName;
    @track accountId;
    @track loading = true;
    @track creating = false;
    @track lastOrderId;
    @track lastOrderNumber;
    @track skippedCount = 0;

    _storageHandler;

    // ---------------------- lifecycle ----------------------

    connectedCallback() {
        this._storageHandler = (e) => {
            if (!e || !e.key) return;
            if (e.key === this._storageKey) this._reloadFromLocalStorage();
        };
        window.addEventListener('storage', this._storageHandler);
        this._loadAll();
    }

    disconnectedCallback() {
        if (this._storageHandler) window.removeEventListener('storage', this._storageHandler);
    }

    // ---------------------- getters ----------------------

    get t() { return I18N[this.language === 'en' ? 'en' : 'fr']; }

    get resolvedCardTitle() { return this.cardTitle || this.t.cardTitleDefault; }
    get resolvedCardIcon() { return this.cardIcon || 'standard:product_item'; }

    get _storageKey() { const id = this.ctxVisitId || this.recordId; return id ? LS_PREFIX + id : null; }

    get hasLines() { return this.lines && this.lines.length > 0; }
    get isEmpty() { return !this.loading && !this.hasLines; }

    get selectedLines() { return this.lines.filter(l => l.selected); }
    get selectedCount() { return this.selectedLines.length; }

    get selectedCountText() {
        const n = this.selectedCount;
        if (n === 0) return this.t.selectedLabelNone;
        if (n === 1) return this.t.selectedLabelOne;
        return this.t.selectedLabel.replace('{n}', n);
    }

    get headlineText() {
        const ruptures = this.lines.filter(l => !l.isAlert).length;
        const alerts = this.lines.filter(l => l.isAlert).length;
        let base;
        if (ruptures === 0 && alerts > 0) {
            base = this.t.headlineAlerts.replace('{n}', alerts).replace(/^\+\s*/, '');
        } else {
            base = ruptures === 1 ? this.t.headlineOne : this.t.headlineRuptures.replace('{n}', ruptures);
            if (alerts > 0) base += ' ' + this.t.headlineAlerts.replace('{n}', alerts);
        }
        return base;
    }

    get totalText() {
        const total = this.selectedLines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.unitPrice) || 0), 0);
        return this._formatMoney(total);
    }

    get convertLabel() {
        return this.selectedCount <= 1 ? this.t.actionConvertSingular : this.t.actionConvert;
    }

    get disableConvert() { return this.creating || this.selectedCount === 0; }
    get hasLastOrder() { return !!this.lastOrderId; }
    get skippedText() {
        return this.skippedCount
            ? this.t.skipped.replace('{n}', this.skippedCount)
            : null;
    }

    // ---------------------- data ----------------------

    async _loadAll() {
        this.loading = true;
        try {
            if (this.recordId) {
                const ctx = await getVisitContext({ visitId: this.recordId });
                this.accountId = ctx && ctx.accountId;
                this.accountName = ctx && ctx.accountName;
                this.ctxVisitId = ctx && ctx.visitId;   // on an Account page: latest visit of the account
            }
            await this._reloadFromLocalStorage();
        } catch (e) {
            // non-blocking — the empty-state will show
            // eslint-disable-next-line no-console
            console.warn('seFrVisitRestockOrder load error', e);
        } finally {
            this.loading = false;
        }
    }

    async _reloadFromLocalStorage() {
        const payload = this._readLocalStorage();
        const ruptures = (payload && Array.isArray(payload.ruptures)) ? payload.ruptures : [];
        const alerts = (this.includePriceAlerts && payload && Array.isArray(payload.priceAlerts))
            ? payload.priceAlerts : [];

        const productIds = Array.from(new Set([
            ...ruptures.map(r => r.id).filter(Boolean),
            ...alerts.map(a => a.id).filter(Boolean)
        ]));

        if (productIds.length === 0) {
            this.lines = [];
            this.skippedCount = 0;
            return;
        }

        let products = [];
        try {
            products = await getRestockProducts({ productIds });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('seFrVisitRestockOrder getRestockProducts error', e);
            products = [];
        }
        const byId = {};
        for (const p of products) byId[p.productId] = p;

        const built = [];
        let skipped = 0;
        for (const r of ruptures) {
            const p = byId[r.id];
            if (!p) { skipped++; continue; }
            built.push({
                productId: p.productId,
                name: p.name,
                code: p.productCode || r.code || '',
                qty: this.defaultQuantity > 0 ? this.defaultQuantity : 6,
                unitPrice: Number(p.listPrice) || 0,
                pricebookEntryId: p.pricebookEntryId,
                imageUrl: p.imageUrl,
                selected: true,
                isAlert: false,
                deltaPct: null,
                lineTotalText: ''
            });
        }
        for (const a of alerts) {
            if (ruptures.some(r => r.id === a.id)) continue;      // already in as rupture
            const p = byId[a.id];
            if (!p) continue;
            built.push({
                productId: p.productId,
                name: p.name,
                code: p.productCode || a.code || '',
                qty: this.defaultQuantity > 0 ? this.defaultQuantity : 6,
                unitPrice: Number(a.observedPrice) > 0 ? Number(a.observedPrice) : (Number(p.listPrice) || 0),
                pricebookEntryId: p.pricebookEntryId,
                imageUrl: p.imageUrl,
                selected: false,       // alerts default off — user ticks what they want
                isAlert: true,
                deltaPct: typeof a.deltaPct === 'number' ? a.deltaPct : null,
                lineTotalText: ''
            });
        }

        this.lines = built.map(l => ({ ...l, lineTotalText: this._lineTotalFor(l) }));
        this.skippedCount = skipped;
    }

    _readLocalStorage() {
        try {
            const key = this._storageKey;
            if (!key) return null;
            const raw = window.localStorage.getItem(key);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    // ---------------------- interactions ----------------------

    handleQtyChange(event) {
        const id = event.target.dataset.id;
        const v = Number(event.target.value);
        this.lines = this.lines.map(l => {
            if (l.productId !== id) return l;
            const next = { ...l, qty: v > 0 ? v : 0 };
            next.lineTotalText = this._lineTotalFor(next);
            return next;
        });
    }

    handlePriceChange(event) {
        const id = event.target.dataset.id;
        const v = Number(event.target.value);
        this.lines = this.lines.map(l => {
            if (l.productId !== id) return l;
            const next = { ...l, unitPrice: v >= 0 ? v : 0 };
            next.lineTotalText = this._lineTotalFor(next);
            return next;
        });
    }

    handleSelect(event) {
        const id = event.target.dataset.id;
        const checked = event.target.checked;
        this.lines = this.lines.map(l => l.productId === id ? { ...l, selected: checked } : l);
    }

    handleSelectAll() { this.lines = this.lines.map(l => ({ ...l, selected: true })); }
    handleClearAll() { this.lines = this.lines.map(l => ({ ...l, selected: false })); }
    handleRefresh() { this._loadAll(); }

    async handleConvert() {
        const sel = this.selectedLines;
        if (sel.length === 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastWarnNothing,
                variant: 'warning'
            }));
            return;
        }
        this.creating = true;
        try {
            const payload = sel.map(l => ({
                productId: l.productId,
                quantity: Number(l.qty) || 1,
                unitPrice: Number(l.unitPrice) || 0
            }));
            const res = await createRestockOrder({ visitId: this.recordId, lines: payload });
            this.lastOrderId = res.orderId;
            this.lastOrderNumber = res.orderNumber;
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastSuccessTitle,
                message: this.t.toastSuccessBody.replace('{num}', res.orderNumber).replace('{n}', res.linesCreated),
                variant: 'success'
            }));
            // Clear the lines so the SE knows the ruptures have been actioned.
            this.lines = [];
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastErrorTitle,
                message: this._extractError(e),
                variant: 'error'
            }));
        } finally {
            this.creating = false;
        }
    }

    handleOpenOrder() {
        if (!this.lastOrderId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: this.lastOrderId, objectApiName: 'Order', actionName: 'view' }
        });
    }

    // ---------------------- helpers ----------------------

    _lineTotalFor(line) {
        const total = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
        return this._formatMoney(total);
    }

    _formatMoney(n) {
        try {
            return new Intl.NumberFormat(this.localeTag || 'fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(Number(n) || 0) + ' ' + (this.currencySymbol || '€');
        } catch (e) {
            return (Number(n) || 0).toFixed(2) + ' ' + (this.currencySymbol || '€');
        }
    }

    _extractError(e) {
        if (!e) return '';
        if (typeof e === 'string') return e;
        if (e.body) {
            if (Array.isArray(e.body)) return e.body.map(b => b.message).join(' · ');
            if (e.body.message) return e.body.message;
        }
        return e.message || '';
    }
}
