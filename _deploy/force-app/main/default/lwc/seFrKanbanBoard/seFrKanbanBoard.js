import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getRecords from '@salesforce/apex/SE_FR_KanbanBoardController.getRecords';
import getPicklistValues from '@salesforce/apex/SE_FR_KanbanBoardController.getPicklistValues';
import updateGroupBy from '@salesforce/apex/SE_FR_KanbanBoardController.updateGroupBy';

const LABELS = {
    en: {
        cardTitleFallback: 'Kanban',
        viewLabel: 'Kanban view',
        refresh: 'Refresh',
        empty: 'No records.',
        uncategorised: 'Uncategorised',
        toastMoved: 'Moved',
        toastMovedBody: 'Record moved to "{col}".',
        toastFailed: 'Move failed',
        sum: 'Total',
        showAll: 'Show all ({n})',
        showLess: 'Show less'
    },
    fr: {
        cardTitleFallback: 'Kanban',
        viewLabel: 'vue Kanban',
        refresh: 'Actualiser',
        empty: 'Aucun enregistrement.',
        uncategorised: 'Non catégorisé',
        toastMoved: 'Déplacé',
        toastMovedBody: 'Enregistrement déplacé vers « {col} ».',
        toastFailed: 'Déplacement échoué',
        sum: 'Total',
        showAll: 'Afficher tout ({n})',
        showLess: 'Afficher moins'
    }
};

// Plural object labels per language. Falls back to the raw API name (pluralised with +s) when the
// object isn't in this map — SEs can then override via the cardTitle property.
const OBJECT_LABELS = {
    en: {
        Case: 'Cases', Opportunity: 'Opportunities', Lead: 'Leads',
        Order: 'Orders', Task: 'Tasks', Account: 'Accounts'
    },
    fr: {
        Case: 'Cas', Opportunity: 'Opportunités', Lead: 'Pistes',
        Order: 'Commandes', Task: 'Tâches', Account: 'Comptes'
    }
};

// Accent color per column — cycles through a limited palette so each status gets a distinct hue.
const COLUMN_ACCENTS = ['#0176d3', '#fe9339', '#2e844a', '#c13975', '#7f8ceb', '#747474', '#ba0517', '#008f7a'];

export default class SeFrKanbanBoard extends NavigationMixin(LightningElement) {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:kanban';
    // The host Record Page's own objectApiName is auto-injected by Salesforce when we declare a
    // prop literally named `objectApiName`. That would silently replace our "object to query"
    // with the current page's object (e.g. 'Account' on an Account page). To keep the Kanban's
    // query object independent, we use `sobjectApiName` as the real prop and treat the legacy
    // `objectApiName` prop as a FlexiPage-only alias that ONLY applies when it carries a
    // whitelisted query object.
    @api sobjectApiName = 'Case';

    // Legacy alias — kept so existing FlexiPages with `objectApiName=Case` still deploy. BUT the
    // platform also auto-populates this with the host Record Page's object on a Record Page, which
    // would overwrite our query target. We only cascade into `sobjectApiName` when the incoming
    // value is one of the safe query-only objects (Case/Opportunity/Lead/Order/Task). Account is
    // deliberately excluded here because it is the most common host-page object — to use Account
    // as the Kanban query target, set the new `sobjectApiName` prop explicitly instead.
    _legacyObjectApiName;
    @api
    get objectApiName() { return this._legacyObjectApiName; }
    set objectApiName(v) {
        this._legacyObjectApiName = v;
        const legacyAllowed = new Set(['Case', 'Opportunity', 'Lead', 'Order', 'Task']);
        if (legacyAllowed.has(v)) this.sobjectApiName = v;
    }
    @api groupByField = 'Status';
    @api displayField = 'Subject';
    @api secondaryField = 'Priority';
    @api amountField = '';
    @api filterClause = 'IsClosed = false';
    @api limitCount = 100;
    @api disableDragDrop = false;
    @api currencyCode = 'EUR';
    @api localeTag = 'fr-FR';
    @api maxPerColumn = 6;
    @api recordScopeField = 'AccountId';

