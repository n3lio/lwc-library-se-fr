import { LightningElement, api, wire } from 'lwc';
import { getRecord, getFieldValue, updateRecord, deleteRecord } from 'lightning/uiRecordApi';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import STATE_FIELD from '@salesforce/schema/Visit__c.VisitState__c';
import ID_FIELD from '@salesforce/schema/Visit__c.Id';
import CHECKIN_FIELD from '@salesforce/schema/Visit__c.CheckInDateTime__c';
import CHECKOUT_FIELD from '@salesforce/schema/Visit__c.CheckOutDateTime__c';
import LAST_MOD_FIELD from '@salesforce/schema/Visit__c.LastModifiedDate';

/**
 * CCO FR - Visit Plan
 * Checklist dynamique "Plan d'action" sur une Visit__c :
 *   - Démarrer / Terminer la visite (updateRecord sur VisitState__c + CheckIn/Out)
 *   - Progress bar avec N étapes (par défaut : Check-in, Relevé linéaire, Relevé produits, Commande, Compte-rendu)
 *   - Chaque étape cliquable : check-in déclenche l'update réel, summary ouvre le Flow CCO_FR_End_Visit,
 *     les autres sont toggle-able manuellement (progression locale persistée en localStorage).
 *   - Timer "temps écoulé depuis le check-in" quand VisitState = 'In Progress'.
 *
 * Bilingue FR/EN via la property `language`.
 */

const TICK_MS = 30000;
const PROGRESS_POLL_MS = 2000;
const STORAGE_PREFIX = 'sefr-visit-progress::';
const END_VISIT_FLOW = 'CCO_FR_End_Visit';

const STATE_PLANNED = 'Planned';
const STATE_IN_PROGRESS = 'In Progress'; // valeur picklist VisitState__c (avec espace)
const STATE_COMPLETED = 'Completed';

