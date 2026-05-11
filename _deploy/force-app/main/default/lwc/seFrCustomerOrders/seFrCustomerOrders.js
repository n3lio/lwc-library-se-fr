import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getCustomerOrders from '@salesforce/apex/SE_FR_CustomerOrdersController.getCustomerOrders';

const LABELS = {
    en: {
        cardTitle: 'Orders',
        lastOrder: 'Last order',
        orderHistory: 'Order history',
        newOrder: 'New order',
        viewAllOrders: 'View all',
        refresh: 'Refresh',
        search: 'Search',
        searchPlaceholder: 'Search by order number…',
        sortLabel: 'Sort by',
        statusLabel: 'Status',
        statusAny: 'All statuses',
        emptyLatest: 'No recent order for this customer.',
        emptyHistory: 'No previous orders.',
        emptyState: 'No order yet for this customer.',
        emptyStateCta: 'Create the first order',
        openOrder: 'Open order',
        orderNumber: 'Order number',
        orderName: 'Order name',
        totalAmount: 'Total amount',
        effectiveDate: 'Effective date',
        status: 'Status',
        estimatedDelivery: 'Estimated delivery',
        orderedProducts: 'Ordered products',
        ref: 'Ref',
        qty: 'Qty',
        perUnit: '/ unit',
        totalMatching: '{n} matching order(s)',
        sortEffectiveDateDesc: 'Date (newest first)',
        sortEffectiveDateAsc: 'Date (oldest first)',
        sortTotalAmountDesc: 'Amount (high → low)',
        sortTotalAmountAsc: 'Amount (low → high)',
        sortOrderNumberAsc: 'Order number (A → Z)',
        sortOrderNumberDesc: 'Order number (Z → A)'
    },
    fr: {
        cardTitle: 'Commandes',
        lastOrder: 'Dernière commande',
        orderHistory: 'Historique des commandes',
        newOrder: 'Nouvelle commande',
        viewAllOrders: 'Voir tout',
        refresh: 'Actualiser',
        search: 'Rechercher',
        searchPlaceholder: 'Rechercher par n° de commande…',
        sortLabel: 'Trier par',
        statusLabel: 'Statut',
        statusAny: 'Tous les statuts',
        emptyLatest: 'Aucune commande récente pour ce client.',
        emptyHistory: 'Aucune commande précédente.',
        emptyState: 'Aucune commande pour ce client.',
        emptyStateCta: 'Créer la première commande',
        openOrder: 'Ouvrir la commande',
        orderNumber: 'N° commande',
        orderName: 'Nom de la commande',
        totalAmount: 'Montant total',
        effectiveDate: 'Date de commande',
        status: 'Statut',
        estimatedDelivery: 'Livraison estimée',
        orderedProducts: 'Produits commandés',
        ref: 'Réf',
        qty: 'Qté',
        perUnit: '/ unité',
        totalMatching: '{n} commande(s)',
        sortEffectiveDateDesc: 'Date (plus récent)',
        sortEffectiveDateAsc: 'Date (plus ancien)',
        sortTotalAmountDesc: 'Montant (décroissant)',
        sortTotalAmountAsc: 'Montant (croissant)',
        sortOrderNumberAsc: 'N° commande (A → Z)',
        sortOrderNumberDesc: 'N° commande (Z → A)'
    }
};

const SORT_KEYS = [
    'EffectiveDate DESC',
    'EffectiveDate ASC',
    'TotalAmount DESC',
    'TotalAmount ASC',
    'OrderNumber ASC',
    'OrderNumber DESC'
];

function formatDate(dateVal, localeTag) {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        return d.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return ''; }
}

