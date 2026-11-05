import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord, getRecordNotifyChange } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import VISIT_STATE_FIELD from '@salesforce/schema/Visit__c.VisitState__c';
import CHECKIN_FIELD from '@salesforce/schema/Visit__c.CheckInDateTime__c';
import CHECKOUT_FIELD from '@salesforce/schema/Visit__c.CheckOutDateTime__c';
import ACCOUNT_FIELD from '@salesforce/schema/Visit__c.Account__c';

const TICK_MS = 30000;

const DICT = {
    fr: {
        cardTitle: 'Check-in / Check-out',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        reopen: 'Rouvrir',
        reopenPlanned: 'Replanifier',
        planned: 'Visite planifiée',
        plannedHint: 'Appuyez sur Check-in à votre arrivée chez le client.',
        inProgress: 'Visite en cours',
        sinceLabel: 'Depuis',
        elapsed: 'Temps écoulé',
        completed: 'Visite clôturée',
        closedOn: 'Visite clôturée le',
        duration: 'Durée',
        cancelled: 'Visite annulée',
        cancelledHint: 'Cette visite a été annulée.',
        loading: 'Chargement...',
        successTitle: 'Succès',
        errorTitle: 'Erreur',
        okCheckIn: 'Check-in enregistré.',
        okCheckOut: 'Check-out enregistré.',
        okReopen: 'Visite rouverte.',
        okReplan: 'Visite replanifiée.',
        errGeneric: 'Impossible de mettre à jour la visite.',
        hourShort: 'h',
        minShort: 'min',
        lessThanMin: 'moins d’1 min'
    },
    en: {
        cardTitle: 'Check-in / Check-out',
        checkIn: 'Check-in',
        checkOut: 'Check-out',
        reopen: 'Reopen',
        reopenPlanned: 'Reschedule',
        planned: 'Visit planned',
        plannedHint: 'Press Check-in when you arrive at the customer site.',
        inProgress: 'Visit in progress',
        sinceLabel: 'Since',
        elapsed: 'Elapsed time',
        completed: 'Visit completed',
        closedOn: 'Visit closed on',
        duration: 'Duration',
        cancelled: 'Visit cancelled',
        cancelledHint: 'This visit has been cancelled.',
        loading: 'Loading...',
        successTitle: 'Success',
        errorTitle: 'Error',
        okCheckIn: 'Check-in recorded.',
        okCheckOut: 'Check-out recorded.',
        okReopen: 'Visit reopened.',
        okReplan: 'Visit rescheduled.',
        errGeneric: 'Unable to update the visit.',
        hourShort: 'h',
        minShort: 'min',
        lessThanMin: 'less than 1 min'
    }
};

export default class SeFrVisitCheckIn extends LightningElement {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:activations';

    visit;
    isSaving = false;
    now = Date.now();
    _timer;

    @wire(getRecord, {
        recordId: '$recordId',
        fields: [VISIT_STATE_FIELD, CHECKIN_FIELD, CHECKOUT_FIELD, ACCOUNT_FIELD]
    })
    wiredVisit({ data, error }) {
        if (data) {
            this.visit = data;
        } else if (error) {
            this.toast(this.t.errorTitle, this.errorMessage(error), 'error');
        }
    }

    connectedCallback() {
        this._timer = setInterval(() => {
            this.now = Date.now();
        }, TICK_MS);
    }

    disconnectedCallback() {
        clearInterval(this._timer);
    }

    get t() { return DICT[this.language] || DICT.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.t.cardTitle; }
    get resolvedCardIcon() { return this.cardIcon || 'standard:activations'; }

    get loaded() { return !!this.visit; }
    get state() { return getFieldValue(this.visit, VISIT_STATE_FIELD); }
    get checkIn() { return getFieldValue(this.visit, CHECKIN_FIELD); }
    get checkOut() { return getFieldValue(this.visit, CHECKOUT_FIELD); }