    // Salesforce auto-injects the host Record Page's object into `objectApiName`. We use it to
    // auto-switch the scope field on a Contact page: when the SE didn't override the default,
    // `AccountId` becomes `ContactId` so cases / opps / orders link via Contact instead of Account.
    get effectiveRecordScopeField() {
        if (this.objectApiName === 'Contact' && this.recordScopeField === 'AccountId') {
            return 'ContactId';
        }
        return this.recordScopeField;
    }
    // Populated automatically by the platform on a Record Page. Default '' so the @wire fires on
    // first render (undefined reactive params skip the wire). The Apex treats blank as no-scope.
    @api recordId = '';

    @track records = [];
    @track picklistValues = [];
    @track expandedColumns = {};

    get labels() { return LABELS[this.language] || LABELS.en; }

    // Dynamic title: <ObjectPlural> (<Kanban view>) - e.g. 'Cas (vue Kanban)' / 'Cases (Kanban view)'.
    // Explicit cardTitle override always wins.
    get resolvedCardTitle() {
        if (this.cardTitle) return this.cardTitle;
        const objLabels = OBJECT_LABELS[this.language] || OBJECT_LABELS.en;
        const objLabel = objLabels[this.sobjectApiName] || this.sobjectApiName;
        if (!objLabel) return this.labels.cardTitleFallback;
        return `${objLabel} (${this.labels.viewLabel})`;
    }

    // Imperative load — called from connectedCallback and whenever recordId / filters change.
    // This sidesteps any LWC @wire reactivity edge case where a reactive string param transition
    // (undefined → defined, or empty → filled) doesn't re-fire the wire reliably.
    _lastLoadKey;
    loadRecords() {
        const key = [
            this.sobjectApiName, this.groupByField, this.displayField,
            this.secondaryField, this.amountField, this.filterClause,
            this.recordId, this.effectiveRecordScopeField, this.limitCount
        ].join('|');
        if (key === this._lastLoadKey) return;
        this._lastLoadKey = key;
        getRecords({
            objectApiName: this.sobjectApiName,
            groupByField: this.groupByField,
            displayField: this.displayField,
            secondaryField: this.secondaryField,
            amountField: this.amountField,
            filterClause: this.filterClause,
            recordId: this.recordId,
            recordScopeField: this.effectiveRecordScopeField,
            limitCount: this.limitCount
        })
            .then(data => { this.records = data || []; })
            .catch(err => {
                // eslint-disable-next-line no-console
                console.error('[seFrKanbanBoard] getRecords error:', err);
                this.records = [];
            });
    }

    connectedCallback() { this.loadRecords(); }
    renderedCallback() { this.loadRecords(); }

    @wire(getPicklistValues, { objectApiName: '$sobjectApiName', fieldApiName: '$groupByField' })
    wiredPicklist({ data }) { if (data) this.picklistValues = data; }

