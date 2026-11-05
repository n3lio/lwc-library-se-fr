import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRelatedListRecords } from 'lightning/uiRelatedListApi';
import { refreshApex } from '@salesforce/apex';
import { updateRecord } from 'lightning/uiRecordApi';
import SeFrFlowModal from 'c/seFrFlowModal';
import flowExists from '@salesforce/apex/SE_FR_VisitKanbanController.flowExists';

const STATES = ['Planned', 'In Progress', 'Completed', 'Cancelled'];
const ACCENTS = { 'Planned': '#0176d3', 'In Progress': '#fe9339', 'Completed': '#2e844a', 'Cancelled': '#747474' };
const BADGE = {
    'Planned': 'sefrvk-badge-planned',
    'In Progress': 'sefrvk-badge-progress',
    'Completed': 'sefrvk-badge-completed',
    'Cancelled': 'sefrvk-badge-cancelled'
};
const LOC_MAX = 30;

const DICT = {
    fr: {
        title: 'Visites',
        states: { 'Planned': 'Planifiée', 'In Progress': 'En cours', 'Completed': 'Terminée', 'Cancelled': 'Annulée' },
        newVisit: 'Nouvelle visite',
        firstVisit: 'Première visite',
        empty: 'Aucune visite pour ce compte.',
        loading: 'Chargement',
        showMore: 'Voir plus',
        showLess: 'Voir moins',
        noDate: 'Date non planifiée',
        toastOkTitle: 'Visite déplacée',
        toastOkBody: '{name} : {state}',
        toastKoTitle: 'Déplacement impossible',
        toastKoBody: 'La mise à jour a échoué.',
        locale: 'fr-FR'
    },
    en: {
        title: 'Visits',
        states: { 'Planned': 'Planned', 'In Progress': 'In Progress', 'Completed': 'Completed', 'Cancelled': 'Cancelled' },
        newVisit: 'New visit',
        firstVisit: 'First visit',
        empty: 'No visits for this account.',
        loading: 'Loading',
        showMore: 'Show more',
        showLess: 'Show less',
        noDate: 'Not scheduled',
        toastOkTitle: 'Visit moved',
        toastOkBody: '{name}: {state}',
        toastKoTitle: 'Move failed',
        toastKoBody: 'The update failed.',
        locale: 'en-GB'
    }
};

export default class SeFrVisitKanban extends NavigationMixin(LightningElement) {
    @api recordId;
    @api language = 'fr';
    _cardTitle;
    @api
    get cardTitle() { return this._cardTitle || this.t.title; }
    set cardTitle(v) { this._cardTitle = v; }
    @api cardIcon = 'standard:kanban';
    @api limitPerColumn = 5;
    @api startVisitFlowApiName = 'CCO_FR_Start_Visit';

    visits = [];
    isLoaded = false;
    expanded = {};
    overCol = null;
    flowAvailable = false;
    _draggedId;
    _flowChecked;
    _wired;

    get t() { return DICT[this.language] || DICT.fr; }
    get labels() { return this.t; }

    @wire(getRelatedListRecords, {
        parentRecordId: '$recordId',
        relatedListId: 'Visits__r',
        fields: [
            'Visit__c.Id', 'Visit__c.Name', 'Visit__c.PlannedStartDateTime__c',
            'Visit__c.Location__c', 'Visit__c.VisitState__c'
        ],
        sortBy: ['Visit__c.PlannedStartDateTime__c'],
        pageSize: 200
    })
    wiredVisits(result) {
        this._wired = result;
        const { data, error } = result;
        if (data) {
            this.visits = data.records.map(r => ({
                id: r.id,
                name: r.fields.Name.value,
                planned: r.fields.PlannedStartDateTime__c.value,
                location: r.fields.Location__c.value || '',
                state: r.fields.VisitState__c.value || 'Planned'
            }));
            this.isLoaded = true;
        } else if (error) {
            // eslint-disable-next-line no-console
            console.error('[seFrVisitKanban] related list error', error);
            this.visits = [];
            this.isLoaded = true;
        }
    }

