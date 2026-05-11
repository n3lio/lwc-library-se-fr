import { LightningElement, api, wire, track } from 'lwc';
import { getRecord, updateRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

// Per-object default channel maps.
// Contact / Lead have the three standard opt-out fields built in; Account does NOT, so the
// default for Account is empty — the SE maps their own custom fields via channelsCsv.
const DEFAULTS_BY_OBJECT_EN = {
    Contact: 'Email|HasOptedOutOfEmail|true,Phone|DoNotCall|true,WhatsApp|HasOptedOutOfFax|true',
    Lead:    'Email|HasOptedOutOfEmail|true,Phone|DoNotCall|true,WhatsApp|HasOptedOutOfFax|true',
    Account: ''
};
const DEFAULTS_BY_OBJECT_FR = {
    Contact: 'E-mail|HasOptedOutOfEmail|true,Téléphone|DoNotCall|true,WhatsApp|HasOptedOutOfFax|true',
    Lead:    'E-mail|HasOptedOutOfEmail|true,Téléphone|DoNotCall|true,WhatsApp|HasOptedOutOfFax|true',
    Account: ''
};

const LABELS = {
    en: {
        cardTitle: 'Contact Preferences & GDPR',
        toggleActive: 'Allowed',
        toggleInactive: 'Refused',
        successMessage: 'Contact preferences updated.',
        errorMessage: 'Update failed.',
        toastSuccessTitle: 'Success',
        toastErrorTitle: 'Error',
        loading: 'Loading',
        needsMapping: 'No contact preferences set yet.'
    },
    fr: {
        cardTitle: 'Préférences de contact & RGPD',
        toggleActive: 'Autorisé',
        toggleInactive: 'Refusé',
        successMessage: 'Préférences de contact mises à jour.',
        errorMessage: 'Échec de la mise à jour.',
        toastSuccessTitle: 'Succès',
        toastErrorTitle: 'Erreur',
        loading: 'Chargement',
        needsMapping: 'Aucune préférence de contact renseignée.'
    }
};

// Extracts a readable message from a DML/UI API error. Salesforce wraps the reason in several
// possible places depending on the failure (field-level error vs. UI-API error vs. server error).
function extractErrorMessage(err, fallback) {
    if (!err) return fallback;
    const body = err.body;
    if (!body) return err.message || fallback;
    // Field-level output.errors (most granular — used for invalid field / missing access)
    if (body.output && Array.isArray(body.output.errors) && body.output.errors.length) {
        return body.output.errors.map(e => e.message).join(' — ');
    }
    // Field-level output.fieldErrors (legacy)
    if (body.output && body.output.fieldErrors) {
        const msgs = [];
        for (const key of Object.keys(body.output.fieldErrors)) {
            for (const fe of body.output.fieldErrors[key]) msgs.push(fe.message);
        }
        if (msgs.length) return msgs.join(' — ');
    }
    if (typeof body.message === 'string' && body.message) return body.message;
    return fallback;
}

function parseChannels(csv) {
    if (!csv) return [];
    return csv.split(',').map((row, i) => {
        const parts = row.split('|').map(p => p.trim());
        const label = parts[0] || '';
        const fieldApiName = parts[1] || '';
        const inverted = (parts[2] || 'false').toLowerCase() === 'true';
        return label && fieldApiName ? { key: `ch${i}`, label, fieldApiName, inverted } : null;
    }).filter(Boolean);
}

export default class SeFrConsentManager extends LightningElement {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:task2';
    @api channelsCsv;
    @api toggleActiveLabel;
    @api toggleInactiveLabel;
    @api successMessage;
    @api errorMessage;

    @track isLoading = false;
    @track channelStates = {};

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedChannelsCsv() {
        if (this.channelsCsv) return this.channelsCsv;
        const map = this.language === 'fr' ? DEFAULTS_BY_OBJECT_FR : DEFAULTS_BY_OBJECT_EN;
        return map[this.objectApiName] || '';
    }
    get needsMapping() {
        return !this.channelsCsv && !(DEFAULTS_BY_OBJECT_EN[this.objectApiName]);
    }
    get needsMappingMessage() {
        return this.labels.needsMapping.replace('{object}', this.objectApiName || '');
    }
    get resolvedToggleActive() { return this.toggleActiveLabel || this.labels.toggleActive; }
    get resolvedToggleInactive() { return this.toggleInactiveLabel || this.labels.toggleInactive; }
    get resolvedSuccessMessage() { return this.successMessage || this.labels.successMessage; }
    get resolvedErrorMessage() { return this.errorMessage || this.labels.errorMessage; }
    get loadingText() { return this.labels.loading; }

    get channels() {
        return parseChannels(this.resolvedChannelsCsv);
    }

    get channelFieldsForWire() {
        const prefix = this.objectApiName || 'Contact';
        return this.channels.map(c => `${prefix}.${c.fieldApiName}`);
    }

    get displayChannels() {
        return this.channels.map(c => ({
            ...c,
            checked: !!this.channelStates[c.fieldApiName]
        }));
    }

    get colClass() {
        const n = this.channels.length || 1;
        if (n === 1) return 'slds-col slds-size_1-of-1 slds-text-align_center slds-p-vertical_x-small';
        if (n === 2) return 'slds-col slds-size_1-of-2 slds-text-align_center slds-p-vertical_x-small';
        if (n === 3) return 'slds-col slds-size_1-of-3 slds-text-align_center slds-p-vertical_x-small';
        if (n === 4) return 'slds-col slds-size_1-of-2 slds-medium-size_1-of-4 slds-text-align_center slds-p-vertical_x-small';
        return 'slds-col slds-size_1-of-2 slds-medium-size_1-of-3 slds-text-align_center slds-p-vertical_x-small';
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$channelFieldsForWire' })
    wiredRecord({ data, error }) {
        if (data) {
            const next = {};
            for (const c of this.channels) {
                const raw = data.fields && data.fields[c.fieldApiName] ? data.fields[c.fieldApiName].value : false;
                next[c.fieldApiName] = c.inverted ? !raw : !!raw;
            }
            this.channelStates = next;
        } else if (error) {
            // eslint-disable-next-line no-console
            console.error('seFrConsentManager — failed to load consent fields', error);
        }
    }

    handleToggleChange(event) {
        const fieldApiName = event.target.dataset.field;
        const invertedAttr = event.target.dataset.inverted === 'true';
        const isOptedIn = event.target.checked;

        const fields = { Id: this.recordId };
        fields[fieldApiName] = invertedAttr ? !isOptedIn : isOptedIn;

        this.isLoading = true;
        updateRecord({ fields })
            .then(() => {
                this.channelStates = { ...this.channelStates, [fieldApiName]: isOptedIn };
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastSuccessTitle,
                    message: this.resolvedSuccessMessage,
                    variant: 'success'
                }));
            })
            .catch(err => {
                event.target.checked = !isOptedIn;
                // eslint-disable-next-line no-console
                console.error('seFrConsentManager — updateRecord failed', err);
                const detail = extractErrorMessage(err, this.resolvedErrorMessage);
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastErrorTitle,
                    message: `${this.resolvedErrorMessage} ${detail && detail !== this.resolvedErrorMessage ? '— ' + detail : ''}`.trim(),
                    variant: 'error',
                    mode: 'sticky'
                }));
            })
            .finally(() => {
                this.isLoading = false;
            });
    }
}
