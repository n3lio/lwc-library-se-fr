import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/**
 * CCO FR — Visit Quick Order (visual catalog)
 *
 * Alternative visuelle au cadencier (seFrOrderEntry) : catalogue avec vignettes, badges
 * marketing, recommandations issues des relevés terrain (produits en rupture, missing,
 * PDL basse), panier avec remise ligne + remise globale. Publie `order:done` et un
 * draft dans `sefr-order-draft::<recordId>` au submit pour que seFrVisitSummaryAI
 * reflète la commande dans le compte-rendu.
 *
 * Inspiré de dimQuickOrder (DIM / DBI) — adapté bilingue, prop-driven, palette SLDS neutre.
 * Zero DML : le submit est démo (pas de création Order Salesforce — c'est le cadencier
 * seFrOrderEntry qui garde ce rôle). Idéal en 2e option du tab Commande pour varier.
 */

const PROGRESS_KEY_PREFIX = 'sefr-visit-progress::';
const ORDER_DRAFT_KEY_PREFIX = 'sefr-order-draft::';
const PRODUCT_INSIGHTS_KEY_PREFIX = 'sefr-product-check::';
const SHELF_INSIGHTS_KEY_PREFIX = 'sefr-shelf-insights::';

const DICT = {
    fr: {
        cardTitle: 'Commande rapide',
        emptyCatalog: 'Aucun produit au catalogue.',
        validate: 'Valider la commande',
        validating: 'Transmission…',
        orderCreated: 'Commande transmise',
        orderCreatedTitle: 'Commande transmise',
        orderCreatedMsg: '{lines} lignes · {units} unités · {total}{cur} HT',
        newOrder: 'Nouvelle',
        recosTitle: 'Recommandations',
        recosToPush: 'à pousser',
        recosReason: 'Suggérés par les relevés et la part de linéaire de la visite.',
        addAllRecos: 'Tout ajouter au panier',
        catalog: 'Catalogue',
        show: 'Afficher',
        hide: 'Masquer',
        allCategories: 'Toutes catégories',
        search: 'Rechercher…',
        cart: 'Panier',
        headRef: 'Référence',
        headQty: 'Qté',
        headDisc: 'Remise %',
        emptyCart: 'Panier vide — ajoutez des produits depuis le catalogue.',
        totalLines: 'Lignes',
        totalUnits: 'Unités',
        totalAmount: 'Total HT',
        globalDisc: 'Remise globale',
        add: 'Ajouter',
        added: 'Ajouté',
        remove: 'Retirer',
        stockOk: 'En stock',
        stockLow: 'Stock faible',
        stockOut: 'Rupture',
        badgePush: 'Push marketing',
        badgePromo: 'Promo',
        badgeNew: 'Nouveauté',
        badgeStar: 'Best-seller',
        suggestionShelf: 'PDL marque sous 30%',
        suggestionRupture: 'Rupture signalée',
        suggestionMissing: 'Produit manquant',
        suggestedQty: '{n} unités suggérées'
    },
    en: {
        cardTitle: 'Quick order',
        emptyCatalog: 'No products in the catalog.',
        validate: 'Submit order',
        validating: 'Submitting…',
        orderCreated: 'Order submitted',
        orderCreatedTitle: 'Order submitted',
        orderCreatedMsg: '{lines} lines · {units} units · {total}{cur} ex. VAT',
        newOrder: 'New',
        recosTitle: 'Recommendations',
        recosToPush: 'to push',
        recosReason: 'Suggested by the shelf audit and in-store product check.',
        addAllRecos: 'Add all to cart',
        catalog: 'Catalog',
        show: 'Show',
        hide: 'Hide',
        allCategories: 'All categories',
        search: 'Search…',
        cart: 'Cart',
        headRef: 'Reference',
        headQty: 'Qty',
        headDisc: 'Discount %',
        emptyCart: 'Cart empty — add products from the catalog.',
        totalLines: 'Lines',
        totalUnits: 'Units',
        totalAmount: 'Total',
        globalDisc: 'Global discount',
        add: 'Add',
        added: 'Added',
        remove: 'Remove',
        stockOk: 'In stock',
        stockLow: 'Low stock',
        stockOut: 'Out of stock',
        badgePush: 'Push marketing',
        badgePromo: 'Promo',
        badgeNew: 'New',
        badgeStar: 'Best-seller',
        suggestionShelf: 'Brand share below 30%',
        suggestionRupture: 'Flagged out-of-stock',
        suggestionMissing: 'Missing product',
        suggestedQty: '{n} suggested units'
    }
};

