import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import getActivityFeed from '@salesforce/apex/SE_FR_ActivityFeedController.getActivityFeed';

const TYPE_KEYS = [
    'Task', 'Event', 'Email', 'EmailMessage', 'ListEmail', 'Call', 'VoiceCall',
    'MessagingSession', 'LiveChatTranscript', 'Cadence', 'Order', 'Case',
    'Opportunity', 'Quote', 'Contract', 'Visit', 'File', 'FeedItem', 'SurveyResponse'
];
const DATE_KEYS = ['all', 'next7', 'past7', 'past30'];

const LABELS = {
    en: {
        cardTitle: 'Activity Feed',
        filtersButton: 'Filters',
        refresh: 'Refresh',
        expandAll: 'Expand all',
        collapseAll: 'Collapse all',
        filtersSummary: 'Filters',
        itemsSuffix: 'item(s)',
        dateRange: 'Date range',
        activityTypes: 'Activity types',
        selectAll: 'Select all',
        clear: 'Clear',
        sort: 'Sort',
        newestFirst: 'Newest first',
        oldestFirst: 'Oldest first',
        emptyState: 'No activity in the selected range.',
        upcomingGroup: 'Upcoming & pending',
        noDateGroup: 'No date',
        owner: 'Owner',
        related: 'Related',
        toggle: 'Toggle',
        showAll: 'Show more ({n} more)',
        showLess: 'Show less',
        allTypesSummary: 'All types',
        typesSingular: 'type',
        typesPlural: 'types',
        types: {
            Task: 'Tasks', Event: 'Events', Email: 'Emails (Task)', EmailMessage: 'Email messages',
            ListEmail: 'List emails', Call: 'Logged calls', VoiceCall: 'Voice calls',
            MessagingSession: 'Messaging', LiveChatTranscript: 'Chat transcripts', Cadence: 'Cadence',
            Order: 'Orders', Case: 'Cases', Opportunity: 'Opportunities', Quote: 'Quotes',
            Contract: 'Contracts', Visit: 'Visits', File: 'Files', FeedItem: 'Chatter posts',
            SurveyResponse: 'Survey responses'
        },
        dates: {
            all: 'All dates', next7: 'Next 7 days', past7: 'Past 7 days', past30: 'Past 30 days'
        },
        actions: {
            LogACall: 'Log a Call',
            Email: 'Email',
            NewTask: 'New Task',
            NewEvent: 'New Event',
            NewVisit: 'Schedule Visit'
        }
    },
    fr: {
        cardTitle: "Fil d'activité",
        filtersButton: 'Filtres',
        refresh: 'Actualiser',
        expandAll: 'Tout développer',
        collapseAll: 'Tout réduire',
        filtersSummary: 'Filtres',
        itemsSuffix: 'élément(s)',
        dateRange: 'Période',
        activityTypes: "Types d'activité",
        selectAll: 'Tout sélectionner',
        clear: 'Effacer',
        sort: 'Trier',
        newestFirst: "Plus récent d'abord",
        oldestFirst: "Plus ancien d'abord",
        emptyState: 'Aucune activité sur la période sélectionnée.',
        upcomingGroup: 'À venir & en cours',
        noDateGroup: 'Sans date',
        owner: 'Propriétaire',
        related: 'Lié à',
        toggle: 'Basculer',
        showAll: 'Afficher plus ({n})',
        showLess: 'Afficher moins',
        allTypesSummary: 'Tous les types',
        typesSingular: 'type',
        typesPlural: 'types',
        types: {
            Task: 'Tâches', Event: 'Événements', Email: 'E-mails (Tâche)', EmailMessage: 'Messages e-mail',
            ListEmail: 'E-mails en masse', Call: 'Appels consignés', VoiceCall: 'Appels voix',
            MessagingSession: 'Messagerie', LiveChatTranscript: 'Transcripts chat', Cadence: 'Cadence',
            Order: 'Commandes', Case: 'Cas', Opportunity: 'Opportunités', Quote: 'Devis',
            Contract: 'Contrats', Visit: 'Visites', File: 'Fichiers', FeedItem: 'Posts Chatter',
            SurveyResponse: 'Réponses enquête'
        },
        dates: {
            all: 'Toutes les dates', next7: '7 prochains jours', past7: '7 derniers jours', past30: '30 derniers jours'
        },
        actions: {
            LogACall: 'Consigner un appel',
            Email: 'E-mail',
            NewTask: 'Nouvelle tâche',
            NewEvent: 'Nouvel événement',
            NewVisit: 'Planifier une visite'
        }
    }
};

