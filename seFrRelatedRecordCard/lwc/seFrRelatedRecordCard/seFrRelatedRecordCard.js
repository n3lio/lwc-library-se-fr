import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRelatedRecord from '@salesforce/apex/SE_FR_RelatedRecordCardController.getRelatedRecord';
import getRecordImageUrl from '@salesforce/apex/SE_FR_ImageFileController.getRecordImageUrl';
import replaceRecordImage from '@salesforce/apex/SE_FR_ImageFileController.replaceRecordImage';

const LABELS = {
    en: {
        cardTitle: 'Details',
        // When displaying an Account next to a Contact we say "Related Account"; everywhere else
        // (Case/Opp/Order) simply "Account".
        accountTitleRelated: 'Related Account',
        accountTitle: 'Account',
        contactTitle: 'Primary Contact',
        empty: 'No related record.',
        openRecord: 'Open record',
        changeImage: 'Click to replace'
    },
    fr: {
        cardTitle: 'Détails',
        accountTitleRelated: 'Compte associé',
        accountTitle: 'Compte',
        contactTitle: 'Contact principal',
        empty: 'Aucun enregistrement lié.',
        openRecord: "Ouvrir l'enregistrement",
        changeImage: 'Cliquer pour remplacer'
    }
};

// Default field lists per target — generic, industry-agnostic. SEs can override with fieldsCsv.
const DEFAULT_FIELDS = {
    Contact: 'Title,Department,Email,Phone,MobilePhone',
    Account: 'Industry,Type,Phone,Website,AnnualRevenue,NumberOfEmployees'
};