const DICT = {
    fr: {
        cardTitle: 'Visite',
        statusPlanned: 'Planifiée',
        statusDone: 'Terminée',
        timerAria: 'Temps écoulé depuis le démarrage',
        btnStart: 'Démarrer la visite',
        btnEnd: 'Terminer la visite',
        btnCancel: 'Annuler',
        helpCannotEnd: 'Complétez les tâches obligatoires avant de terminer.',
        completedTitle: 'Visite clôturée',
        completedAt: 'Clôturée à ',
        doneAtPrefix: 'Fait à ',
        checklistTitle: "Plan d'action",
        toastStartedTitle: 'Visite démarrée',
        toastStartedMsg: 'Check-in horodaté. Enchaînez avec les relevés.',
        toastEndedTitle: 'Visite clôturée',
        toastEndedMsg: 'Compte-rendu déjà saisi — visite passée en statut Terminée.',
        toastErrTitle: 'Erreur',
        toastErrStart: 'Impossible de démarrer la visite.',
        toastErrReopen: 'Impossible de rouvrir la visite.',
        toastReopenTitle: 'Visite rouverte',
        toastReopenMsg: 'Statut repassé à En cours. Continuez le compte-rendu.',
        btnReopen: 'Rouvrir la visite',
        toastErrEnd: 'Impossible de clôturer la visite.',
        toastErrCancel: "Erreur lors de l'annulation.",
        toastCancelTitle: 'Visite annulée',
        toastCancelMsg: 'Le record de visite a été supprimé.',
        toastStepTitle: 'Étape enregistrée',
        toastStepCheckin: 'Check-in noté.',
        toastStepSummary: 'Compte-rendu enregistré.',
        modalCancelTitle: 'Annuler la visite ?',
        modalCancelBody1: 'La visite sera ',
        modalCancelBodyStrong: 'supprimée définitivement',
        modalCancelBody2: " ainsi que les saisies en cours (relevés, panier). Cette action est irréversible.",
        modalCancelKeep: 'Non, garder',
        modalCancelConfirm: 'Oui, supprimer la visite',
        modalCancelDeleting: 'Suppression…',
        modalCloseAria: 'Fermer',
        flowSummaryTitle: 'Compte-rendu de visite',
        steps: {
            checkin:  { title: 'Check-in magasin', hint: 'Confirmez votre arrivée' },
            shelf:    { title: 'Relevé linéaire',  hint: 'Facings vs concurrence' },
            products: { title: 'Relevé produits',  hint: 'Présence & prix planogramme' },
            order:    { title: 'Commande',         hint: 'Si réassort ou implantation' },
            summary:  { title: 'Compte-rendu',     hint: 'Photos + CR vocal' }
        }
    },
    en: {
        cardTitle: 'Visit',
        statusPlanned: 'Planned',
        statusDone: 'Completed',
        timerAria: 'Elapsed time since start',
        btnStart: 'Start visit',
        btnEnd: 'End visit',
        btnCancel: 'Cancel',
        helpCannotEnd: 'Complete the required tasks before ending.',
        completedTitle: 'Visit closed',
        completedAt: 'Closed at ',
        doneAtPrefix: 'Done at ',
        checklistTitle: 'Action plan',
        toastStartedTitle: 'Visit started',
        toastStartedMsg: 'Check-in timestamped. Carry on with the audits.',
        toastEndedTitle: 'Visit closed',
        toastEndedMsg: 'Summary already saved — visit moved to Completed.',
        toastErrTitle: 'Error',
        toastErrStart: 'Unable to start the visit.',
        toastErrEnd: 'Unable to close the visit.',
        toastErrCancel: 'Error while cancelling.',
        toastErrReopen: 'Unable to reopen the visit.',
        toastReopenTitle: 'Visit reopened',
        toastReopenMsg: 'Status back to In Progress. Carry on with the summary.',
        btnReopen: 'Reopen the visit',
        toastCancelTitle: 'Visit cancelled',
        toastCancelMsg: 'The visit record was deleted.',
        toastStepTitle: 'Step saved',
        toastStepCheckin: 'Check-in logged.',
        toastStepSummary: 'Summary saved.',
        modalCancelTitle: 'Cancel this visit?',
        modalCancelBody1: 'The visit will be ',
        modalCancelBodyStrong: 'permanently deleted',
        modalCancelBody2: ' along with in-progress inputs (audits, cart). This cannot be undone.',
        modalCancelKeep: 'No, keep',
        modalCancelConfirm: 'Yes, delete the visit',
        modalCancelDeleting: 'Deleting…',
        modalCloseAria: 'Close',
        flowSummaryTitle: 'Visit summary',
        steps: {
            checkin:  { title: 'Store check-in',   hint: 'Confirm your arrival' },
            shelf:    { title: 'Shelf audit',      hint: 'Facings vs competition' },
            products: { title: 'Product audit',    hint: 'Presence & planogram prices' },
            order:    { title: 'Order',            hint: 'If reassort or implantation' },
            summary:  { title: 'Visit summary',    hint: 'Photos + voice note' }
        }
    }
};

const STEP_KEYS = [
    { key: 'checkin',  mandatory: true,  actionable: true  },
    { key: 'shelf',    mandatory: true,  actionable: false },
    { key: 'products', mandatory: true,  actionable: false },
    { key: 'order',    mandatory: false, actionable: false },
    { key: 'summary',  mandatory: true,  actionable: true  }
];

export default class SeFrVisitPlan extends NavigationMixin(LightningElement) {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:task';

    visitState;
    checkInAt;
    checkOutAt;
    lastModified;
    isLoading = false;
    isDeleting = false;
    elapsedTime = '0 min';
    _tickHandle;
    _progressPollHandle;
    _progressSnapshot = '';
    _progress = {};

    showCancelDialog = false;
    flowOpen = false;
    flowApiName;
    flowTitle = '';
    flowInputs = [];

