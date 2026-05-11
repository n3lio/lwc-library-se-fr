import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getOrderDetailsFromCase from '@salesforce/apex/SE_FR_OrderSummaryController.getOrderDetailsFromCaseWithImageField';
import getOrderDetailsById from '@salesforce/apex/SE_FR_OrderSummaryController.getOrderDetailsByIdWithImageField';
import submitOrderToERP from '@salesforce/apex/SE_FR_OrderSummaryController.submitOrderToERP';
import saveDeliveryDetails from '@salesforce/apex/SE_FR_OrderSummaryController.saveDeliveryDetails';
import deleteOrderRecord from '@salesforce/apex/SE_FR_OrderSummaryController.deleteOrderRecord';
import { refreshApex } from '@salesforce/apex';

const LABELS = {
    en: {
        cardTitle: 'Linked Order',
        replace: 'Replace',
        delivery: 'Delivery',
        submitOrder: 'Submit order',
        searchAnotherOrder: 'Search another order to display:',
        orderLabel: 'Order',
        orderPlaceholder: 'Search orders…',
        backToDefault: 'Back to default',
        close: 'Close',
        linkAnOrder: 'Link an order',
        overrideNotice: 'Showing a manually selected order.',
        resetToDefault: 'Reset to default',
        orderNumber: 'Order number',
        status: 'Status',
        orderName: 'Order name',
        totalAmount: 'Total amount',
        estimatedDelivery: 'Estimated delivery date',
        freeShipping: 'Free shipping',
        deliveryDetailsTitle: 'Delivery details & instructions',
        deliveryAddress: 'Delivery address (Account)',
        noteForCarrier: 'Note for carrier',
        cancel: 'Cancel',
        save: 'Save',
        orderedProducts: 'Ordered products',
        ref: 'Ref',
        qty: 'Qty',
        perUnit: '/ unit',
        successMessage: 'Order submitted.',
        deleteConfirm: 'Delete this order?',
        emptyState: 'No order found for this case.',
        unknownProduct: 'Unknown product',
        naValue: 'N/A',
        toastSuccess: 'Success',
        toastUpdated: 'Updated',
        toastDetailsSaved: 'Details saved.',
        toastDeleted: 'Deleted',
        toastOrderDeleted: 'Order deleted.',
        toastLinkedReplaced: 'Linked order replaced.',
        toastBackToAuto: 'Back to auto-resolved order.',
        separatorLabel: 'OR'
    },
    fr: {
        cardTitle: 'Commande liée',
        replace: 'Remplacer',
        delivery: 'Livraison',
        submitOrder: 'Valider la commande',
        searchAnotherOrder: 'Rechercher une autre commande à afficher :',
        orderLabel: 'Commande',
        orderPlaceholder: 'Rechercher des commandes…',
        backToDefault: 'Revenir à la commande par défaut',
        close: 'Fermer',
        linkAnOrder: 'Lier une commande',
        overrideNotice: 'Affichage d\'une commande sélectionnée manuellement.',
        resetToDefault: 'Revenir à la commande par défaut',
        orderNumber: 'Numéro de commande',
        status: 'Statut',
        orderName: 'Nom de la commande',
        totalAmount: 'Montant total',
        estimatedDelivery: 'Date de livraison estimée',
        freeShipping: 'Franco de port',
        deliveryDetailsTitle: 'Détails & instructions de livraison',
        deliveryAddress: 'Adresse de livraison (Compte)',
        noteForCarrier: 'Note pour le livreur',
        cancel: 'Annuler',
        save: 'Enregistrer',
        orderedProducts: 'Produits commandés',
        ref: 'Réf',
        qty: 'Qté',
        perUnit: "/ unité",
        successMessage: 'Commande envoyée.',
        deleteConfirm: 'Supprimer cette commande ?',
        emptyState: 'Aucune commande trouvée pour ce cas.',
        unknownProduct: 'Produit inconnu',
        naValue: 'N/D',
        toastSuccess: 'Succès',
        toastUpdated: 'Mis à jour',
        toastDetailsSaved: 'Détails enregistrés.',
        toastDeleted: 'Supprimé',
        toastOrderDeleted: 'Commande supprimée.',
        toastLinkedReplaced: 'Commande liée remplacée.',
        toastBackToAuto: 'Retour à la commande résolue automatiquement.',
        separatorLabel: 'OU'
    }
};

export default class SeFrOrderSummary extends NavigationMixin(LightningElement) {
    @api recordId;

    @api language = 'fr';