// Default CPG catalog — generic grocery. Images = inline SVG tiles (data: URI).
// Zero CSP required; users can override with seedProductsJson or Product2 Files.
const PALETTE = [
    { bg: '#003da5', ink: '#ffffff' },
    { bg: '#2e844a', ink: '#ffffff' },
    { bg: '#8a3fde', ink: '#ffffff' },
    { bg: '#c23934', ink: '#ffffff' },
    { bg: '#f2b600', ink: '#16325c' },
    { bg: '#36a3a3', ink: '#ffffff' },
    { bg: '#b8541f', ink: '#ffffff' },
    { bg: '#4a4a4a', ink: '#ffffff' }
];
function _tile(name, code) {
    const parts = (name || 'P').split(' ');
    let initials = '';
    for (let i = 0; i < parts.length && initials.length < 2; i++) {
        if (parts[i].length) initials += parts[i].charAt(0).toUpperCase();
    }
    if (!initials) initials = 'P';
    let h = 0;
    const seed = code || name || '';
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    const c = PALETTE[h % PALETTE.length];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">`
        + `<rect width="240" height="240" fill="${c.bg}"/>`
        + `<text x="120" y="130" font-family="Inter, Helvetica, Arial, sans-serif" font-size="92" font-weight="700" fill="${c.ink}" text-anchor="middle" dominant-baseline="central">${initials}</text>`
        + (code ? `<text x="120" y="210" font-family="Inter, Helvetica, Arial, sans-serif" font-size="18" fill="${c.ink}" fill-opacity="0.8" text-anchor="middle">${code}</text>` : '')
        + `</svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
const DEFAULT_CATALOG = [
    { id: 'p01', code: 'CPG-COLA-33',       name: 'Cola Classic 33cl',       family: 'Boissons gazeuses', price: 1.20, stock: 'ok',  badge: 'star' },
    { id: 'p02', code: 'CPG-COLA-ZERO',     name: 'Cola Zero 33cl',          family: 'Boissons gazeuses', price: 1.20, stock: 'low', badge: 'promo' },
    { id: 'p03', code: 'CPG-EAU-50',        name: 'Eau minérale 50cl',       family: 'Eaux',              price: 0.60, stock: 'ok' },
    { id: 'p04', code: 'CPG-EAU-1L',        name: 'Eau minérale 1L',         family: 'Eaux',              price: 0.95, stock: 'ok' },
    { id: 'p05', code: 'CPG-JUS-OR',        name: 'Pur jus orange 1L',       family: 'Jus',               price: 2.40, stock: 'ok',  badge: 'new' },
    { id: 'p06', code: 'CPG-CHIPS-200',     name: 'Chips nature 200g',       family: 'Snacks salés',      price: 2.10, stock: 'ok',  badge: 'push' },
    { id: 'p07', code: 'CPG-CHIPS-BBQ',     name: 'Chips BBQ 150g',          family: 'Snacks salés',      price: 1.90, stock: 'ok' },
    { id: 'p08', code: 'CPG-BISCUIT-CHOCO', name: 'Biscuits choco 300g',     family: 'Snacks sucrés',     price: 3.20, stock: 'ok',  badge: 'promo' },
    { id: 'p09', code: 'CPG-CHOCO-100',     name: 'Tablette chocolat 100g',  family: 'Snacks sucrés',     price: 2.80, stock: 'ok' },
    { id: 'p10', code: 'CPG-YAOURT-4',      name: 'Yaourt nature x4',        family: 'Produits laitiers', price: 1.80, stock: 'ok',  badge: 'star' },
    { id: 'p11', code: 'CPG-LAIT-1L',       name: 'Lait demi-écrémé 1L',     family: 'Produits laitiers', price: 1.10, stock: 'ok' },
    { id: 'p12', code: 'CPG-CAFE-250',      name: 'Café moulu 250g',         family: 'Épicerie',          price: 4.50, stock: 'ok' },
    { id: 'p13', code: 'CPG-PATE-500',      name: 'Pâtes 500g',              family: 'Épicerie',          price: 1.40, stock: 'low' },
    { id: 'p14', code: 'CPG-SAUCE-ML',      name: 'Sauce tomate 400g',       family: 'Épicerie',          price: 1.70, stock: 'ok' },
    { id: 'p15', code: 'CPG-BIERE-33',      name: 'Bière 33cl x6',           family: 'Bières',            price: 5.90, stock: 'ok',  badge: 'push' }
].map(p => ({ ...p, imageUrl: _tile(p.name, p.code) }));

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
    + '<rect width="64" height="64" fill="#f6f6f6"/>'
    + '<rect x="10" y="14" width="44" height="36" rx="4" fill="none" stroke="#cfcfcf" stroke-width="2"/>'
    + '<circle cx="22" cy="26" r="4" fill="#cfcfcf"/>'
    + '<path d="M14 44 L26 32 L36 40 L48 28 L52 36 L52 48 L14 48 Z" fill="#cfcfcf"/>'
    + '</svg>'
);

const POLL_MS = 2000;

export default class SeFrVisitQuickOrder extends LightningElement {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:order_item';
    @api brandName = 'Ma marque';
    @api currencySymbol = '€';
    @api seedProductsJson;

    @track orderLines = [];
    @track isExpanded = true;
    @track recosOpen = true;
    @track showConfirmation = false;
    @track isSubmitting = false;
    @track productInsights = null;
    @track shelfInsights = null;
    @track globalDiscount = 0;

    selectedFamily = '';
    searchTerm = '';
    _catalog = [];
    _pollHandle;
    _submittedCounter = 0;

    connectedCallback() {
        this._initCatalog();
        this._loadInsights();
        this._pollHandle = setInterval(() => this._loadInsights(), POLL_MS);
    }

    disconnectedCallback() {
        if (this._pollHandle) clearInterval(this._pollHandle);
    }

    _initCatalog() {
        let catalog = DEFAULT_CATALOG;
        if (this.seedProductsJson) {
            try {
                const parsed = JSON.parse(this.seedProductsJson);
                if (Array.isArray(parsed) && parsed.length) catalog = parsed;
            } catch (e) { /* fallback */ }
        }
        this._catalog = catalog.map(p => ({
            ...p,
            imageUrl: p.imageUrl || PLACEHOLDER_IMG
        }));
    }

    _loadInsights() {
        if (!this.recordId) return;
        try {
            const p = window.localStorage.getItem(PRODUCT_INSIGHTS_KEY_PREFIX + this.recordId);
            this.productInsights = p ? JSON.parse(p) : null;
            const s = window.localStorage.getItem(SHELF_INSIGHTS_KEY_PREFIX + this.recordId);
            this.shelfInsights = s ? JSON.parse(s) : null;
        } catch (e) { /* ignore */ }
    }

    // ------------------------------------------------------------------
    //  Getters
    // ------------------------------------------------------------------
    get t() { return DICT[this.language === 'en' ? 'en' : 'fr']; }
    get effectiveTitle() { return (this.cardTitle && this.cardTitle.trim()) ? this.cardTitle : this.t.cardTitle; }
    get effectiveIcon() { return (this.cardIcon && this.cardIcon.trim()) ? this.cardIcon : 'standard:order_item'; }

    get families() {
        const fams = [...new Set(this._catalog.map(p => p.family).filter(Boolean))];
        return [{ label: this.t.allCategories, value: '' }].concat(fams.map(f => ({ label: f, value: f })));
    }

    get filteredProducts() {
        const term = (this.searchTerm || '').trim().toLowerCase();
        const inCartIds = new Set(this.orderLines.map(l => l.productId));
        return this._catalog
            .filter(p => !this.selectedFamily || p.family === this.selectedFamily)
            .filter(p => !term || p.name.toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term))
            .map(p => ({
                ...p,
                inCart: inCartIds.has(p.id),
                price: this._fmt(p.price),
                stockClass: this._stockClass(p.stock),
                stock: this._stockLabel(p.stock),
                hasBadge: !!p.badge,
                badgeLabel: this._badgeLabel(p.badge),
                badgeClass: this._badgeClass(p.badge)
            }));
    }

    get recommendations() {
        const items = [];
        const inCartIds = new Set(this.orderLines.map(l => l.productId));
        // From productCheck ruptures: push 24 units of each
        const ruptures = this.productInsights?.ruptures || [];
        ruptures.forEach(r => {
            const match = this._matchProduct(r);
            if (match) items.push({
                productId: match.id,
                name: match.name,
                imageUrl: match.imageUrl,
                suggestedQty: 24,
                tag: this.t.suggestionRupture,
                tagClass: 'sefrqo-reco__tag sefrqo-reco__tag--rupture',
                inCart: inCartIds.has(match.id)
            });
        });
        // From productCheck missing: push 12 units
        const missing = this.productInsights?.missing || [];
        missing.forEach(m => {
            const match = this._matchProduct(m);
            if (match && !items.find(i => i.productId === match.id)) items.push({
                productId: match.id,
                name: match.name,
                imageUrl: match.imageUrl,
                suggestedQty: 12,
                tag: this.t.suggestionMissing,
                tagClass: 'sefrqo-reco__tag sefrqo-reco__tag--missing',
                inCart: inCartIds.has(match.id)
            });
        });
        // From shelfInsights lowPdl: push 18 units of top-badge product per segment
        const lowPdl = this.shelfInsights?.lowPdl || [];
        lowPdl.forEach(seg => {
            // pick a product matching segment family (fuzzy)
            const match = this._catalog.find(p =>
                !items.find(i => i.productId === p.id) &&
                p.family && seg.segment &&
                (p.family.toLowerCase().includes((seg.segment + '').toLowerCase()) ||
                 (seg.category + '').toLowerCase().includes(p.family.toLowerCase()))
            );
            if (match) items.push({
                productId: match.id,
                name: match.name,
                imageUrl: match.imageUrl,
                suggestedQty: 18,
                tag: this.t.suggestionShelf,
                tagClass: 'sefrqo-reco__tag sefrqo-reco__tag--shelf',
                inCart: inCartIds.has(match.id)
            });
        });
        return items.slice(0, 6).map(i => ({ ...i, suggestedQtyLabel: this.t.suggestedQty.replace('{n}', i.suggestedQty) }));
    }

    get hasRecommendations() { return this.recommendations.length > 0; }
    get recommendationCount() { return this.recommendations.length; }
    get recosToggleIcon() { return this.recosOpen ? 'utility:chevronup' : 'utility:chevrondown'; }
    get canApplyAllRecommendations() { return this.recommendations.some(r => !r.inCart); }

    get orderLinesDisplay() {
        return this.orderLines.map(l => {
            const prod = this._catalog.find(p => p.id === l.productId) || {};
            return {
                ...l,
                name: prod.name || l.productId,
                code: prod.code,
                imageUrl: prod.imageUrl || PLACEHOLDER_IMG,
                unitPrice: prod.price,
                unitPriceLabel: this._fmt(prod.price),
                lineTotal: this._fmt(this._computeLineTotal(l, prod.price))
            };
        });
    }

    get hasOrderLines() { return this.orderLines.length > 0; }
    get totalLines() { return this.orderLines.length; }
    get totalUnits() { return this.orderLines.reduce((s, l) => s + (parseFloat(l.quantity) || 0), 0); }

    get subTotal() {
        return this.orderLines.reduce((s, l) => {
            const prod = this._catalog.find(p => p.id === l.productId);
            if (!prod) return s;
            return s + this._computeLineTotal(l, prod.price);
        }, 0);
    }
    get globalDiscountAmount() {
        return this._fmt((this.subTotal * (parseFloat(this.globalDiscount) || 0)) / 100);
    }
    get hasGlobalDiscount() { return (parseFloat(this.globalDiscount) || 0) > 0; }
    get totalAmount() {
        const gross = this.subTotal;
        const net = gross * (1 - (parseFloat(this.globalDiscount) || 0) / 100);
        return this._fmt(net);
    }

    get showOrderForm() { return !this.showConfirmation && !this.isSubmitting; }
    get submitDisabled() { return !this.hasOrderLines || this.isSubmitting; }
    get expandIcon() { return this.isExpanded ? 'utility:chevronup' : 'utility:chevrondown'; }
    get expandLabel() { return this.isExpanded ? this.t.hide : this.t.show; }

    _computeLineTotal(line, unitPrice) {
        const qty = parseFloat(line.quantity) || 0;
        const disc = parseFloat(line.discountPct) || 0;
        const p = parseFloat(unitPrice) || 0;
        return qty * p * (1 - disc / 100);
    }

    _fmt(v) {
        if (v == null || isNaN(v)) return '0.00';
        return (Math.round(v * 100) / 100).toFixed(2);
    }

    _stockLabel(s) {
        if (s === 'low') return this.t.stockLow;
        if (s === 'out') return this.t.stockOut;
        return this.t.stockOk;
    }
    _stockClass(s) {
        if (s === 'low') return 'sefrqo-stock sefrqo-stock--low';
        if (s === 'out') return 'sefrqo-stock sefrqo-stock--out';
        return 'sefrqo-stock sefrqo-stock--ok';
    }
    _badgeLabel(b) {
        if (b === 'promo') return this.t.badgePromo;
        if (b === 'push') return this.t.badgePush;
        if (b === 'new') return this.t.badgeNew;
        if (b === 'star') return this.t.badgeStar;
        return '';
    }
    _badgeClass(b) {
        if (!b) return '';
        return 'sefrqo-badge sefrqo-badge--' + b;
    }

    _matchProduct(hint) {
        if (!hint) return null;
        if (typeof hint === 'string') {
            const term = hint.toLowerCase();
            return this._catalog.find(p => p.name.toLowerCase().includes(term) || (p.code || '').toLowerCase().includes(term));
        }
        if (hint.productId) return this._catalog.find(p => p.id === hint.productId);
        if (hint.code) return this._catalog.find(p => (p.code || '').toLowerCase() === hint.code.toLowerCase());
        if (hint.name) {
            const term = hint.name.toLowerCase();
            return this._catalog.find(p => p.name.toLowerCase().includes(term));
        }
        return null;
    }

    // ------------------------------------------------------------------
    //  Handlers
    // ------------------------------------------------------------------
    handleToggleExpand() { this.isExpanded = !this.isExpanded; }
    handleToggleRecos() { this.recosOpen = !this.recosOpen; }
    handleFamilyChange(event) { this.selectedFamily = event.detail.value; }
    handleSearch(event) { this.searchTerm = event.detail.value || ''; }
    handleGlobalDiscountChange(event) {
        const v = parseFloat(event.detail.value);
        this.globalDiscount = isNaN(v) ? 0 : Math.max(0, Math.min(100, v));
    }

    handleAddProduct(event) {
        const pid = event.currentTarget.dataset.id;
        this._addLine(pid, 12);
    }

    handleAddRecommendation(event) {
        const pid = event.currentTarget.dataset.id;
        const qty = parseInt(event.currentTarget.dataset.qty, 10) || 12;
        this._addLine(pid, qty);
    }

    handleAddAllRecommendations() {
        this.recommendations.forEach(r => {
            if (!r.inCart) this._addLine(r.productId, r.suggestedQty);
        });
    }

    _addLine(productId, qty) {
        if (!productId) return;
        if (this.orderLines.some(l => l.productId === productId)) return;
        this.orderLines = [...this.orderLines, {
            id: 'line_' + Date.now() + '_' + productId,
            productId,
            quantity: qty,
            discountPct: 0
        }];
    }

    handleQuantityChange(event) {
        const id = event.currentTarget.dataset.lineid;
        const q = parseInt(event.detail.value, 10) || 1;
        this.orderLines = this.orderLines.map(l => l.id === id ? { ...l, quantity: q } : l);
    }

    handleLineDiscountChange(event) {
        const id = event.currentTarget.dataset.lineid;
        const d = parseFloat(event.detail.value) || 0;
        this.orderLines = this.orderLines.map(l => l.id === id ? { ...l, discountPct: Math.max(0, Math.min(100, d)) } : l);
    }

    handleRemoveLine(event) {
        const id = event.currentTarget.dataset.lineid;
        this.orderLines = this.orderLines.filter(l => l.id !== id);
    }

    handleSubmitOrder() {
        if (!this.hasOrderLines) return;
        this.isSubmitting = true;
        // Simulated transmission latency (demo UX)
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this._submittedCounter += 1;
            this._publishDraft();
            this._publishProgress();
            this.showConfirmation = true;
            this.isSubmitting = false;
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.orderCreatedTitle,
                message: this.t.orderCreatedMsg
                    .replace('{lines}', String(this.totalLines))
                    .replace('{units}', String(this.totalUnits))
                    .replace('{total}', this.totalAmount)
                    .replace('{cur}', this.currencySymbol),
                variant: 'success'
            }));
        }, 900);
    }

    handleNewOrder() {
        this.orderLines = [];
        this.globalDiscount = 0;
        this.showConfirmation = false;
    }

    _publishDraft() {
        if (!this.recordId) return;
        try {
            const lines = this.orderLines.map(l => {
                const prod = this._catalog.find(p => p.id === l.productId) || {};
                return {
                    productId: l.productId,
                    code: prod.code,
                    name: prod.name,
                    quantity: l.quantity,
                    discountPct: l.discountPct,
                    unitPrice: prod.price,
                    lineTotal: this._computeLineTotal(l, prod.price)
                };
            });
            const payload = {
                at: new Date().toISOString(),
                lines,
                totalLines: this.totalLines,
                totalUnits: this.totalUnits,
                totalAmount: this.totalAmount,
                globalDiscountPct: this.globalDiscount,
                source: 'seFrVisitQuickOrder'
            };
            window.localStorage.setItem(ORDER_DRAFT_KEY_PREFIX + this.recordId, JSON.stringify(payload));
        } catch (e) { /* ignore */ }
    }

    _publishProgress() {
        if (!this.recordId) return;
        try {
            const key = PROGRESS_KEY_PREFIX + this.recordId;
            const raw = window.localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            obj.order = { done: true, at: new Date().toISOString() };
            window.localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) { /* ignore */ }
    }
}