export default class SeFrCustomerOrders extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    // App Builder properties
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:orders';
    @api historyLimit = 10;
    @api currencyCode = 'EUR';
    @api localeTag = 'fr-FR';
    @api statusFilter = '';              // Optional CSV whitelist ('Activated,Draft' etc.)
    @api defaultSort = 'EffectiveDate DESC';
    @api productImageFieldApiName = 'Image_URL__c';
    @api productImageFallbackUrl = '';
    @api hideNewOrderButton = false;
    // Negated form so the default (`false`) complies with LWC1503.
    @api hideViewAllLink = false;
    get showViewAllLink() { return !this.hideViewAllLink; }

    @track currentSort;
    @track currentStatus = '';            // user-picked status (empty = all)
    @track searchTerm = '';

    wiredResult;
    @track rawResult;

    connectedCallback() {
        this.currentSort = SORT_KEYS.includes(this.defaultSort) ? this.defaultSort : 'EffectiveDate DESC';
    }

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    // Wire — re-fires whenever any of the reactive inputs change
    @wire(getCustomerOrders, {
        recordId: '$recordId',
        objectApiName: '$objectApiName',
        limitCount: '$historyLimit',
        statusFilter: '$effectiveStatusFilter',
        sortBy: '$currentSort',
        searchTerm: '$searchTerm',
        productImageFieldApiName: '$productImageFieldApiName'
    })
    wiredOrders(result) {
        this.wiredResult = result;
        if (result.data) this.rawResult = result.data;
    }

    // If the SE picked a status via the dropdown, use it; else fall back to the static prop whitelist.
    get effectiveStatusFilter() {
        return this.currentStatus && this.currentStatus.length ? this.currentStatus : (this.statusFilter || '');
    }

    // ---------------- Derived lists ----------------

    get hasLatest() { return this.rawResult && this.rawResult.latest; }
    get hasHistory() { return this.rawResult && this.rawResult.history && this.rawResult.history.length > 0; }
    get hasAnyOrder() { return this.hasLatest || this.hasHistory; }

    get totalCountLabel() {
        const n = (this.rawResult && this.rawResult.totalCount) || 0;
        return this.labels.totalMatching.replace('{n}', n);
    }

    get shouldShowViewAll() {
        if (!this.showViewAllLink) return false;
        const total = (this.rawResult && this.rawResult.totalCount) || 0;
        const shown = (this.hasLatest ? 1 : 0) + ((this.rawResult && this.rawResult.history) ? this.rawResult.history.length : 0);
        return total > shown;
    }

    // Latest order — hydrated view for the header card
    get latest() {
        if (!this.hasLatest) return null;
        const l = this.rawResult.latest;
        return {
            ...l,
            effectiveDateDisplay: formatDate(l.effectiveDate, this.localeTag),
            endDateDisplay: formatDate(l.endDate, this.localeTag),
            items: (l.items || []).map(item => this.shapeItem(item))
        };
    }

    shapeItem(item) {
        const p = item.Product2 || {};
        const fieldName = this.productImageFieldApiName || 'Image_URL__c';
        const rawUrl = p[fieldName];
        const imgUrl = rawUrl || this.productImageFallbackUrl || null;
        return {
            id: item.Id,
            name: p.Name || '',
            code: p.ProductCode || '',
            quantity: item.Quantity,
            unitPrice: item.UnitPrice,
            totalPrice: item.TotalPrice,
            imageUrl: imgUrl,
            hasImage: !!imgUrl
        };
    }

    get historyRows() {
        if (!this.hasHistory) return [];
        return this.rawResult.history.map(o => ({
            ...o,
            effectiveDateDisplay: formatDate(o.effectiveDate, this.localeTag)
        }));
    }

    // Sort options — translated labels, canonical key stays English
    get sortOptions() {
        const l = this.labels;
        return [
            { label: l.sortEffectiveDateDesc, value: 'EffectiveDate DESC' },
            { label: l.sortEffectiveDateAsc,  value: 'EffectiveDate ASC' },
            { label: l.sortTotalAmountDesc,   value: 'TotalAmount DESC' },
            { label: l.sortTotalAmountAsc,    value: 'TotalAmount ASC' },
            { label: l.sortOrderNumberAsc,    value: 'OrderNumber ASC' },
            { label: l.sortOrderNumberDesc,   value: 'OrderNumber DESC' }
        ];
    }

    // Status options — built from the static statusFilter prop if provided; else leave "all only".
    get statusOptions() {
        const opts = [{ label: this.labels.statusAny, value: '' }];
        if (this.statusFilter && this.statusFilter.trim().length) {
            for (const s of this.statusFilter.split(',')) {
                const v = s.trim();
                if (v) opts.push({ label: v, value: v });
            }
        }
        return opts;
    }
    get showStatusPicker() { return this.statusOptions.length > 1; }

    // ---------------- Handlers ----------------

    handleSearchChange(event) { this.searchTerm = event.target.value; }
    handleSortChange(event)   { this.currentSort = event.detail.value; }
    handleStatusChange(event) { this.currentStatus = event.detail.value; }

    handleRefresh() { if (this.wiredResult) refreshApex(this.wiredResult); }

    handleNewOrder() {
        // Navigate to the New Order page, pre-filling AccountId when we can resolve it.
        const accountId = this.objectApiName === 'Account' ? this.recordId : (this.hasLatest ? this.latest.accountId : null);
        const state = { nooverride: '1' };
        if (accountId) state.defaultFieldValues = `AccountId=${accountId}`;
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Order', actionName: 'new' },
            state
        });
    }

    navigateToOrder(event) {
        const orderId = event.currentTarget.dataset.id;
        if (!orderId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: orderId, objectApiName: 'Order', actionName: 'view' }
        });
    }

    navigateToAllOrders() {
        // If we're on an Account, use the standard related list. Otherwise fall back to the Order home.
        if (this.objectApiName === 'Account') {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordRelationshipPage',
                attributes: {
                    recordId: this.recordId,
                    objectApiName: 'Account',
                    relationshipApiName: 'Orders',
                    actionName: 'view'
                }
            });
            return;
        }
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Order', actionName: 'list' },
            state: { filterName: 'Recent' }
        });
    }
}
