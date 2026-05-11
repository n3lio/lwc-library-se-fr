import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getPipeline from '@salesforce/apex/SE_FR_PipelineSnapshotController.getPipeline';

const LABELS = {
    en: {
        cardTitle: 'Pipeline Snapshot',
        totalPipeline: 'Total pipeline',
        weightedTotal: 'Weighted',
        opportunities: 'Opps',
        empty: 'No open opportunity for this customer.',
        refresh: 'Refresh',
        newOpp: 'New opportunity',
        uncategorised: 'Other',
        // Mapping EN -> default Stage picklist tiles (keys stay English so data flows work in both languages)
        columns: {
            Prospecting: 'Prospecting',
            Qualification: 'Qualification',
            'Needs Analysis': 'Needs Analysis',
            'Value Proposition': 'Value Proposition',
            'Id. Decision Makers': 'Decision Makers',
            'Perception Analysis': 'Perception Analysis',
            'Proposal/Price Quote': 'Proposal',
            'Negotiation/Review': 'Negotiation',
            'Closed Won': 'Closed Won',
            'Closed Lost': 'Closed Lost'
        }
    },
    fr: {
        cardTitle: 'Aperçu du pipeline',
        totalPipeline: 'Pipeline total',
        weightedTotal: 'Pondéré',
        opportunities: 'Opps',
        empty: "Aucune opportunité ouverte pour ce client.",
        refresh: 'Actualiser',
        newOpp: 'Nouvelle opportunité',
        uncategorised: 'Autre',
        columns: {
            Prospecting: 'Prospection',
            Qualification: 'Qualification',
            'Needs Analysis': 'Analyse des besoins',
            'Value Proposition': 'Proposition de valeur',
            'Id. Decision Makers': 'Décideurs',
            'Perception Analysis': 'Analyse de perception',
            'Proposal/Price Quote': 'Proposition',
            'Negotiation/Review': 'Négociation',
            'Closed Won': 'Gagnée',
            'Closed Lost': 'Perdue'
        }
    }
};

// Consistent colour per stage. Maps lowercase raw StageName → hex. Falls back to neutral.
const STAGE_COLORS = {
    'prospecting':          '#7f8ceb',
    'qualification':        '#0176d3',
    'needs analysis':       '#0176d3',
    'value proposition':    '#2e844a',
    'id. decision makers':  '#2e844a',
    'perception analysis':  '#fe9339',
    'proposal/price quote': '#fe9339',
    'negotiation/review':   '#c13975',
    'closed won':           '#2e844a',
    'closed lost':          '#747474'
};

export default class SeFrPipelineSnapshot extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:opportunity';
    @api currencyCode = 'EUR';
    @api localeTag = 'fr-FR';
    @api limitCount = 40;
    @api includeClosed = false;
    @api hideNewOppButton = false;

    wiredResult;
    @track rawOpps = [];

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    @wire(getPipeline, {
        recordId: '$recordId',
        objectApiName: '$objectApiName',
        limitCount: '$limitCount',
        includeClosed: '$includeClosed'
    })
    wiredPipeline(result) {
        this.wiredResult = result;
        if (result.data) this.rawOpps = result.data;
    }

    // Column = one per Stage present in the data. Keeps natural ordering: first CloseDate ASC, so
    // columns ordered by "first opp close date" — usually matches forecasted pipeline progression.
    get columns() {
        const byStage = new Map();
        for (const o of (this.rawOpps || [])) {
            const stage = o.StageName || this.labels.uncategorised;
            if (!byStage.has(stage)) byStage.set(stage, []);
            byStage.get(stage).push(o);
        }
        const dict = this.labels.columns;
        return Array.from(byStage.entries()).map(([stage, opps]) => {
            const total = opps.reduce((s, o) => s + (Number(o.Amount) || 0), 0);
            const weighted = opps.reduce((s, o) => s + ((Number(o.Amount) || 0) * ((Number(o.Probability) || 0) / 100)), 0);
            const color = STAGE_COLORS[(stage || '').toLowerCase()] || '#747474';
            return {
                key: stage,
                label: dict[stage] || stage,
                count: opps.length,
                totalDisplay: this.formatCurrency(total),
                weightedDisplay: this.formatCurrency(weighted),
                accentStyle: `border-top: 3px solid ${color};`,
                opps: opps.map(o => ({
                    id: o.Id,
                    name: o.Name,
                    amount: o.Amount,
                    amountDisplay: this.formatCurrency(o.Amount),
                    probability: o.Probability != null ? `${o.Probability}%` : '',
                    closeDateDisplay: this.formatDate(o.CloseDate),
                    ownerName: o.Owner && o.Owner.Name,
                    forecastCategory: o.ForecastCategoryName
                }))
            };
        });
    }

    get hasOpps() { return this.rawOpps && this.rawOpps.length > 0; }
    get oppCount() { return this.rawOpps ? this.rawOpps.length : 0; }
    get totalPipelineDisplay() {
        const total = (this.rawOpps || []).reduce((s, o) => s + (Number(o.Amount) || 0), 0);
        return this.formatCurrency(total);
    }
    get weightedPipelineDisplay() {
        const total = (this.rawOpps || []).reduce((s, o) => s + ((Number(o.Amount) || 0) * ((Number(o.Probability) || 0) / 100)), 0);
        return this.formatCurrency(total);
    }

    formatCurrency(v) {
        if (v === null || v === undefined || Number.isNaN(Number(v))) return '';
        return new Intl.NumberFormat(this.localeTag, {
            style: 'currency',
            currency: this.currencyCode,
            maximumFractionDigits: 0
        }).format(Number(v));
    }
    formatDate(iso) {
        if (!iso) return '';
        try { return new Date(iso).toLocaleDateString(this.localeTag, { day: '2-digit', month: 'short' }); }
        catch (e) { return ''; }
    }

    handleRefresh() { if (this.wiredResult) refreshApex(this.wiredResult); }

    handleOppClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: 'Opportunity', actionName: 'view' }
        });
    }

    handleNewOpp() {
        const accountId = this.objectApiName === 'Account' ? this.recordId : null;
        const state = { nooverride: '1' };
        if (accountId) state.defaultFieldValues = `AccountId=${accountId}`;
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Opportunity', actionName: 'new' },
            state
        });
    }
}