    // Build columns: first from the picklist values (so empty columns still display),
    // then fold in any extra group values present in the data (custom statuses etc.).
    // Closed-style columns ("Closed", "Closed Won", "Completed", "Done"...) are
    // always pushed to the right edge — visual convention for kanban boards.
    get columns() {
        const byGroup = new Map();
        const keys = [];
        for (const v of this.picklistValues) { byGroup.set(v, []); keys.push(v); }
        for (const r of this.records) {
            const g = r[this.groupByField] || this.labels.uncategorised;
            if (!byGroup.has(g)) { byGroup.set(g, []); keys.push(g); }
            byGroup.get(g).push(r);
        }
        // Reorder: any "closed-ish" status moves to the end while preserving
        // its relative order with other closed statuses.
        const isClosed = (k) => /^(closed|closed won|closed lost|completed|done|won|lost)$/i.test(k || '');
        keys.sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)));
        const cap = Math.max(1, Number(this.maxPerColumn) || 6);
        return keys.map((k, colIdx) => {
            const items = byGroup.get(k) || [];
            const sum = this.amountField ? items.reduce((s, r) => s + (Number(r[this.amountField]) || 0), 0) : null;
            const expanded = !!this.expandedColumns[k];
            const visibleItems = expanded ? items : items.slice(0, cap);
            const canShowAll = items.length > cap;
            const accent = COLUMN_ACCENTS[colIdx % COLUMN_ACCENTS.length];
            const toggleLabel = expanded
                ? this.labels.showLess
                : this.labels.showAll.replace('{n}', items.length);
            return {
                key: k,
                label: k,
                count: items.length,
                accentStyle: `--col-accent: ${accent};`,
                sumDisplay: sum !== null ? this.formatCurrency(sum) : '',
                canShowAll,
                toggleLabel,
                items: visibleItems.map(r => ({
                    id: r.Id,
                    title: r[this.displayField] || '',
                    secondary: this.secondaryField ? (r[this.secondaryField] || '') : '',
                    amount: this.amountField ? Number(r[this.amountField]) : null,
                    amountDisplay: this.amountField ? this.formatCurrency(r[this.amountField]) : ''
                }))
            };
        });
    }

    handleToggleShowAll(event) {
        const key = event.currentTarget.dataset.col;
        if (!key) return;
        this.expandedColumns = {
            ...this.expandedColumns,
            [key]: !this.expandedColumns[key]
        };
    }

    get hasRecords() { return (this.records || []).length > 0; }
    get dragDisabled() { return !!this.disableDragDrop; }
    get dragAttr() { return this.dragDisabled ? null : 'true'; }

    formatCurrency(v) {
        if (v === null || v === undefined || Number.isNaN(Number(v))) return '';
        return new Intl.NumberFormat(this.localeTag, {
            style: 'currency',
            currency: this.currencyCode,
            maximumFractionDigits: 0
        }).format(Number(v));
    }

    handleRefresh() {
        // Invalidate the dedup key so the next loadRecords() re-hits the server.
        this._lastLoadKey = null;
        this.loadRecords();
    }

    handleCardClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: this.sobjectApiName, actionName: 'view' }
        });
    }

    // --------- Drag & drop ---------

    _draggedId;

    handleDragStart(event) {
        if (this.dragDisabled) return;
        this._draggedId = event.currentTarget.dataset.id;
        event.dataTransfer.effectAllowed = 'move';
        // Some browsers refuse the drop without setData being called.
        try { event.dataTransfer.setData('text/plain', this._draggedId); } catch (_) {}
    }

    handleDragOver(event) {
        if (this.dragDisabled) return;
        // dragover MUST call preventDefault to allow the drop, even when
        // we're hovering over a child card inside the column.
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
    }

    async handleDrop(event) {
        if (this.dragDisabled) return;
        event.preventDefault();
        event.stopPropagation();
        // Resolve the target column even when the drop landed on a child
        // element (a card, the column header, the toggle button…). The
        // column data-col lives on the wrapper <div class="kanban-col">.
        const colEl = event.target.closest('[data-col]') || event.currentTarget;
        const newValue = colEl && colEl.dataset.col;
        const recordId = this._draggedId;
        this._draggedId = null;
        if (!recordId || !newValue) return;
        // Optimistic local update so the card moves visually before the
        // server roundtrip completes. If the Apex update fails, we revert.
        const previous = this.records;
        this.records = this.records.map(r =>
            r.Id === recordId ? { ...r, [this.groupByField]: newValue } : r
        );
        try {
            await updateGroupBy({ recordId, groupByField: this.groupByField, newValue });
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastMoved,
                message: this.labels.toastMovedBody.replace('{col}', newValue),
                variant: 'success'
            }));
            // Invalidate the dedup key so the next manual Refresh hits the
            // server. We do NOT auto-reload here — the server can still be
            // in the middle of committing the update and would return stale
            // data, snapping the card back to its old column.
            this._lastLoadKey = null;
        } catch (e) {
            // Revert the optimistic move so the UI matches the org again.
            this.records = previous;
            const msg = (e && e.body && e.body.message) || '';
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.toastFailed, message: msg, variant: 'error', mode: 'sticky'
            }));
        }
    }
}