    // ---------- Wire ----------
    @wire(getRecord, {
        recordId: '$recordId',
        fields: [STATE_FIELD, CHECKIN_FIELD, CHECKOUT_FIELD, LAST_MOD_FIELD]
    })
    wiredVisit({ data }) {
        if (data) {
            this.visitState = getFieldValue(data, STATE_FIELD);
            this.checkInAt = getFieldValue(data, CHECKIN_FIELD);
            this.checkOutAt = getFieldValue(data, CHECKOUT_FIELD);
            this.lastModified = getFieldValue(data, LAST_MOD_FIELD);
            this.refreshTimer();
            this._syncDerivedSteps();
        }
    }

    /**
     * Dérive les cases cochées à partir des champs Visit__c :
     *   - checkin : coché si CheckInDateTime__c renseigné
     *   - summary : coché si VisitState = Completed OU CheckOutDateTime__c renseigné
     */
    _syncDerivedSteps() {
        // checkin : coché UNIQUEMENT quand CheckInDateTime__c est renseigné (donc après action
        // explicite du vendeur dans l'onglet Check-in). On ne touche PAS à summary ici — c'est
        // au compte-rendu (note vocale / IA) de signaler sa complétion.
        if (this.checkInAt && !this._progress.checkin?.done) {
            this._progress.checkin = { done: true, at: this.checkInAt };
            this._saveProgress();
            this._progress = { ...this._progress };
        }
    }

    connectedCallback() {
        this._tickHandle = setInterval(() => this.refreshTimer(), TICK_MS);
        this._loadProgress();
        this._progressPollHandle = setInterval(() => this._pollProgress(), PROGRESS_POLL_MS);
    }

    disconnectedCallback() {
        if (this._tickHandle) clearInterval(this._tickHandle);
        if (this._progressPollHandle) clearInterval(this._progressPollHandle);
    }

    _pollProgress() {
        if (!this.recordId) return;
        try {
            const raw = window.localStorage.getItem(this._storageKey()) || '';
            if (raw !== this._progressSnapshot) {
                this._progressSnapshot = raw;
                this._progress = raw ? JSON.parse(raw) : {};
            }
        } catch (e) { /* ignore */ }
    }

    _storageKey() {
        return STORAGE_PREFIX + this.recordId;
    }

    _loadProgress() {
        if (!this.recordId) return;
        try {
            const raw = window.localStorage.getItem(this._storageKey()) || '';
            this._progressSnapshot = raw;
            this._progress = raw ? JSON.parse(raw) : {};
        } catch (e) {
            this._progress = {};
        }
    }

    _saveProgress() {
        try {
            window.localStorage.setItem(this._storageKey(), JSON.stringify(this._progress));
        } catch (e) { /* ignore quota */ }
    }

    _markStep(stepKey, done) {
        if (done) {
            this._progress[stepKey] = { done: true, at: new Date().toISOString() };
        } else {
            delete this._progress[stepKey];
        }
        this._saveProgress();
        this._progressSnapshot = window.localStorage.getItem(this._storageKey()) || '';
    }

    // ---------- Dict ----------
    get labels() {
        return DICT[this.language === 'en' ? 'en' : 'fr'];
    }
    get effectiveTitle() {
        return this.cardTitle && this.cardTitle.trim() ? this.cardTitle : this.labels.cardTitle;
    }

    // ---------- Status helpers ----------
    get isPlanned()    { return this.visitState === STATE_PLANNED; }
    get isInProgress() { return this.visitState === STATE_IN_PROGRESS; }
    get isCompleted()  { return this.visitState === STATE_COMPLETED; }

    // ---------- Steps ----------
    get steps() {
        const dict = this.labels.steps;
        return STEP_KEYS.map(def => {
            const state = this._progress[def.key];
            const done = !!(state && state.done);
            const doneAt = done && state.at ? this._formatTime(state.at) : '';
            const def2 = dict[def.key] || { title: def.key, hint: '' };
            return {
                key: def.key,
                title: def2.title,
                hint: def2.hint,
                mandatory: def.mandatory,
                actionable: def.actionable,
                done,
                doneAt: doneAt ? this.labels.doneAtPrefix + doneAt : '',
                itemClass: 'sefrvp-checklist__item'
                    + (done ? ' sefrvp-checklist__item--done' : '')
                    + (def.actionable ? ' sefrvp-checklist__item--actionable' : ' sefrvp-checklist__item--passive')
            };
        });
    }

