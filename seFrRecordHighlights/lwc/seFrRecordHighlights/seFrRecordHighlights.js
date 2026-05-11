import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import getQuickActionsForRecord from '@salesforce/apex/SE_FR_RecordHighlightsController.getQuickActionsForRecord';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import getRecordImageUrl from '@salesforce/apex/SE_FR_ImageFileController.getRecordImageUrl';
import replaceRecordImage from '@salesforce/apex/SE_FR_ImageFileController.replaceRecordImage';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import CONTACT_NAME from '@salesforce/schema/Contact.Name';

const ACCOUNT_DEFAULT_FIELDS = 'AccountNumber, Industry, Type, Phone';
const CONTACT_DEFAULT_FIELDS = 'Title, Email, Phone, Department';

const LABELS = {
    en: {
        edit: 'Edit',
        email: 'Email',
        viewHierarchy: 'View Account Hierarchy',
        openImage: 'Open image at full size',
        changeImage: 'Click to replace',
        imageAlt: 'Record image',
        toastUpdatedTitle: 'Image updated',
        toastUpdatedMsg: 'The record image has been replaced.',
        toastErrorTitle: 'Error',
        toastFieldMissing: 'The image URL field "{field}" does not exist on this record. Set "Image field API name" in App Builder.',
        noParentLookup: 'No parent lookup defined for {object}.',
        noParentLinked: 'This {object} is not linked to a {parent}.'
    },
    fr: {
        edit: 'Modifier',
        email: 'E-mail',
        viewHierarchy: 'Voir la hiérarchie',
        openImage: "Ouvrir l'image en taille réelle",
        changeImage: "Cliquer pour remplacer",
        imageAlt: "Image de l'enregistrement",
        toastUpdatedTitle: 'Image mise à jour',
        toastUpdatedMsg: "L'image de l'enregistrement a été remplacée.",
        toastErrorTitle: 'Erreur',
        toastFieldMissing: 'Le champ "{field}" est introuvable sur cet enregistrement. Configurez "Image field API name" dans App Builder.',
        noParentLookup: 'Aucun lookup parent défini pour {object}.',
        noParentLinked: "Ce {object} n'est pas lié à un {parent}."
    }
};

// For each source object, the lookup field on the current record that points to the target,
// and the target object API name.
// When the user picks "parent", the component resolves the target from this table.
const PARENT_MAP = {
    Contact:     { field: 'AccountId',        object: 'Account' },
    Account:     { field: 'ParentId',         object: 'Account' },
    Opportunity: { field: 'AccountId',        object: 'Account' },
    Case:        { field: 'AccountId',        object: 'Account' },
    Lead:        { field: 'ConvertedAccountId', object: 'Account' },
    Order:       { field: 'AccountId',        object: 'Account' },
    Contract:    { field: 'AccountId',        object: 'Account' },
    Quote:       { field: 'AccountId',        object: 'Account' }
};