    connectedCallback() {
        if (this.startVisitFlowApiName && !this._flowChecked) {
            this._flowChecked = true;
            flowExists({ flowApiName: this.startVisitFlowApiName })
                .then(ok => { this.flowAvailable = !!ok; })
                .catch(() => { this.flowAvailable = false; });
        }
    }

    get isLoading() { return !this.isLoaded; }
    get hasVisits() { return this.visits.length > 0; }
    get showEmpty() { return this.isLoaded && !this.hasVisits; }
    get showFlowButton() { return this.flowAvailable; }

    formatDate(v) {
        if (!v) return this.t.noDate;
        return new Intl.DateTimeFormat(this.t.locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(v));
    }

    truncate(s) {
        return s && s.length > LOC_MAX ? s.slice(0, LOC_MAX - 1) + '…' : s;
    }

    get columns() {
        const cap = Math.max(1, Number(this.limitPerColumn) || 5);
        return STATES.map(state => {
            const all = this.visits.filter(v => v.state === state);
            const open = !!this.expanded[state];
            const shown = open ? all : all.slice(0, cap);
            const toggleLabel = open ? this.t.showLess : this.t.showMore;
            return {
                key: state,
                label: this.t.states[state],
                count: all.length,
                accentStyle: `--col-accent: ${ACCENTS[state]};`,
                cssClass: 'sefrvk-col' + (this.overCol === state ? ' sefrvk-col-over' : ''),
                canToggle: all.length > cap,
                toggleIcon: open ? 'utility:chevronup' : 'utility:chevrondown',
                toggleLabel,
                items: shown.map(v => ({
                    id: v.id,
                    name: v.name,
                    plannedDisplay: this.formatDate(v.planned),
                    location: this.truncate(v.location),
                    locationFull: v.location,
                    stateLabel: this.t.states[state],
                    badgeClass: 'sefrvk-badge ' + BADGE[state]
                }))
            };
        });
    }

    handleToggle(event) {
        const key = event.currentTarget.dataset.col;
        this.expanded = { ...this.expanded, [key]: !this.expanded[key] };
    }

    handleCardClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: 'Visit__c', actionName: 'view' }
        });
    }

    async handleLaunchFlow() {
        const result = await SeFrFlowModal.open({
            size: 'medium',
            label: this.t.newVisit,
            flowApiName: this.startVisitFlowApiName,
            recordId: this.recordId,
            modalTitle: this.t.newVisit
        });
        if (result && result.status && result.status.startsWith('FINISHED')) {
            // A Flow does not invalidate the related-list wire cache; refresh explicitly.
            refreshApex(this._wired);
        }
    }

    // --------- Drag & drop (native HTML5) ---------
    handleDragStart(event) {
        this._draggedId = event.currentTarget.dataset.id;
        event.dataTransfer.effectAllowed = 'move';
        try { event.dataTransfer.setData('text/plain', this._draggedId); } catch (e) { /* noop */ }
    }
    handleDragEnd() { this._draggedId = null; this.overCol = null; }
    handleDragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const col = event.currentTarget.dataset.col;
        if (this.overCol !== col) this.overCol = col;
    }
    handleDragLeave(event) {
        if (this.overCol === event.currentTarget.dataset.col) this.overCol = null;
    }

    async handleDrop(event) {
        event.preventDefault();
        const newState = event.currentTarget.dataset.col;
        const id = this._draggedId;
        this._draggedId = null;
        this.overCol = null;
        const visit = this.visits.find(v => v.id === id);
        if (!visit || !newState || visit.state === newState) return;
        const previous = this.visits;
        this.visits = this.visits.map(v => (v.id === id ? { ...v, state: newState } : v));
        try {
            await updateRecord({ fields: { Id: id, VisitState__c: newState } });
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastOkTitle,
                message: this.t.toastOkBody.replace('{name}', visit.name).replace('{state}', this.t.states[newState]),
                variant: 'success'
            }));
        } catch (e) {
            this.visits = previous;
            const detail = (e && e.body && e.body.message) || this.t.toastKoBody;
            this.dispatchEvent(new ShowToastEvent({ title: this.t.toastKoTitle, message: detail, variant: 'error', mode: 'sticky' }));
        }
    }
}
