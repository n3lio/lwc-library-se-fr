import { LightningElement, api, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import ACCOUNT_NAME_FIELD from '@salesforce/schema/Account.Name';
import CASE_ACCOUNT_ID_FIELD from '@salesforce/schema/Case.AccountId';
import getProductsList from '@salesforce/apex/SE_FR_OrderEntryController.getProductsListFull';
import createOrderFromGrid from '@salesforce/apex/SE_FR_OrderEntryController.createOrderFromGridWithChannel';

const LABELS = {
    en: {
        cardTitle: 'Order Entry',
        fullScreenTitleTemplate: 'Order entry for {account}',
        noAccountMessage: 'Link an account to this case before starting an order.',
        erpCheckbox: 'Send directly to ERP',
        fullScreen: 'Full screen',
        reorder: 'Reorder', prefillAI: 'Pre-fill with AI', clearGrid: 'Clear grid',
        hideDiscount: 'Hide discount columns', showDiscount: 'Show discount columns',
        filter: 'Filter', search: 'Search', searchPlaceholder: 'Search by name or code…',
        statusFilters: 'Status filters',
        filterRecent: 'Ordered (≤ 3 months)', filterOld: 'Ordered (> 3 months)',
        filterPromo: 'Promotion', filterClearance: 'Clearance', filterOOS: 'Out of stock',
        colCategory: 'Category', colCode: 'Code', colProduct: 'Product', colLastOrder: 'Last order',
        colStock: 'Stock', colListPrice: 'List price', colRecQty: 'Rec. qty', colQty: 'Qty',
        colRecDiscount: 'Rec. discount', colDiscount: 'Discount (%)', colNetPrice: 'Net price',
        colLineTotal: 'Line total',
        titleCategory: 'Category', titleCode: 'Product code', titleProduct: 'Product name',
        titleLastOrder: 'Last order', titleStock: 'Available stock', titleListPrice: 'Unit list price',
        titleRecQty: 'Recommended quantity', titleQty: 'Enter quantity',
        titleRecDiscount: 'Recommended discount', titleDiscount: 'Enter discount',
        titleNetPrice: 'Net price', titleLineTotal: 'Line total',
        apply: 'Apply',
        orderTotal: 'Order total',
        requestedDelivery: 'Requested delivery date',
        saveOrder: 'Save order',
        category: 'Category', code: 'Code', price: 'Price', stock: 'Stock',
        sharePresentation: 'Share presentation', emailPresentation: 'Email product presentation',
        einsteinAnalysis: 'Einstein analysis',
        orderConfirmation: 'Order confirmation',
        saveFor: 'Save this order for {account} — total {total}?',
        deliveryDateBanner: 'Requested delivery date: ',
        recapProduct: 'Product', recapQty: 'Quantity', recapTotal: 'Total',
        cancel: 'Cancel', confirm: 'Confirm',
        toastSent: 'Sent', toastSentMsg: 'Product presentation sent.',
        toastSuccess: 'Success', toastSuccessMsg: 'Order created.',
        toastError: 'Error', toastErrorMsg: 'Error while creating the order.'
    },
    fr: {
        cardTitle: 'Prise de commande',
        fullScreenTitleTemplate: 'Prise de commande pour {account}',
        noAccountMessage: 'Liez un compte à ce cas avant de démarrer une commande.',
        erpCheckbox: "Envoyer directement à l'ERP",
        fullScreen: 'Plein écran',
        reorder: 'Réassort', prefillAI: "Pré-remplir avec l'IA", clearGrid: 'Vider la grille',
        hideDiscount: 'Masquer les colonnes remise', showDiscount: 'Afficher les colonnes remise',
        filter: 'Filtrer', search: 'Rechercher', searchPlaceholder: 'Rechercher par nom ou code…',
        statusFilters: 'Filtres par statut',
        filterRecent: 'Commandé (≤ 3 mois)', filterOld: 'Commandé (> 3 mois)',
        filterPromo: 'Promotion', filterClearance: 'Déstockage', filterOOS: 'Rupture de stock',
        colCategory: 'Catégorie', colCode: 'Code', colProduct: 'Produit', colLastOrder: 'Dernière commande',
        colStock: 'Stock', colListPrice: 'Prix catalogue', colRecQty: 'Qté rec.', colQty: 'Qté',
        colRecDiscount: 'Remise rec.', colDiscount: 'Remise (%)', colNetPrice: 'Prix net',
        colLineTotal: 'Total ligne',
        titleCategory: 'Catégorie', titleCode: 'Code produit', titleProduct: 'Nom du produit',
        titleLastOrder: 'Dernière commande', titleStock: 'Stock disponible', titleListPrice: 'Prix catalogue unitaire',
        titleRecQty: 'Quantité recommandée', titleQty: 'Saisir la quantité',
        titleRecDiscount: 'Remise recommandée', titleDiscount: 'Saisir la remise',
        titleNetPrice: 'Prix net', titleLineTotal: 'Total ligne',
        apply: 'Appliquer',
        orderTotal: 'Total commande',
        requestedDelivery: 'Date de livraison souhaitée',
        saveOrder: 'Enregistrer la commande',
        category: 'Catégorie', code: 'Code', price: 'Prix', stock: 'Stock',
        sharePresentation: 'Partager la présentation', emailPresentation: 'Envoyer la fiche produit par e-mail',
        einsteinAnalysis: 'Analyse Einstein',
        orderConfirmation: 'Confirmation de commande',
        saveFor: 'Enregistrer cette commande pour {account} — total {total} ?',
        deliveryDateBanner: 'Date de livraison souhaitée : ',
        recapProduct: 'Produit', recapQty: 'Quantité', recapTotal: 'Total',
        cancel: 'Annuler', confirm: 'Confirmer',
        toastSent: 'Envoyé', toastSentMsg: 'Fiche produit envoyée.',
        toastSuccess: 'Succès', toastSuccessMsg: 'Commande créée.',
        toastError: 'Erreur', toastErrorMsg: 'Erreur lors de la création de la commande.'
    }
};

export default class SeFrOrderEntry extends NavigationMixin(LightningElement) {
    _recordId;
    _objectApiName;

    @api
    set recordId(value) { this._recordId = value; this.resolveTargetAccount(); }
    get recordId() { return this._recordId; }

    @api
    set objectApiName(value) { this._objectApiName = value; this.resolveTargetAccount(); }
    get objectApiName() { return this._objectApiName; }

    @track targetAccountId = null;

    resolveTargetAccount() {
        if (this._objectApiName === 'Account' && this._recordId) {
            this.targetAccountId = this._recordId;
        }
    }

    get caseRecordId() { return this._objectApiName === 'Case' ? this._recordId : null; }

    @wire(getRecord, { recordId: '$caseRecordId', fields: [CASE_ACCOUNT_ID_FIELD] })
    wiredCase({ error, data }) {
        if (data) {
            this.targetAccountId = getFieldValue(data, CASE_ACCOUNT_ID_FIELD);
        } else if (error) {
            console.error('Error loading Case', error);
        }
    }

    @api language = 'fr';

    // App Builder properties
    @api cardTitle;
    @api cardIcon = 'standard:orders';
    @api recordLimit = 25;
    @api filter1 = ''; @api filter2 = ''; @api filter3 = ''; @api filter4 = ''; @api filter5 = '';
    @api currencyCode = 'EUR';
    @api currencySymbol = '€';
    @api localeTag = 'fr-FR';
    @api fullScreenTitleTemplate;
    @api noAccountMessage;
    @api erpCheckboxLabel;
    @api salesChannelId;
    @api productImageFieldApiName = 'Image_URL__c';
    @api productImageFallbackUrl = '';
    // Optional override for the AI recommendation tooltips. Format: '<rowStatus>|<message>'
    // comma-separated. Example: 'promo|Lancez ce produit ce mois-ci.,clearance|Stock à écouler.'
    // Accepted rowStatus values: recent | old | promo | clearance | oos. Leave empty to use the
    // bilingual built-in pool.
    @api aiReasonsCsv = '';

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedFullScreenTemplate() { return this.fullScreenTitleTemplate || this.labels.fullScreenTitleTemplate; }
    get resolvedNoAccountMessage() { return this.noAccountMessage || this.labels.noAccountMessage; }
    get resolvedErpLabel() { return this.erpCheckboxLabel || this.labels.erpCheckbox; }
    get saveForTemplate() {
        return this.labels.saveFor
            .replace('{account}', this.accountName)
            .replace('{total}', `${this.orderTotal} ${this.currencySymbol}`);
    }

    @track allProducts = [];
    @track gridData = [];

    isFullScreen = false;
    searchTerm = '';
    showLegend = false;
    showDiscountColumns = true;
    showSaveModal = false;
    deliveryDate = null;

    isImagePopoverOpen = false;
    @track hoveredProduct = null;
    popoverStyle = '';
    hoverTimer;

    isAIPopoverOpen = false;
    hoveredAIReason = '';
    aiPopoverStyle = '';

    @track activeFilters = ['recent', 'old', 'oos', 'promo', 'clearance'];

    get isFilterRecent() { return this.activeFilters.includes('recent'); }
    get isFilterOld() { return this.activeFilters.includes('old'); }
    get isFilterPromo() { return this.activeFilters.includes('promo'); }
    get isFilterClearance() { return this.activeFilters.includes('clearance'); }
    get isFilterOOS() { return this.activeFilters.includes('oos'); }

    @wire(getRecord, { recordId: '$targetAccountId', fields: [ACCOUNT_NAME_FIELD] })
    accountRecord;

    get accountName() {
        return (this.accountRecord && this.accountRecord.data && getFieldValue(this.accountRecord.data, ACCOUNT_NAME_FIELD)) || '';
    }
    get displayTitle() {
        if (this.isFullScreen && this.accountName) {
            return (this.resolvedFullScreenTemplate || '').replace('{account}', this.accountName);
        }
        return this.resolvedCardTitle;
    }
    get toggleDiscountIcon() { return this.showDiscountColumns ? 'utility:hide' : 'utility:preview'; }
    get toggleDiscountTitle() { return this.showDiscountColumns ? this.labels.hideDiscount : this.labels.showDiscount; }
    get recapItems() { return this.allProducts.filter(row => row.qty > 0 && !row.hasError); }

    @wire(getProductsList, {
        accountId: '$targetAccountId', limitSize: '$recordLimit',
        filter1: '$filter1', filter2: '$filter2', filter3: '$filter3', filter4: '$filter4', filter5: '$filter5',
        productImageFieldApiName: '$productImageFieldApiName', productImageFallbackUrl: '$productImageFallbackUrl',
        aiReasonsCsv: '$aiReasonsCsv', language: '$language'
    })
    wiredProducts({ error, data }) {
        if (data) {
            this.allProducts = data.map(item => {
                let finalImageUrl = item.imageUrl;
                if (finalImageUrl) {
                    if (finalImageUrl.includes('/resource/')) {
                        finalImageUrl = finalImageUrl.substring(finalImageUrl.indexOf('/resource/')).split('?')[0];
                    } else if (!finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('/')) {
                        finalImageUrl = '/resource/' + finalImageUrl;
                    }
                }
                return this.validateRow({
                    ...item,
                    imageUrl: finalImageUrl,
                    qty: null, discount: null,
                    netPrice: item.unitPrice.toFixed(2),
                    lineTotal: '0.00',
                    cssClass: this.getRowColorClass(item.rowStatus),
                    isOOS: item.rowStatus === 'oos',
                    formattedDate: item.lastOrderDate ? item.lastOrderDate : '-',
                    displayRecommendedQty: item.recommendedQty > 0 ? item.recommendedQty : '-',
                    displayRecommendedDiscount: item.recommendedDiscount > 0 ? `${item.recommendedDiscount}%` : '-',
                    productUrl: `/lightning/r/Product2/${item.productId}/view`,
                    hasRecommendedQty: item.recommendedQty > 0,
                    hasRecommendedDiscount: item.recommendedDiscount > 0,
                    hasLastOrder: item.lastOrderQty > 0,
                    aiReason: item.aiReason
                });
            });
            this.filterData();
        } else if (error) {
            console.error('Error loading products:', error);
        }
    }

    validateRow(row) {
        const qVal = parseFloat(row.qty);
        const dVal = parseFloat(row.discount);
        const isQtyError = qVal !== null && !isNaN(qVal) && (qVal < 0 || qVal > row.stock);
        const isDiscError = dVal !== null && !isNaN(dVal) && (dVal < 0 || dVal > row.maxDiscount);
        row.qtyClass = isQtyError ? 'small-input input-error' : 'small-input';
        row.discountClass = isDiscError ? 'small-input input-error' : 'small-input';
        row.hasError = isQtyError || isDiscError;
        return row;
    }

    handleReorder() {
        this.allProducts = this.allProducts.map(row => {
            const updatedRow = { ...row };
            if (updatedRow.hasLastOrder) {
                updatedRow.qty = updatedRow.lastOrderQty;
                updatedRow.discount = updatedRow.lastOrderDiscount;
                const net = updatedRow.unitPrice * (1 - (updatedRow.discount / 100));
                updatedRow.netPrice = net.toFixed(2);
                updatedRow.lineTotal = (net * updatedRow.qty).toFixed(2);
            }
            return this.validateRow(updatedRow);
        });
        this.filterData();
    }

    handleFillAllAI() {
        this.allProducts = this.allProducts.map(row => {
            const updatedRow = { ...row };
            let changed = false;
            if (updatedRow.hasRecommendedQty) { updatedRow.qty = updatedRow.recommendedQty; changed = true; }
            if (updatedRow.hasRecommendedDiscount) { updatedRow.discount = updatedRow.recommendedDiscount; changed = true; }
            if (changed) {
                const qtyVal = parseFloat(updatedRow.qty) || 0;
                const discountVal = parseFloat(updatedRow.discount) || 0;
                const net = updatedRow.unitPrice * (1 - (discountVal / 100));
                updatedRow.netPrice = net.toFixed(2);
                updatedRow.lineTotal = (net * qtyVal).toFixed(2);
            }
            return this.validateRow(updatedRow);
        });
        this.filterData();
    }

    handleClearAll() {
        this.allProducts = this.allProducts.map(row => this.validateRow({
            ...row, qty: null, discount: null, netPrice: row.unitPrice.toFixed(2), lineTotal: '0.00'
        }));
        this.filterData();
    }

    toggleLegend() { this.showLegend = !this.showLegend; }
    toggleDiscountColumns() { this.showDiscountColumns = !this.showDiscountColumns; }

    handleFilterToggle(event) {
        const status = event.currentTarget.dataset.status;
        if (this.activeFilters.includes(status)) {
            this.activeFilters = this.activeFilters.filter(f => f !== status);
        } else {
            this.activeFilters = [...this.activeFilters, status];
        }
        this.filterData();
    }

    handleSearch(event) {
        this.searchTerm = event.target.value.toLowerCase();
        this.filterData();
    }
    handleDeliveryDateChange(event) { this.deliveryDate = event.target.value; }

    filterData() {
        this.gridData = this.allProducts.filter(row => {
            const matchesSearch = !this.searchTerm
                || (row.name && row.name.toLowerCase().includes(this.searchTerm))
                || (row.productCode && row.productCode.toLowerCase().includes(this.searchTerm));
            const matchesFilter = this.activeFilters.includes(row.rowStatus);
            return matchesSearch && matchesFilter;
        });
    }

    getRowColorClass(status) {
        switch (status) {
            case 'recent': return 'row-white';
            case 'old': return 'row-blue';
            case 'oos': return 'row-gray';
            case 'promo': return 'row-orange';
            case 'clearance': return 'row-red';
            default: return 'row-white';
        }
    }

    handleFakeEmail() {
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.toastSent, message: this.labels.toastSentMsg, variant: 'success'
        }));
    }

    handleMouseEnterProduct(event) {
        const productId = event.target.dataset.id;
        const mouseX = event.clientX;
        const mouseY = event.clientY;
        const product = this.allProducts.find(p => p.productId === productId);
        if (product) {
            this.hoverTimer = setTimeout(() => {
                this.hoveredProduct = product;
                this.popoverStyle = `top: ${mouseY + 15}px; left: ${mouseX + 15}px;`;
                this.isImagePopoverOpen = true;
            }, 500);
        }
    }
    handleMouseLeaveProduct() { clearTimeout(this.hoverTimer); this.isImagePopoverOpen = false; }

    handleMouseEnterAI(event) {
        const reason = event.target.dataset.reason;
        if (reason) {
            const rect = event.target.getBoundingClientRect();
            this.hoveredAIReason = reason;
            this.aiPopoverStyle = `top: ${rect.top + (rect.height / 2)}px; left: ${rect.left - 290}px;`;
            this.isAIPopoverOpen = true;
        }
    }
    handleMouseLeaveAI() { this.isAIPopoverOpen = false; }

    handleInputChange(event) {
        const productId = event.target.dataset.id;
        const field = event.target.dataset.field;
        this.allProducts = this.allProducts.map(row => {
            if (row.productId === productId) {
                const updatedRow = { ...row };
                if (field === 'qty') updatedRow.qty = event.target.value;
                if (field === 'discount') updatedRow.discount = event.target.value;
                const qtyVal = parseFloat(updatedRow.qty) || 0;
                const discountVal = parseFloat(updatedRow.discount) || 0;
                const net = updatedRow.unitPrice * (1 - (discountVal / 100));
                updatedRow.netPrice = net.toFixed(2);
                updatedRow.lineTotal = (net * qtyVal).toFixed(2);
                return this.validateRow(updatedRow);
            }
            return row;
        });
        this.filterData();
    }

    handleApplyRecommendedQty(event) { this.applyRecommendedValue(event.target.dataset.id, 'qty'); }
    handleApplyRecommendedDiscount(event) { this.applyRecommendedValue(event.target.dataset.id, 'discount'); }

    applyRecommendedValue(productId, field) {
        this.allProducts = this.allProducts.map(row => {
            if (row.productId === productId) {
                const updatedRow = { ...row };
                if (field === 'qty') updatedRow.qty = updatedRow.recommendedQty;
                if (field === 'discount') updatedRow.discount = updatedRow.recommendedDiscount;
                const qtyVal = parseFloat(updatedRow.qty) || 0;
                const discountVal = parseFloat(updatedRow.discount) || 0;
                const net = updatedRow.unitPrice * (1 - (discountVal / 100));
                updatedRow.netPrice = net.toFixed(2);
                updatedRow.lineTotal = (net * qtyVal).toFixed(2);
                return this.validateRow(updatedRow);
            }
            return row;
        });
        this.filterData();
    }

    get orderTotal() {
        return this.allProducts.reduce((t, r) => r.hasError ? t : t + (parseFloat(r.lineTotal) || 0), 0).toFixed(2);
    }
    get isSaveDisabled() { return this.orderTotal <= 0 || this.allProducts.some(r => r.hasError); }
    get containerClass() { return this.isFullScreen ? 'fullscreen-container' : 'standard-container'; }
    get fullScreenIcon() { return this.isFullScreen ? 'utility:contract_alt' : 'utility:expand_alt'; }

    toggleFullScreen() { this.isFullScreen = !this.isFullScreen; }
    openSaveModal() { this.showSaveModal = true; }
    closeSaveModal() { this.showSaveModal = false; }

    processSaveOrder() {
        this.showSaveModal = false;
        const itemsToSave = this.allProducts.filter(row => row.qty > 0 && !row.hasError);
        const currentCaseId = this._objectApiName === 'Case' ? this._recordId : null;

        createOrderFromGrid({
            accountId: this.targetAccountId,
            orderDataJSON: JSON.stringify(itemsToSave),
            deliveryDateString: this.deliveryDate,
            caseId: currentCaseId,
            salesChannelId: this.salesChannelId || null
        })
            .then(orderId => {
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastSuccess, message: this.labels.toastSuccessMsg, variant: 'success'
                }));
                this.handleClearAll();
                this.searchTerm = '';
                this.deliveryDate = null;
                if (orderId) {
                    this[NavigationMixin.Navigate]({
                        type: 'standard__recordPage',
                        attributes: { recordId: orderId, objectApiName: 'Order', actionName: 'view' }
                    });
                }
            })
            .catch(error => {
                let msg = this.labels.toastErrorMsg;
                if (error && error.body && error.body.message) msg = error.body.message;
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastError, message: msg, variant: 'error', mode: 'sticky'
                }));
            });
    }
}