export default class SeFrRelatedRecordCard extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;                           // override; else dictionary "Account" / "Contact"
    @api cardIcon;                            // override; else auto-picked from target

    // 'auto' (default) | 'account' | 'contact' — picks what to display relative to the record page.
    @api target = 'auto';

    // Optional: overrides the default field list. CSV of field API names on the target SObject.
    @api fieldsCsv = '';

    // Image source resolution chain for the displayed record:
    //   1. URL field configured on the target (Contact-side: `contactImageFieldApiName`,
    //      Account-side: `accountImageFieldApiName`). Schema-safe — if the field is absent on the
    //      target, it's silently skipped.
    //   2. File attached to the target record (library convention via SE_FR_ImageFile).
    //   3. Initials placeholder.
    // The Contact default `SDO_Cust360_Contact_Picture_URL__c` works on the SDO showcase org. The
    // Account default is empty (no standard URL field exists), so a fresh org picks up the File
    // fallback automatically. SEs can repoint either to a custom field via App Builder.
    @api contactImageFieldApiName = 'SDO_Cust360_Contact_Picture_URL__c';
    @api accountImageFieldApiName = '';
    @api disableImageReplace = false;
    get allowImageReplace() { return !this.disableImageReplace; }
    // Legacy props kept so deployed FlexiPages don't break on upgrade.
    @api imageFieldApiName = 'PhotoURL';
    @api imageMode = 'field';

    // What the Apex `getRelatedRecord` should project as the image URL field. Resolved from the
    // chosen target (auto / contact / account). When `auto` is used, derive the target from the
    // source object before the Apex call so we project the right field on first render.
    get _resolvedTargetObject() {
        if (this.target === 'contact') return 'Contact';
        if (this.target === 'account') return 'Account';
        if (this.objectApiName === 'Account') return 'Contact';
        return 'Account';
    }
    get _imageFieldForTarget() {
        if (this._resolvedTargetObject === 'Contact') {
            return this.contactImageFieldApiName || this.imageFieldApiName || '';
        }
        return this.accountImageFieldApiName || '';
    }

    @track related = null;
    @track imageUrlFromFile;
    @track isUploading = false;
    _fileImageWire;

    get labels() { return LABELS[this.language] || LABELS.en; }

    // Resolved fields list: SE override wins; else a target-appropriate default.
    get resolvedFieldsCsv() {
        if (this.fieldsCsv && this.fieldsCsv.trim().length > 0) return this.fieldsCsv;
        // When target='auto', pre-compute using source object: Account source → Contact defaults, else Account defaults.
        if (this.target === 'contact') return DEFAULT_FIELDS.Contact;
        if (this.target === 'account') return DEFAULT_FIELDS.Account;
        return this.objectApiName === 'Account' ? DEFAULT_FIELDS.Contact : DEFAULT_FIELDS.Account;
    }

    get resolvedCardTitle() {
        if (this.cardTitle) return this.cardTitle;
        const objName = (this.related && this.related.objectApiName) || '';
        if (objName === 'Contact') return this.labels.contactTitle;
        if (objName === 'Account') {
            // "Related Account" / "Compte associé" when we're on a Contact page (1-to-1 relation).
            // Elsewhere keep the short "Account" / "Compte".
            return this.objectApiName === 'Contact'
                ? this.labels.accountTitleRelated
                : this.labels.accountTitle;
        }
        return this.labels.cardTitle;
    }

    get resolvedCardIcon() {
        if (this.cardIcon) return this.cardIcon;
        const objName = (this.related && this.related.objectApiName) || '';
        if (objName === 'Contact') return 'standard:contact';
        if (objName === 'Account') return 'standard:account';
        return 'standard:default';
    }

    // The field-based image wire always fetches the URL field if present; it's cheap and lets the
    // SE switch `imageMode` without a redeploy.
    @wire(getRelatedRecord, {
        sourceRecordId: '$recordId',
        sourceObjectApi: '$objectApiName',
        target: '$target',
        imageFieldApiName: '$_imageFieldForTarget',
        fieldsCsv: '$resolvedFieldsCsv'
    })
    wiredRelated({ data, error }) {
        if (data) {
            this.related = {
                ...data,
                initials: this._initials(data.name),
                fields: (data.fields || []).map(f => ({
                    ...f,
                    isPhone: f.type === 'phone',
                    isEmail: f.type === 'email',
                    isUrl: f.type === 'url',
                    isText: f.type === 'text',
                    phoneHref: f.type === 'phone' ? `tel:${f.value}` : null,
                    emailHref: f.type === 'email' ? `mailto:${f.value}` : null,
                    urlHref: f.type === 'url'
                        ? (f.value.startsWith('http') ? f.value : `https://${f.value}`)
                        : null
                })).filter(f => f.value)
            };
        } else if (error) {
            // eslint-disable-next-line no-console
            console.error('[seFrRelatedRecordCard] getRelatedRecord error:', error);
            this.related = null;
        }
    }

    // File-based image — loaded as a fallback when the URL field is empty or doesn't exist on
    // the target (e.g. `PhotoURL` doesn't exist on Account, so the chain falls back to the File
    // attached to the Account). The wire returns `undefined` for the recordId until `related`
    // is set, which makes LWC skip the call (no spurious null-Id Apex errors).
    get _targetRecordIdForFile() {
        return (this.related && this.related.recordId) ? this.related.recordId : undefined;
    }
    @wire(getRecordImageUrl, { recordId: '$_targetRecordIdForFile' })
    wiredFileImage(result) {
        this._fileImageWire = result;
        this.imageUrlFromFile = result.data || null;
    }

    get displayedImageUrl() {
        if (!this.related) return null;
        // URL field wins when populated; otherwise the File attached to the target record.
        const fromField = this.related.imageUrl;
        const fromFile = this.imageUrlFromFile;
        return fromField || fromFile || null;
    }
    get hasImage() { return !!this.displayedImageUrl; }
    // The avatar is clickable to upload a new image whenever replacement is allowed.
    get isFileMode() { return this.allowImageReplace; }
    get imageTitle() { return this.allowImageReplace ? this.labels.changeImage : ''; }

    _initials(name) {
        return (name || '')
            .split(/\s+/).filter(Boolean).slice(0, 2)
            .map(w => w[0].toUpperCase()).join('');
    }

    get hasRelated() { return !!this.related; }

    openRelatedRecord() {
        if (!this.related || !this.related.recordId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: this.related.recordId,
                objectApiName: this.related.objectApiName,
                actionName: 'view'
            }
        });
    }

    // --- File-based image replacement (shared with seFrRecordHighlights) -----------------------

    openFilePicker(event) {
        if (!this.allowImageReplace || !this.related || this.isUploading) return;
        event.stopPropagation();
        const input = this.refs ? this.refs.fileInput : null;
        if (input) input.click();
    }

    handleNativeFileChange(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        event.target.value = '';
        if (file.size > 3 * 1024 * 1024) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error', message: 'Max 3 MB.', variant: 'error'
            }));
            return;
        }
        this.isUploading = true;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            replaceRecordImage({
                recordId: this.related.recordId,
                fileName: file.name,
                base64Data: base64
            })
                .then(newUrl => {
                    this.imageUrlFromFile = newUrl;
                    this.isUploading = false;
                    if (this._fileImageWire) refreshApex(this._fileImageWire);
                })
                .catch(err => {
                    this.isUploading = false;
                    const msg = (err && err.body && err.body.message) || '';
                    this.dispatchEvent(new ShowToastEvent({
                        title: 'Error', message: msg, variant: 'error', mode: 'sticky'
                    }));
                });
        };
        reader.readAsDataURL(file);
    }
}