export default class SeFrActivityFeed extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:activations';
    // Default to true behavior but init to false to satisfy LWC1503.
    @api excludeRelatedContacts = false;
    @api defaultDaysBack = 365;
    @api defaultDaysForward = 90;
    @api sortOldestFirst = false;
    @api expandedByDefault = false;
    @api enabledActionsCsv = 'LogACall,Email,NewTask,NewEvent,NewVisit';
    @api initialLimit = 10;
    // Comma-separated list of activity type keys shown by default. Empty = all types.
    // Keys: Task, Event, Email, EmailMessage, ListEmail, Call, VoiceCall, MessagingSession,
    // LiveChatTranscript, Cadence, Order, Case, Opportunity, Quote, Contract, Visit, File,
    // FeedItem, SurveyResponse.
    @api defaultEnabledTypesCsv = '';

    @track showAll = false;

    get includeRelatedContacts() { return !this.excludeRelatedContacts; }
    get defaultSortDesc() { return !this.sortOldestFirst; }

    @track rawFeed = [];
    @track expanded = {};
    @track filtersOpen = false;
    @track activeTypes = new Set();
    @track activeDateRange = 'all';
    @track sortDesc = true;
    wiredResult;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    connectedCallback() {
        const csv = (this.defaultEnabledTypesCsv || '').trim();
        if (csv) {
            const validKeys = new Set(TYPE_KEYS);
            csv.split(',').map(s => s.trim()).filter(Boolean).forEach(k => {
                if (validKeys.has(k)) this.activeTypes.add(k);
            });
        } else {
            TYPE_KEYS.forEach(k => this.activeTypes.add(k));
        }
        this.sortDesc = this.defaultSortDesc;
    }

    @wire(getActivityFeed, {
        recordId: '$recordId',
        includeRelatedContacts: '$includeRelatedContacts',
        daysBack: '$defaultDaysBack',
        daysForward: '$defaultDaysForward'
    })
    wiredFeed(result) {
        this.wiredResult = result;
        if (result.data) {
            this.rawFeed = result.data.map(e => ({
                ...e,
                iconStyle: `--sds-c-icon-color-background: ${e.iconColor};`,
                isExpanded: this.expandedByDefault,
                chevronIcon: this.expandedByDefault ? 'utility:chevrondown' : 'utility:chevronright',
                bodyClass: this.expandedByDefault ? 'item-body is-expanded' : 'item-body',
                formattedDate: this.formatDate(e.activityDate),
                displayDescription: this.truncate(e.description, 800)
            }));
        }
    }

    truncate(text, max) {
        if (!text) return '';
        if (text.length <= max) return text;
        return text.substring(0, max) + '…';
    }

    formatDate(isoDate) {
        if (!isoDate) return '';
        const d = new Date(isoDate);
        const tag = this.language === 'fr' ? 'fr-FR' : 'en-US';
        return d.toLocaleString(tag, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // ============================================================
    // Filters
    // ============================================================
    get filteredFeed() {
        const now = Date.now();
        const range = this.activeDateRange;
        return this.rawFeed
            .filter(e => this.activeTypes.has(e.type))
            .filter(e => {
                if (range === 'all') return true;
                if (!e.activityDate) return false;
                const t = new Date(e.activityDate).getTime();
                if (range === 'next7') return t >= now && t <= now + 7 * 864e5;
                if (range === 'past7') return t <= now && t >= now - 7 * 864e5;
                if (range === 'past30') return t <= now && t >= now - 30 * 864e5;
                return true;
            })
            .sort((a, b) => {
                const ta = a.activityDate ? new Date(a.activityDate).getTime() : 0;
                const tb = b.activityDate ? new Date(b.activityDate).getTime() : 0;
                return this.sortDesc ? tb - ta : ta - tb;
            });
    }

    get upcomingEntriesAll() {
        return this.filteredFeed.filter(e => e.isFuture === true);
    }

    get pastEntriesAll() {
        return this.filteredFeed.filter(e => e.isFuture !== true);
    }

    // Global cap — applies across upcoming + past combined. Upcoming entries consume the budget first
    // (they're the rep's "what's next"), then the past entries fill what's left. Uniform treatment
    // keeps the "Show more" button behaviour aligned with every other component in the library.
    get _limit() {
        const n = Number(this.initialLimit);
        return n > 0 ? n : 10;
    }

    get upcomingEntries() {
        if (this.showAll) return this.upcomingEntriesAll;
        return this.upcomingEntriesAll.slice(0, this._limit);
    }

    get pastEntries() {
        return this.pastEntriesAll; // Exposed as-is for totalCount / groupedPast
    }

    get pastEntriesCapped() {
        if (this.showAll) return this.pastEntriesAll;
        const remaining = Math.max(0, this._limit - this.upcomingEntriesAll.length);
        return this.pastEntriesAll.slice(0, remaining);
    }

    get hasMoreThanCap() {
        if (this.showAll) return false;
        return this.filteredFeed.length > this._limit;
    }

    get hiddenCount() {
        return Math.max(0, this.filteredFeed.length - this._limit);
    }

    get showAllLabel() {
        return this.labels.showAll.replace('{n}', this.hiddenCount);
    }
    get showLessLabel() { return this.labels.showLess; }

    get groupedPast() {
        const groups = new Map();
        const tag = this.language === 'fr' ? 'fr-FR' : 'en-US';
        for (const e of this.pastEntriesCapped) {
            if (!e.activityDate) {
                const key = 'undated';
                if (!groups.has(key)) groups.set(key, { id: key, label: this.labels.noDateGroup, items: [] });
                groups.get(key).items.push(e);
                continue;
            }
            const d = new Date(e.activityDate);
            const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
            if (!groups.has(key)) {
                const label = d.toLocaleString(tag, { month: 'long', year: 'numeric' });
                groups.set(key, { id: key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] });
            }
            groups.get(key).items.push(e);
        }
        return Array.from(groups.values());
    }

    get hasUpcoming() { return this.upcomingEntries.length > 0; }
    get hasPast() { return this.pastEntries.length > 0; }
    get isEmpty() { return this.filteredFeed.length === 0; }
    get totalCount() { return this.filteredFeed.length; }

    get typeOptions() {
        const l = this.labels;
        return TYPE_KEYS.map(k => ({
            key: k,
            label: l.types[k] || k,
            checked: this.activeTypes.has(k)
        }));
    }

    get dateRangeOptions() {
        const l = this.labels;
        return DATE_KEYS.map(k => ({
            key: k,
            label: l.dates[k] || k,
            variant: this.activeDateRange === k ? 'brand' : 'neutral'
        }));
    }

    get filterSummary() {
        const l = this.labels;
        const date = l.dates[this.activeDateRange] || this.activeDateRange;
        const n = this.activeTypes.size;
        const types = n === TYPE_KEYS.length
            ? l.allTypesSummary
            : `${n} ${n > 1 ? l.typesPlural : l.typesSingular}`;
        const sort = this.sortDesc ? l.newestFirst : l.oldestFirst;
        return `${date} • ${types} • ${sort}`;
    }

    // ============================================================
    // Event handlers
    // ============================================================
    toggleFilters() { this.filtersOpen = !this.filtersOpen; }

    handleTypeToggle(event) {
        const key = event.target.dataset.key;
        if (event.target.checked) this.activeTypes.add(key);
        else this.activeTypes.delete(key);
        this.activeTypes = new Set(this.activeTypes);
    }

    handleSelectAllTypes() {
        this.activeTypes = new Set(TYPE_KEYS);
    }

    handleClearTypes() {
        this.activeTypes = new Set();
    }

    handleDateRangeChange(event) {
        this.activeDateRange = event.target.dataset.key;
    }

    toggleSort() { this.sortDesc = !this.sortDesc; }

    showAllEntries() { this.showAll = true; }
    showLessEntries() { this.showAll = false; }

    get canShowLess() {
        return this.showAll && this.filteredFeed.length > this._limit;
    }

    handleRefresh() {
        if (this.wiredResult) refreshApex(this.wiredResult);
    }

    expandAll() {
        this.rawFeed = this.rawFeed.map(e => ({ ...e, isExpanded: true, chevronIcon: 'utility:chevrondown', bodyClass: 'item-body is-expanded' }));
    }

    collapseAll() {
        this.rawFeed = this.rawFeed.map(e => ({ ...e, isExpanded: false, chevronIcon: 'utility:chevronright', bodyClass: 'item-body' }));
    }

    toggleItem(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        this.rawFeed = this.rawFeed.map(e => {
            if (e.id !== id) return e;
            const isExpanded = !e.isExpanded;
            return {
                ...e,
                isExpanded,
                chevronIcon: isExpanded ? 'utility:chevrondown' : 'utility:chevronright',
                bodyClass: isExpanded ? 'item-body is-expanded' : 'item-body'
            };
        });
    }

    handleNavigate(event) {
        const url = event.currentTarget.dataset.url;
        if (!url) return;
        event.stopPropagation();
        this[NavigationMixin.Navigate]({
            type: 'standard__webPage',
            attributes: { url }
        });
    }

    // ============================================================
    // Quick actions (trigger standard record action via navigation)
    // ============================================================
    get actionButtons() {
        const keys = (this.enabledActionsCsv || '').split(',').map(s => s.trim()).filter(Boolean);
        const l = this.labels;
        const map = {
            LogACall:   { icon: 'utility:call',    kind: 'newTask',  defaults: { TaskSubtype: 'Call',  Subject: 'Call',  Status: 'Completed' } },
            Email:      { icon: 'utility:email',   kind: 'newTask',  defaults: { TaskSubtype: 'Email', Subject: 'Email', Status: 'Completed' } },
            NewTask:    { icon: 'utility:task',    kind: 'newTask',  defaults: {} },
            NewEvent:   { icon: 'utility:event',   kind: 'newEvent' },
            NewVisit:   { icon: 'utility:checkin', kind: 'newVisit' }
        };
        return keys.map(k => map[k] ? { key: k, label: l.actions[k] || k, ...map[k] } : null).filter(Boolean);
    }

    launchAction(event) {
        const key = event.currentTarget.dataset.key;
        const def = this.actionButtons.find(b => b.key === key);
        if (!def) return;

        const whatOrWho = this.objectApiName === 'Contact' ? 'WhoId' : 'WhatId';

        if (def.kind === 'newTask') {
            const defaults = { ...(def.defaults || {}), [whatOrWho]: this.recordId };
            this[NavigationMixin.Navigate]({
                type: 'standard__objectPage',
                attributes: { objectApiName: 'Task', actionName: 'new' },
                state: { defaultFieldValues: this.encodeFieldValues(defaults), nooverride: '1' }
            });
        } else if (def.kind === 'newEvent') {
            const defaults = { [whatOrWho]: this.recordId };
            this[NavigationMixin.Navigate]({
                type: 'standard__objectPage',
                attributes: { objectApiName: 'Event', actionName: 'new' },
                state: { defaultFieldValues: this.encodeFieldValues(defaults), nooverride: '1' }
            });
        } else if (def.kind === 'newVisit') {
            const defaults = { AccountId: this.recordId };
            this[NavigationMixin.Navigate]({
                type: 'standard__objectPage',
                attributes: { objectApiName: 'Visit', actionName: 'new' },
                state: { defaultFieldValues: this.encodeFieldValues(defaults), nooverride: '1' }
            });
        }
    }

    encodeFieldValues(obj) {
        return Object.keys(obj)
            .filter(k => obj[k] !== null && obj[k] !== undefined)
            .map(k => `${k}=${encodeURIComponent(obj[k])}`)
            .join(',');
    }

}