    get doneCount() {
        return STEP_KEYS.filter(s => this._progress[s.key]?.done).length;
    }
    get totalCount() {
        return STEP_KEYS.length;
    }
    get progressStyle() {
        const pct = Math.round((this.doneCount / this.totalCount) * 100);
        return `width: ${pct}%;`;
    }
    get cannotEnd() {
        return STEP_KEYS.filter(s => s.mandatory).some(s => !this._progress[s.key]?.done);
    }

    // ---------- Timer ----------
    refreshTimer() {
        if (!this.isInProgress) {
            this.elapsedTime = '0 min';
            return;
        }
        const startStr = this.checkInAt || this.lastModified;
        if (!startStr) { this.elapsedTime = '—'; return; }
        const diffMin = Math.max(0, Math.floor((Date.now() - new Date(startStr).getTime()) / 60000));
        this.elapsedTime = diffMin < 60
            ? `${diffMin} min`
            : `${Math.floor(diffMin / 60)}h${(diffMin % 60).toString().padStart(2, '0')}`;
    }

    get completedSummary() {
        const endStr = this.checkOutAt || this.lastModified;
        if (!endStr) return '';
        return this.labels.completedAt + this._formatTime(endStr);
    }

    _formatTime(iso) {
        const d = new Date(iso);
        return `${d.getHours().toString().padStart(2, '0')}h${d.getMinutes().toString().padStart(2, '0')}`;
    }