    get isPlanned() { return this.state === 'Planned' || !this.state; }
    get isInProgress() { return this.state === 'In Progress'; }
    get isCompleted() { return this.state === 'Completed'; }
    get isCancelled() { return this.state === 'Cancelled'; }

    get elapsedText() {
        if (!this.checkIn) return '';
        return this.formatDuration(this.now - new Date(this.checkIn).getTime());
    }
    get durationText() {
        if (!this.checkIn || !this.checkOut) return '';
        return this.formatDuration(new Date(this.checkOut).getTime() - new Date(this.checkIn).getTime());
    }
    get checkInText() { return this.formatDate(this.checkIn, true); }
    get closedOnText() { return this.formatDate(this.checkOut, false); }
    get hasCheckIn() { return !!this.checkIn; }
    get hasDuration() { return !!(this.checkIn && this.checkOut); }

    formatDuration(ms) {
        const totalMin = Math.max(0, Math.floor(ms / 60000));
        if (totalMin < 1) return this.t.lessThanMin;
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return h > 0 ? `${h} ${this.t.hourShort} ${String(m).padStart(2, '0')}` : `${m} ${this.t.minShort}`;
    }

    formatDate(value, timeOnly) {
        if (!value) return '';
        const locale = this.language === 'en' ? 'en-GB' : 'fr-FR';
        const d = new Date(value);
        return timeOnly
            ? d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleString(locale, { dateStyle: 'long', timeStyle: 'short' });
    }

    handleCheckIn() {
        this.save(
            { [VISIT_STATE_FIELD.fieldApiName]: 'In Progress', [CHECKIN_FIELD.fieldApiName]: new Date().toISOString() },
            this.t.okCheckIn,
            { stepsDone: ['checkin'] }
        );
    }
    handleCheckOut() {
        // Checkout = clôture. On ne touche PAS à l'étape summary ici : elle doit être cochée par
        // le vrai compte-rendu (note vocale, résumé IA) depuis l'onglet Compte-rendu.
        this.save(
            { [VISIT_STATE_FIELD.fieldApiName]: 'Completed', [CHECKOUT_FIELD.fieldApiName]: new Date().toISOString() },
            this.t.okCheckOut
        );
    }
    handleReopen() {
        this.save(
            { [VISIT_STATE_FIELD.fieldApiName]: 'In Progress', [CHECKOUT_FIELD.fieldApiName]: null },
            this.t.okReopen
        );
    }
    handleReplan() {
        this.save(
            { [VISIT_STATE_FIELD.fieldApiName]: 'Planned', [CHECKIN_FIELD.fieldApiName]: null, [CHECKOUT_FIELD.fieldApiName]: null },
            this.t.okReplan,
            { stepsRemoved: ['checkin'] }
        );
    }

    async save(changes, okMessage, progress) {
        this.isSaving = true;
        try {
            await updateRecord({ fields: { Id: this.recordId, ...changes } });
            getRecordNotifyChange([{ recordId: this.recordId }]);
            this.now = Date.now();
            this._publishProgress(progress);
            this.toast(this.t.successTitle, okMessage, 'success');
        } catch (e) {
            this.toast(this.t.errorTitle, this.errorMessage(e), 'error');
        } finally {
            this.isSaving = false;
        }
    }

    _publishProgress(progress) {
        if (!this.recordId || !progress) return;
        try {
            const key = 'sefr-visit-progress::' + this.recordId;
            const raw = window.localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            (progress.stepsDone || []).forEach(step => {
                obj[step] = { done: true, at: new Date().toISOString() };
            });
            (progress.stepsRemoved || []).forEach(step => {
                delete obj[step];
            });
            window.localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) { /* ignore */ }
    }

    errorMessage(e) {
        return (e && e.body && (e.body.message || (Array.isArray(e.body) && e.body[0] && e.body[0].message))) || this.t.errGeneric;
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
}