    // App Builder properties
    @api cardTitle;
    @api cardIcon = 'standard:orders';
    @api showBottomSeparator = false;
    @api separatorLabel;   // optional override; falls back to language dictionary 'OR' / 'OU'
    @api currencyCode = 'EUR';
    @api successMessage;
    @api deleteConfirmMessage;
    @api emptyStateMessage;
    @api productImageFieldApiName = 'Image_URL__c';
    @api productImageFallbackUrl = '';

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedSeparatorLabel() { return this.separatorLabel || this.labels.separatorLabel; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedSuccessMessage() { return this.successMessage || this.labels.successMessage; }
    get resolvedDeleteConfirm() { return this.deleteConfirmMessage || this.labels.deleteConfirm; }
    get resolvedEmptyState() { return this.emptyStateMessage || this.labels.emptyState; }
    get orderedProductsLabel() {
        const count = this.orderData && this.orderData.itemCount;
        return `${this.labels.orderedProducts} (${count || 0})`;
    }

    @track orderData;
    @track processedProducts = [];
    @track isFreeShipping = true;

    @track isEditingDelivery = false;
    @track isEditingOrderLink = false;
    @track editFormDate;
    @track editFormNote;

    // When set, the component displays this order instead of the auto-resolved one.
    @track overrideOrderId;

    wiredDefaultOrder;
    wiredOverrideOrder;

    @wire(getOrderDetailsFromCase, { caseId: '$effectiveCaseIdForAutoLookup', productImageFieldApiName: '$productImageFieldApiName' })
    wiredOrderFromCase(result) {
        this.wiredDefaultOrder = result;
        if (!this.overrideOrderId) {
            this.applyResult(result);
        }
    }

    @wire(getOrderDetailsById, { orderId: '$overrideOrderId', caseId: '$recordId', productImageFieldApiName: '$productImageFieldApiName' })
    wiredOrderById(result) {
        this.wiredOverrideOrder = result;
        if (this.overrideOrderId) {
            this.applyResult(result);
        }
    }

    // Block the auto-lookup wire while in override mode to save queries.
    get effectiveCaseIdForAutoLookup() {
        return this.overrideOrderId ? null : this.recordId;
    }

    applyResult(result) {
        if (result && result.data) {
            this.orderData = result.data;
            this.editFormDate = result.data.deliveryDate;
            this.editFormNote = result.data.deliveryNote;
            const l = this.labels;
            this.processedProducts = (result.data.products || []).map(prod => {
                const rawUrl = this.getProductImageUrl(prod);
                const imgUrl = rawUrl || this.productImageFallbackUrl || null;
                return {
                    ...prod,
                    name: prod.Product2 ? prod.Product2.Name : l.unknownProduct,
                    code: prod.Product2 ? prod.Product2.ProductCode : l.naValue,
                    imageUrl: imgUrl,
                    hasImage: !!imgUrl
                };
            });
        } else {
            this.orderData = null;
            this.processedProducts = [];
        }
    }

    getProductImageUrl(orderItem) {
        if (!orderItem || !orderItem.Product2) return null;
        const fieldName = this.productImageFieldApiName || 'Image_URL__c';
        return orderItem.Product2[fieldName] || null;
    }

    handleValidateOrder() {
        submitOrderToERP({ orderId: this.orderData.orderId, caseId: this.recordId, milestoneId: null })
            .then(() => {
                this.showToast(this.labels.toastSuccess, this.resolvedSuccessMessage, 'success');
                this.navigateToOrder();
                return this.refreshActive();
            });
    }

    handleSaveDelivery() {
        saveDeliveryDetails({
            orderId: this.orderData.orderId,
            caseId: this.recordId,
            deliveryDate: this.editFormDate,
            noteLivreur: this.editFormNote
        })
            .then(() => {
                this.isEditingDelivery = false;
                this.showToast(this.labels.toastUpdated, this.labels.toastDetailsSaved, 'success');
                return this.refreshActive();
            });
    }

    handleDeleteOrder() {
        if (confirm(this.resolvedDeleteConfirm)) {
            deleteOrderRecord({ orderId: this.orderData.orderId }).then(() => {
                this.showToast(this.labels.toastDeleted, this.labels.toastOrderDeleted, 'success');
                this.overrideOrderId = null;
                return this.refreshActive();
            });
        }
    }

    toggleEditDelivery() { this.isEditingDelivery = !this.isEditingDelivery; this.isEditingOrderLink = false; }
    toggleEditOrderLink() { this.isEditingOrderLink = !this.isEditingOrderLink; this.isEditingDelivery = false; }
    handleFreeShippingToggle(event) { this.isFreeShipping = event.target.checked; }
    handleFormDateChange(event) { this.editFormDate = event.target.value; }
    handleFormNoteChange(event) { this.editFormNote = event.target.value; }

    handleOrderPicked(event) {
        const pickedOrderId = event.detail && event.detail.recordId;
        if (pickedOrderId) {
            this.overrideOrderId = pickedOrderId;
            this.isEditingOrderLink = false;
            this.showToast(this.labels.toastUpdated, this.labels.toastLinkedReplaced, 'success');
        }
    }

    handleResetOverride() {
        this.overrideOrderId = null;
        this.isEditingOrderLink = false;
        this.showToast(this.labels.toastUpdated, this.labels.toastBackToAuto, 'success');
    }

    get hasOverride() {
        return !!this.overrideOrderId;
    }

    navigateToOrder() {
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: { recordId: this.orderData.orderId, actionName: 'view' }
        }).then(url => { window.open(url, '_blank'); });
    }

    refreshActive() {
        const active = this.overrideOrderId ? this.wiredOverrideOrder : this.wiredDefaultOrder;
        return active ? refreshApex(active) : Promise.resolve();
    }

    showToast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