    // ---------- Actions ----------
    async handleStartVisit() {
        if (this.isCompleted || this.isLoading) return;
        this.isLoading = true;
        try {
            const fields = {};
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields[STATE_FIELD.fieldApiName] = STATE_IN_PROGRESS;
            // On ne renseigne PAS CheckInDateTime__c ici : le check-in reste à confirmer
            // explicitement par le vendeur depuis l'onglet Check-in (seFrVisitCheckIn).
            await updateRecord({ fields });
            this.visitState = STATE_IN_PROGRESS;
            this.refreshTimer();
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastStartedTitle,
                message: this.labels.toastStartedMsg,
                variant: 'success'
            }));
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastErrTitle,
                message: error.body?.message || this.labels.toastErrStart,
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    async handleReopenVisit() {
        if (!this.isCompleted || this.isLoading) return;
        this.isLoading = true;
        try {
            const fields = {};
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields[STATE_FIELD.fieldApiName] = STATE_IN_PROGRESS;
            fields[CHECKOUT_FIELD.fieldApiName] = null;
            await updateRecord({ fields });
            this.visitState = STATE_IN_PROGRESS;
            this.checkOutAt = null;
            // On décoche également summary pour laisser le vendeur refaire son CR.
            if (this._progress.summary?.done) {
                delete this._progress.summary;
                this._saveProgress();
                this._progress = { ...this._progress };
            }
            this.refreshTimer();
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastReopenTitle,
                message: this.labels.toastReopenMsg,
                variant: 'success'
            }));
        } catch (error) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastErrTitle,
                message: error.body?.message || this.labels.toastErrReopen,
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    handleCancelClick() {
        if (!this.isPlanned || this.isDeleting) return;
        this.showCancelDialog = true;
    }
    handleCancelDismiss() {
        this.showCancelDialog = false;
    }
    async handleCancelConfirm() {
        if (this.isDeleting) return;
        this.isDeleting = true;
        try {
            await deleteRecord(this.recordId);
            try {
                window.localStorage.removeItem(this._storageKey());
            } catch (e) { /* ignore */ }
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastCancelTitle,
                message: this.labels.toastCancelMsg,
                variant: 'success'
            }));
            this.showCancelDialog = false;
            this[NavigationMixin.Navigate]({ type: 'standard__namedPage', attributes: { pageName: 'home' } });
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastErrTitle,
                message: e.body?.message || e.message || this.labels.toastErrCancel,
                variant: 'error'
            }));
        } finally {
            this.isDeleting = false;
        }
    }

    /**
     * Clic sur une étape — SEULES les étapes actionable répondent :
     *  - checkin : si Planned → démarre la visite (même action que le bouton principal).
     *  - summary : ouvre le Flow CCO_FR_End_Visit.
     *  - shelf / products / order : no-op. Elles se cochent automatiquement quand les
     *    composants dédiés (seFrVisitShelfCompliance, seFrVisitProductCheck, seFrOrderEntry)
     *    publient leur progression dans la même clé localStorage.
     */
    handleStepClick(event) {
        const key = event.currentTarget.dataset.key;
        // Toutes les étapes du plan dispatchent un évent 'navigate-tab' pour que la Record Page
        // (parent / page conteneur) switch sur l'onglet correspondant. Les composants dédiés
        // dans chaque onglet se chargent du save + publication localStorage de la step.
        this.dispatchEvent(new CustomEvent('navigatetab', {
            detail: { step: key },
            bubbles: true,
            composed: true
        }));
        // Fallback : si la page n'écoute pas (ex. pas de tabset), on garde le comportement
        // minimal pour l'étape checkin : démarre la visite si elle est encore Planned.
        if (key === 'checkin' && this.isPlanned) {
            this.handleStartVisit();
        }
    }

    async handleEndVisit() {
        if (this.cannotEnd || this.isLoading) return;
        const summaryDone = !!(this._progress.summary && this._progress.summary.done);
        if (!summaryDone) {
            // Avant de clôturer, on invite le vendeur à finir son compte-rendu.
            this.dispatchEvent(new CustomEvent('navigatetab', {
                detail: { step: 'summary' },
                bubbles: true,
                composed: true
            }));
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.flowSummaryTitle,
                message: this.labels.helpCannotEnd,
                variant: 'warning'
            }));
            return;
        }
        this.isLoading = true;
        try {
            const nowIso = new Date().toISOString();
            const fields = {};
            fields[ID_FIELD.fieldApiName] = this.recordId;
            fields[STATE_FIELD.fieldApiName] = STATE_COMPLETED;
            fields[CHECKOUT_FIELD.fieldApiName] = nowIso;
            await updateRecord({ fields });
            this.visitState = STATE_COMPLETED;
            this.checkOutAt = nowIso;
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastEndedTitle,
                message: this.labels.toastEndedMsg,
                variant: 'success'
            }));
        } catch (e) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastErrTitle,
                message: e.body?.message || e.message || this.labels.toastErrEnd,
                variant: 'error'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    // ---------- Modal Flow ----------
    _openFlow(apiName, title) {
        this.flowApiName = apiName;
        this.flowTitle = title;
        this.flowInputs = [
            { name: 'recordId', type: 'String', value: this.recordId }
        ];
        this.flowOpen = true;
        try { document.body.style.overflow = 'hidden'; } catch (e) { /* ignore */ }
    }

    handleCloseFlow() {
        this.flowOpen = false;
        this.flowApiName = null;
        try { document.body.style.overflow = ''; } catch (e) { /* ignore */ }
    }

    handleFlowStatusChange(event) {
        const status = event.detail.status;
        if (status === 'FINISHED' || status === 'FINISHED_SCREEN') {
            const stepKey = this.flowApiName === END_VISIT_FLOW ? 'summary' : null;
            if (stepKey) {
                this._markStep(stepKey, true);
                this._progress = { ...this._progress };
            }
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.handleCloseFlow();
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastStepTitle,
                    message: this.labels.toastStepSummary,
                    variant: 'success'
                }));
            }, 1200);
        }
    }
}
