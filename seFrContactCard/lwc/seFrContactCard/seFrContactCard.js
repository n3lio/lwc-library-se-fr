import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import resolveContactId from '@salesforce/apex/SE_FR_ContactCardController.resolveContactId';
import getContactData from '@salesforce/apex/SE_FR_ContactCardController.getContactData';
import getPromptSummary from '@salesforce/apex/SE_FR_ContactCardController.getPromptSummary';
// Same Files-based image pattern as seFrRecordHighlights — share the Apex so both components use
// the same File storage convention (Title prefix `__SE_FR_RH_IMG__`).
import getRecordImageUrl from '@salesforce/apex/SE_FR_ImageFileController.getRecordImageUrl';
import replaceRecordImage from '@salesforce/apex/SE_FR_ImageFileController.replaceRecordImage';

const LABELS = {
    en: {
        cardTitle: 'Contact',
        customerIdLabel: 'Customer ID',
        titleLabel: 'Title',
        departmentLabel: 'Department',
        openContact: 'Open contact',
        changeImage: 'Click to replace',
        empty: 'No contact linked to this record.',
        summarizeBtn: 'Summarize',
        summarizeTitle: 'Generate AI summary',
        summarizeEmpty: 'Empty prompt response.',
        summarizeError: 'Prompt generation error.',
        uploadMaxSize: 'Max 3 MB.',
        toastError: 'Error'
    },
    fr: {
        cardTitle: 'Contact',
        customerIdLabel: 'ID client',
        titleLabel: 'Fonction',
        departmentLabel: 'Service',
        openContact: 'Ouvrir le contact',
        changeImage: 'Cliquer pour remplacer',
        empty: 'Aucun contact lié à cet enregistrement.',
        summarizeBtn: 'Résumer',
        summarizeTitle: 'Générer un résumé IA',
        summarizeEmpty: 'Réponse du prompt vide.',
        summarizeError: 'Erreur lors de la génération du prompt.',
        uploadMaxSize: 'Max 3 Mo.',
        toastError: 'Erreur'
    }
};