export default class SeFrRecordHighlights extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';

    // App Builder properties
    @api accountFieldsList = ACCOUNT_DEFAULT_FIELDS;
    @api contactFieldsList = CONTACT_DEFAULT_FIELDS;
    @api customImageUrl;
    @api imageFieldApiName;
    // Maximum number of quick actions to display, picked dynamically from the active page layout's
    // Highlights / Quick Actions list. Default: 2 (matches how SLDS highlights typically render).
    @api maxQuickActions = 2;
    // Optional CSV of Quick Action API names that overrides the auto-loaded layout actions.
    // Example: 'Edit,Delete,SendEmail'. Leave empty (default) to follow the page layout.
    @api quickActionsCsv = '';
    // Legacy props kept so existing FlexiPages don't break on deploy. No longer used by the
    // rendering logic — the buttons now come from the active layout via getRecordActions.
    @api disableRealButtons = false;
    @api fakeButtonLabels;
    @api imageSize = 90;
    // When false (default), clicking the image opens a file picker to replace it inline. Turn ON
    // to go back to the legacy "open image full size" behavior.
    @api disableImageReplace = false;
    get allowImageReplace() { return !this.disableImageReplace; }

    // Record source:
    //   'current' (default) — display the record currently on the page
    //   'parent'            — display the parent record (e.g. the Account linked to the Contact /
    //                         Opportunity / Case / Order / Contract / Quote / Lead being viewed,
    //                         or the Parent Account when already on an Account page)
    @api recordSource = 'current';

    // Legacy property kept for backwards compatibility with v1 pages.
    @api fieldsList;

    @track imageUrlFromRecord;
    @track resolvedParentId;
    @track resolvedParentObject;

    // ------------------------------------------------------------------
    // Source resolution
    // ------------------------------------------------------------------

    get isParentMode() { return this.recordSource === 'parent'; }

    get parentLookup() {
        return PARENT_MAP[this.objectApiName] || null;
    }

    get parentLookupFieldQualified() {
        const lookup = this.parentLookup;
        return lookup ? `${this.objectApiName}.${lookup.field}` : null;
    }

    get parentLookupFields() {
        return this.parentLookupFieldQualified ? [this.parentLookupFieldQualified] : [];
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$parentLookupFields' })
    wiredParentLookup({ data }) {
        if (!this.isParentMode || !this.parentLookup) {
            this.resolvedParentId = null;
            this.resolvedParentObject = null;
            return;
        }
        if (data && data.fields && data.fields[this.parentLookup.field]) {
            this.resolvedParentId = data.fields[this.parentLookup.field].value || null;
            this.resolvedParentObject = this.resolvedParentId ? this.parentLookup.object : null;
        } else {
            this.resolvedParentId = null;
            this.resolvedParentObject = null;
        }
    }

    // The record ID + object we actually display
    get displayedRecordId() {
        return this.isParentMode ? this.resolvedParentId : this.recordId;
    }
    get displayedObjectApiName() {
        return this.isParentMode ? this.resolvedParentObject : this.objectApiName;
    }

    get parentConfigured() {
        return this.isParentMode && this.parentLookup;
    }
    get hasDisplayableRecord() {
        return !!this.displayedRecordId && !!this.displayedObjectApiName;
    }
    get labels() { return LABELS[this.language] || LABELS.en; }

    get parentNotFoundMessage() {
        if (!this.isParentMode) return null;
        if (!this.parentLookup) return this.labels.noParentLookup.replace('{object}', this.objectApiName);
        if (!this.resolvedParentId) return this.labels.noParentLinked.replace('{object}', this.objectApiName).replace('{parent}', this.parentLookup.object);
        return null;
    }
    get showEmptyState() {
        return this.isParentMode && !!this.parentNotFoundMessage;
    }

    get isContact() { return this.displayedObjectApiName === 'Contact'; }
    get isAccount() { return this.displayedObjectApiName === 'Account'; }

    get effectiveFieldsList() {
        if (this.isContact) return this.contactFieldsList;
        if (this.fieldsList && this.accountFieldsList === ACCOUNT_DEFAULT_FIELDS) return this.fieldsList;
        return this.accountFieldsList;
    }

    // ------------------------------------------------------------------
    // Name + image wires (for the displayed record)
    // ------------------------------------------------------------------

    get nameField() {
        return this.isContact ? CONTACT_NAME : ACCOUNT_NAME;
    }
    get nameFields() {
        return this.hasDisplayableRecord ? [this.nameField] : [];
    }

    @wire(getRecord, { recordId: '$displayedRecordId', fields: '$nameFields' })
    wiredName;

    get recordName() {
        return (this.wiredName && this.wiredName.data)
            ? getFieldValue(this.wiredName.data, this.nameField)
            : '';
    }

    get imageFields() { return []; }
    get imageOptionalFields() {
        const prefix = this.displayedObjectApiName || 'Account';
        return (this.imageFieldApiName && this.hasDisplayableRecord)
            ? [`${prefix}.${this.imageFieldApiName}`]
            : [];
    }

    @wire(getRecord, { recordId: '$displayedRecordId', fields: '$imageFields', optionalFields: '$imageOptionalFields' })
    wiredImage({ data }) {
        if (data && this.imageFieldApiName && data.fields && data.fields[this.imageFieldApiName]) {
            this.imageUrlFromRecord = data.fields[this.imageFieldApiName].value || null;
        } else {
            this.imageUrlFromRecord = null;
        }
    }

    // Fallback: image stored as a File on the record (uploaded via the click-to-replace action).
    // Works on any object with no custom schema — the Apex filters by a library-specific Title prefix.
    _fileImageWire;
    @track imageUrlFromFile;
    @wire(getRecordImageUrl, { recordId: '$displayedRecordId' })
    wiredFileImage(result) {
        this._fileImageWire = result;
        if (result.data) this.imageUrlFromFile = result.data;
        else this.imageUrlFromFile = null;
    }

    // ------------------------------------------------------------------
    // Derived display
    // ------------------------------------------------------------------

    get fieldsArray() {
        const list = this.effectiveFieldsList;
        if (!list) return [];
        return list.split(',').map(f => f.trim()).filter(f => f.length > 0);
    }

    // ------------------------------------------------------------------
    // Quick actions — sourced from the org's QuickActionDefinition records
    // ------------------------------------------------------------------
    // Apex returns active QuickActions on the displayed object; falls back to standard buttons
    // (Edit, Delete) when none are defined. The LWC trims to `maxQuickActions`. When the SE sets
    // `quickActionsCsv`, that CSV wins.

    @track _layoutActions = [];

    @wire(getQuickActionsForRecord, { recordId: '$displayedRecordId', objectApiName: '$displayedObjectApiName' })
    wiredLayoutActions({ data }) {
        if (!data) {
            this._layoutActions = [];
            return;
        }
        this._layoutActions = data
            .filter(a => a && a.apiName && a.label)
            .map(a => ({
                apiName: a.apiName,
                label: a.label,
                icon: this._normalizeIcon(a.iconUrl, a.apiName),
                actionType: a.actionType || 'QuickAction'
            }));
    }

    _guessIconFromName(name) {
        const n = (name || '').toLowerCase();
        if (n.includes('edit')) return 'utility:edit';
        if (n.includes('delete')) return 'utility:delete';
        if (n.includes('email')) return 'utility:email';
        if (n.includes('call') || n.includes('log')) return 'utility:call';
        if (n.includes('task')) return 'utility:task';
        if (n.includes('event') || n.includes('meeting')) return 'utility:event';
        if (n.includes('note')) return 'utility:note';
        if (n.includes('share')) return 'utility:share';
        if (n.includes('clone') || n.includes('copy')) return 'utility:copy';
        if (n.includes('new')) return 'utility:add';
        if (n.includes('change') || n.includes('update')) return 'utility:edit_form';
        if (n.includes('print')) return 'utility:print';
        if (n.includes('approve')) return 'utility:approval';
        return 'utility:action_list_component';
    }

    // The UI API returns icon URLs that look like '/img/icon/t4v35/utility/edit_120.png'.
    // Convert to the SLDS icon-name expected by lightning-button-icon. Falls back to the
    // best-effort icon guesser otherwise.
    _normalizeIcon(iconUrl, apiName) {
        if (iconUrl && typeof iconUrl === 'string') {
            const m = iconUrl.match(/\/(action|utility|standard|custom|doctype)\/([a-z0-9_]+?)(?:_\d+)?(?:\.png|\.svg)?$/i);
            if (m) {
                const family = m[1];
                const name = m[2];
                // lightning-button-icon doesn't support 'action' icons — fall back to utility.
                if (family === 'action') return this._guessIconFromName(apiName || name);
                return `${family}:${name}`;
            }
        }
        return this._guessIconFromName(apiName);
    }

    // Resolves the visible quick-action list. CSV override (if any) wins; otherwise we fall back
    // on the layout-loaded actions. Truncated to `maxQuickActions` either way.
    get quickActions() {
        const max = Math.max(0, Number(this.maxQuickActions) || 2);
        if (max === 0) return [];
        if (this.quickActionsCsv && this.quickActionsCsv.trim()) {
            const csvList = this.quickActionsCsv.split(',').map(raw => {
                const apiName = (raw || '').trim();
                if (!apiName) return null;
                return {
                    apiName,
                    label: apiName.replace(/^.*\./, '').replace(/_/g, ' '),
                    icon: this._guessIconFromName(apiName),
                    actionType: 'QuickAction'
                };
            }).filter(Boolean);
            return csvList.slice(0, max);
        }
        return (this._layoutActions || []).slice(0, max);
    }
    get hasQuickActions() { return this.quickActions.length > 0; }

    handleQuickAction(event) {
        const apiName = event.currentTarget.dataset.api;
        const actionType = event.currentTarget.dataset.type;
        if (!apiName || !this.displayedRecordId) return;
        // Standard buttons (Edit, Delete, Clone, ...) navigate via standard__recordPage actionName.
        if (actionType === 'StandardButton') {
            const map = { Edit: 'edit', Delete: 'delete', Clone: 'clone' };
            const action = map[apiName] || apiName.toLowerCase();
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: this.displayedRecordId,
                    objectApiName: this.displayedObjectApiName,
                    actionName: action
                }
            });
            return;
        }
        // QuickActions need a qualified api name (e.g. 'Account.SendEmail'). When the layout
        // already returned a qualified name it stays as-is; otherwise we prefix.
        const qualified = apiName.includes('.') ? apiName : `${this.displayedObjectApiName}.${apiName}`;
        this[NavigationMixin.Navigate]({
            type: 'standard__quickAction',
            attributes: { apiName: qualified },
            state: { recordId: this.displayedRecordId }
        });
    }

    get finalImageUrl() {
        if (this.customImageUrl) return this.customImageUrl;
        // Priority: SE-configured image URL field on the record > library-uploaded File.
        return this.imageUrlFromRecord || this.imageUrlFromFile || null;
    }

    get fallbackIcon() {
        return this.isContact ? 'standard:contact' : 'standard:account';
    }

    get imageSizeStyle() {
        const size = Number(this.imageSize) || 90;
        return `width: ${size}px; height: ${size}px;`;
    }

    get containerSizeStyle() {
        const size = Number(this.imageSize) || 90;
        return `width: ${size + 10}px; min-width: ${size + 10}px;`;
    }

    get openImageTitle() {
        return this.allowImageReplace ? this.labels.changeImage : this.labels.openImage;
    }
    get imageAlt() { return this.labels.imageAlt; }

    // ------------------------------------------------------------------
    // Image replacement — native file picker, uploads via Apex, writes URL to the record
    // ------------------------------------------------------------------

    @track isUploading = false;

    // Click on the image → open the hidden <input type="file">.
    openFilePicker() {
        if (this.isUploading) return;
        const input = this.refs ? this.refs.fileInput : null;
        if (input) input.click();
    }

    handleNativeFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        // Reset so picking the same file again re-fires 'change'.
        event.target.value = '';

        // 3 MB guard — matches what @AuraEnabled can carry comfortably as base64.
        if (file.size > 3 * 1024 * 1024) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastErrorTitle,
                message: 'Max 3 MB.',
                variant: 'error'
            }));
            return;
        }

        this.isUploading = true;
        const reader = new FileReader();
        reader.onload = () => {
            // Strip the 'data:<mime>;base64,' prefix.
            const base64 = reader.result.split(',')[1];
            replaceRecordImage({
                recordId: this.displayedRecordId,
                fileName: file.name,
                base64Data: base64
            })
                .then(newUrl => {
                    // Optimistic local update + refresh the wire so future renders still find the file.
                    this.imageUrlFromFile = newUrl;
                    this.isUploading = false;
                    if (this._fileImageWire) refreshApex(this._fileImageWire);
                    this.dispatchEvent(new ShowToastEvent({
                        title: this.labels.toastUpdatedTitle,
                        message: this.labels.toastUpdatedMsg,
                        variant: 'success'
                    }));
                })
                .catch(err => {
                    this.isUploading = false;
                    const msg = (err && err.body && err.body.message) || '';
                    this.dispatchEvent(new ShowToastEvent({
                        title: this.labels.toastErrorTitle,
                        message: msg,
                        variant: 'error',
                        mode: 'sticky'
                    }));
                });
        };
        reader.readAsDataURL(file);
    }
}