export default class SeFrContactCard extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;
    // When true (default on a Contact record page), hide the lightning-card header (title + icon).
    // The user already sees the native Contact name above the page layout.
    @api hideHeaderOnContact = false;
    get headerless() { return this.hideHeaderOnContact && this.objectApiName === 'Contact'; }

    // --- Image source -------------------------------------------------------------------------
    // The displayed image is resolved with this priority: imageFieldApiName (URL field on
    // Contact, when present) → File attached to the Contact (Title-prefixed via SE_FR_ImageFile
    // controller) → initials placeholder.
    // Clicking the avatar ALWAYS opens a file picker that uploads to the Contact as a File and
    // becomes the new displayed image (works on a Contact page AND on a Case/Account page where
    // the contact is the linked one). Set `disableImageReplace=true` to lock the avatar.
    @api imageFieldApiName = 'SDO_Cust360_Contact_Picture_URL__c';
    @api disableImageReplace = false;
    get allowImageReplace() { return !this.disableImageReplace; }
    // Legacy prop — kept so existing FlexiPages don't break. The component now reads the image
    // from BOTH the URL field (priority) AND the File attached to the contact (fallback).
    @api imageMode = 'field';

    // --- Customer ID --------------------------------------------------------------------------
    @api showCustomerId = false;
    @api customerIdFieldApiName = 'SDO_Cust360_Id__c';

    // --- Gauges (up to 3) ---------------------------------------------------------------------
    // Each gauge exposes BOTH a `gaugeXFieldApiName` (reads the value from a Contact field) AND a
    // `gaugeXValue` (SE types a static number directly). If both are set, the field wins when the
    // record has a numeric value; otherwise we fall back on the static value.
    @api gauge1Label = 'Churn risk';
    @api gauge1FieldApiName = 'SDO_Cust360_ChurnRisk__c';
    @api gauge1Value = '';
    @api gauge1Icon = 'utility:warning';
    // 'lower-better' (0=green, 100=red) for risk-style metrics; 'higher-better' (0=red, 100=green)
    // for satisfaction / health / adoption. Drives the color gradient.
    @api gauge1Direction = 'lower-better';
    @api gauge2Label;
    @api gauge2FieldApiName;
    @api gauge2Value = '';
    @api gauge2Icon = 'utility:trending';
    @api gauge2Direction = 'higher-better';
    @api gauge3Label;
    @api gauge3FieldApiName;
    @api gauge3Value = '';
    @api gauge3Icon = 'utility:dashboard';
    @api gauge3Direction = 'higher-better';

    // --- Look & feel --------------------------------------------------------------------------
    // `hideWaves` with default=false means waves are ON out-of-the-box. The legacy `showWaves`
    // prop (default=false) is kept so existing FlexiPages don't break on deploy; when it's
    // explicitly toggled ON, it still turns waves on, but `hideWaves` wins when set.
    @api hideWaves = false;
    @api showWaves = false;
    get wavesVisible() {
        if (this.hideWaves) return false;
        return true; // on by default; `hideWaves` is the only way to turn them off.
    }
    @api isDarkBackground = false;
    @api backgroundColor = '';
    @api backgroundImageUrl = '';
    // Default wave colors = tinted variants of the Lightning theme accent. Left empty by default
    // so the CSS falls back to its own theme-accent defaults (see .css).
    @api waveColorOne = '';
    @api waveColorTwo = '';

    // --- AI prompt summary — ON by default with the SDO-standard contact summary template ----
    // LWC1503 forbids boolean @api props defaulting to true, so we expose `disablePromptSummary`
    // (default false). The legacy `enablePromptSummary` prop is kept (a deployed FlexiPage
    // references it) but no longer drives the rendering — we read `disablePromptSummary` only.
    @api disablePromptSummary = false;
    @api enablePromptSummary = false;       // legacy — see comment above
    get isPromptSummaryEnabled() { return !this.disablePromptSummary; }
    @api promptButtonLabel;                          // defaults to dictionary "Summarize"
    @api promptTemplateApiName = 'einstein_gpt__summarizeContact';
    @api promptInputApiName = 'Input:Contact';
    @api autoPromptOnLoad = false;

    // --- Internal state -----------------------------------------------------------------------
    @track contactId;
    @track contactData = {};
    @track imageUrlFromFile;
    @track isUploading = false;
    @track promptText = '';
    @track isPromptRunning = false;
    @track promptStarted = false;
    _fileImageWire;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    // --- Imperative Contact Id resolution + data fetch -----------------------------------------
    // Using imperative Apex calls instead of @wire because LWC wires with `cacheable=true` skip
    // the call when any reactive param is still `undefined` — which happens on first render
    // while `recordId` / `objectApiName` are being populated by the platform. Calling in
    // `connectedCallback` + `renderedCallback` (with a dedup key) guarantees the fetch fires once
    // both are known.

    _lastLoadKey;

    connectedCallback() { this._loadIfReady(); }
    renderedCallback() {
        this._loadIfReady();
        this._renderPromptHtml();
    }

    // Inject the prompt summary (HTML markup returned by the prompt template) directly into the
    // DOM. `lightning-formatted-rich-text` doesn't work here because the response contains tags
    // the component sanitises / escapes back to literal text.
    // The `lwc:dom="manual"` div is queried by class and we set its innerHTML once the value
    // changes. Two divs exist (carded + headerless mode) but only one is rendered at a time.
    _renderPromptHtml() {
        const html = this.promptText || '';
        const target = this.template.querySelector('.can-prompt-html-target');
        if (target && target.innerHTML !== html) {
            target.innerHTML = html;
        }
    }

    _loadIfReady() {
        const key = `${this.recordId || ''}|${this.objectApiName || ''}`;
        if (!this.recordId || !this.objectApiName) return;
        if (key === this._lastLoadKey) return;
        this._lastLoadKey = key;

        resolveContactId({ recordId: this.recordId, objectApiName: this.objectApiName })
            .then(cid => {
                this.contactId = cid || null;
                if (!this.contactId) {
                    this.contactData = {};
                    return null;
                }
                return getContactData({
                    contactId: this.contactId,
                    imageFieldApiName: this.imageFieldApiName || '',
                    customerIdFieldApiName: this.customerIdFieldApiName || '',
                    gauge1FieldApiName: this.gauge1FieldApiName || '',
                    gauge2FieldApiName: this.gauge2FieldApiName || '',
                    gauge3FieldApiName: this.gauge3FieldApiName || ''
                });
            })
            .then(data => {
                if (data) {
                    this.contactData = data;
                    if (this.isPromptSummaryEnabled && this.autoPromptOnLoad && !this.promptStarted) {
                        this.runPromptSummary();
                    }
                }
            })
            .catch(err => {
                // eslint-disable-next-line no-console
                console.error('[seFrContactCard] load error:', err);
                this.contactData = {};
            });
    }

    // --- File-based image (always loaded as fallback when no field URL is set) ----------------

    get _fileRecordId() {
        return this.contactId || null;
    }
    @wire(getRecordImageUrl, { recordId: '$_fileRecordId' })
    wiredFileImage(result) {
        this._fileImageWire = result;
        this.imageUrlFromFile = result.data || null;
    }

    // --- Derived display ----------------------------------------------------------------------

    get hasContact() { return !!this.contactId && !!this.contactData.Id; }

    get firstName() { return this.contactData.FirstName || ''; }
    get lastName() { return this.contactData.LastName || ''; }
    get fullName() {
        const parts = [this.firstName, this.lastName].filter(Boolean);
        return parts.join(' ');
    }
    get email() { return this.contactData.Email || ''; }
    get phone() { return this.contactData.Phone || this.contactData.MobilePhone || ''; }
    get hasEmail() { return !!this.email; }
    get hasPhone() { return !!this.phone; }
    get emailHref() { return this.email ? `mailto:${this.email}` : null; }
    get phoneHref() { return this.phone ? `tel:${this.phone}` : null; }

    // Title + Department (Fonction + Service) — standard Contact fields.
    get title() { return this.contactData.Title || ''; }
    get department() { return this.contactData.Department || ''; }
    get hasTitle() { return !!this.title; }
    get hasDepartment() { return !!this.department; }
    get hasTitleOrDepartment() { return this.hasTitle || this.hasDepartment; }

    // Hide the "Open contact" button when we're already on the contact record page.
    get showOpenButton() {
        return this.hasContact && this.objectApiName !== 'Contact';
    }

    get customerIdValue() {
        return this.customerIdFieldApiName ? this.contactData[this.customerIdFieldApiName] : null;
    }
    get showCustomerIdLine() { return this.showCustomerId && !!this.customerIdValue; }

    get addressLine1() { return this.contactData.MailingStreet || ''; }
    get addressLine2() {
        const zip = this.contactData.MailingPostalCode || '';
        const city = this.contactData.MailingCity || '';
        const country = this.contactData.MailingCountry || '';
        const parts = [];
        if (zip || city) parts.push([zip, city].filter(Boolean).join(' '));
        if (country) parts.push(`(${country})`);
        return parts.join(' ');
    }
    get hasAddress() { return this.addressLine1 || this.addressLine2; }

    // Gauges: build a list of visible gauges (only when the field has a numeric value). Each gauge
    // gets a color driven by its direction:
    //   'lower-better' → 0 is green, 100 is red (e.g. churn risk)
    //   'higher-better' → 0 is red, 100 is green (e.g. health / satisfaction)
    get gauges() {
        const defs = [
            { label: this.gauge1Label, field: this.gauge1FieldApiName, staticValue: this.gauge1Value, icon: this.gauge1Icon, direction: this.gauge1Direction, id: 'g1' },
            { label: this.gauge2Label, field: this.gauge2FieldApiName, staticValue: this.gauge2Value, icon: this.gauge2Icon, direction: this.gauge2Direction, id: 'g2' },
            { label: this.gauge3Label, field: this.gauge3FieldApiName, staticValue: this.gauge3Value, icon: this.gauge3Icon, direction: this.gauge3Direction, id: 'g3' }
        ];
        return defs
            // A gauge needs a label and at least one source (field OR static value).
            .filter(g => g.label && (g.field || g.staticValue !== '' && g.staticValue !== null && g.staticValue !== undefined))
            .map(g => {
                // Prefer the Contact field when it has a numeric value; fall back to the static value.
                let num;
                if (g.field) {
                    const raw = this.contactData[g.field];
                    const n = Number(raw);
                    if (Number.isFinite(n)) num = n;
                }
                if (num === undefined) {
                    const s = Number(g.staticValue);
                    if (Number.isFinite(s)) num = s;
                }
                if (num === undefined) return null;
                // Clamp 0-100 for the progress bar; numeric label shows the raw value.
                const clamped = Math.max(0, Math.min(100, num));
                const color = this._gaugeColor(clamped, g.direction);
                return {
                    ...g,
                    value: num,
                    clamped,
                    display: `${num}%`,
                    valueStyle: `color: ${color}; font-weight: 700;`,
                    // CSS variable fed to the progress bar's filled portion (set via scoped host style)
                    barStyle: `--gauge-color: ${color};`
                };
            })
            .filter(Boolean);
    }

    // True when the prompt-summary block should render (drives the separator above the button).
    get showPromptSection() { return this.isPromptSummaryEnabled; }
    get hasGauges() { return this.gauges.length > 0; }
    get showPromptSeparator() { return this.showPromptSection && this.hasGauges; }

    // Linear red → amber → green ramp. `value` is 0-100 after clamping.
    // `direction = 'lower-better'` reverses the ramp (used for risk metrics).
    _gaugeColor(value, direction) {
        const v = (direction === 'lower-better') ? (100 - value) : value;
        // red  #ba0517 at 0
        // amber #fe9339 at 50
        // green #2e844a at 100
        if (v <= 50) {
            const t = v / 50;
            return this._lerp('#ba0517', '#fe9339', t);
        }
        const t = (v - 50) / 50;
        return this._lerp('#fe9339', '#2e844a', t);
    }
    _lerp(hexA, hexB, t) {
        const a = this._hexToRgb(hexA);
        const b = this._hexToRgb(hexB);
        const r = Math.round(a.r + (b.r - a.r) * t);
        const g = Math.round(a.g + (b.g - a.g) * t);
        const bl = Math.round(a.b + (b.b - a.b) * t);
        return `rgb(${r}, ${g}, ${bl})`;
    }
    _hexToRgb(h) {
        const s = h.replace('#', '');
        return {
            r: parseInt(s.slice(0, 2), 16),
            g: parseInt(s.slice(2, 4), 16),
            b: parseInt(s.slice(4, 6), 16)
        };
    }

    get initials() {
        return (this.fullName || '')
            .split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
    }
    get imageUrlFromField() {
        return this.imageFieldApiName ? this.contactData[this.imageFieldApiName] : null;
    }
    get displayedImageUrl() {
        // URL field wins when set; otherwise show the File attached to the contact.
        return this.imageUrlFromField || this.imageUrlFromFile || null;
    }
    get hasImage() { return !!this.displayedImageUrl; }
    // Avatar is clickable to replace the image (uploads as a File on the Contact). Toggle off
    // with `disableImageReplace`. The legacy `imageMode='field'` no longer prevents replacement.
    get isFileMode() { return this.allowImageReplace; }
    get imageTitle() { return this.allowImageReplace ? this.labels.changeImage : ''; }

    // Classes / inline styles
    // Headerless mode (typically Contact record page): we render the card chrome ourselves, so we
    // include the `slds-card` class for the white background + box-shadow.
    // Carded mode: the `<lightning-card>` already provides the chrome — adding `slds-card` here
    // creates a visible white margin around the wave-filled area. We drop it so `.can-root` can
    // bleed edge-to-edge inside the lightning-card body.
    get cardRootClass() {
        const dark = this.isDarkBackground ? ' can-dark' : '';
        if (this.headerless) {
            return 'can-root can-root_headerless slds-card can-overflow-hidden' + dark;
        }
        return 'can-root can-root_carded can-overflow-hidden' + dark;
    }
    get cardBackgroundStyle() {
        let s = '';
        if (this.backgroundColor) s += `background: ${this.backgroundColor};`;
        if (this.backgroundImageUrl) {
            s += `background-image: url('${this.backgroundImageUrl}'); background-size: cover; background-position: center;`;
        }
        return s;
    }
    // When no explicit color is set, fall back to the CSS theme-accent defaults (declared on :host).
    get waveStyleOne() {
        return this.waveColorOne
            ? `background: ${this.waveColorOne};`
            : 'background: var(--can-wave-default-one);';
    }
    get waveStyleTwo() {
        return this.waveColorTwo
            ? `background: ${this.waveColorTwo};`
            : 'background: var(--can-wave-default-two);';
    }

    // --- Navigation ---------------------------------------------------------------------------

    openContactRecord() {
        if (!this.contactId) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: this.contactId, objectApiName: 'Contact', actionName: 'view' }
        });
    }

    // --- Image replacement (file mode) --------------------------------------------------------

    openFilePicker(event) {
        if (!this.allowImageReplace || !this.contactId || this.isUploading) return;
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
                title: this.labels.toastError, message: this.labels.uploadMaxSize, variant: 'error'
            }));
            return;
        }
        this.isUploading = true;
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            replaceRecordImage({
                recordId: this.contactId,
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
                        title: this.labels.toastError, message: msg, variant: 'error', mode: 'sticky'
                    }));
                });
        };
        reader.readAsDataURL(file);
    }

    // --- Einstein prompt summary (optional) ---------------------------------------------------

    get showPromptButton() {
        return this.isPromptSummaryEnabled && !this.promptStarted;
    }
    get showPromptPanel() {
        return this.isPromptSummaryEnabled && this.promptStarted;
    }
    get resolvedPromptButtonLabel() {
        return this.promptButtonLabel || this.labels.summarizeBtn;
    }

    handleSummarizeClick() { this.runPromptSummary(); }

    runPromptSummary() {
        if (!this.contactId || !this.promptTemplateApiName || !this.promptInputApiName) return;
        this.promptStarted = true;
        this.isPromptRunning = true;
        this.promptText = '';
        getPromptSummary({
            recordId: this.contactId,
            promptTemplateApiName: this.promptTemplateApiName,
            inputApiName: this.promptInputApiName
        })
            .then(text => {
                this.promptText = (text && text.trim()) ? text : this.labels.summarizeEmpty;
            })
            .catch(() => {
                this.promptText = this.labels.summarizeError;
            })
            .finally(() => {
                this.isPromptRunning = false;
            });
    }
}
