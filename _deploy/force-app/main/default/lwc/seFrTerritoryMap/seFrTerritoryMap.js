import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getTerritoryAccounts from '@salesforce/apex/SE_FR_TerritoryMapController.getTerritoryAccounts';
import getStageNames from '@salesforce/apex/SE_FR_TerritoryMapController.getStageNames';
import getAccountRecordTypes from '@salesforce/apex/SE_FR_TerritoryMapController.getAccountRecordTypes';
import getAccountPicklistValues from '@salesforce/apex/SE_FR_TerritoryMapController.getAccountPicklistValues';
import getCaseStatuses from '@salesforce/apex/SE_FR_TerritoryMapController.getCaseStatuses';
import getAccountFieldLabel from '@salesforce/apex/SE_FR_TerritoryMapController.getAccountFieldLabel';

const PIN_SVG = 'M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5s1.1-2.5 2.5-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z';
const COLOR_HOT = '#ba0517';
const COLOR_WARM = '#fe9339';
const COLOR_COOL = '#2e844a';
const COLOR_NEUTRAL = '#706e6b';

const LABELS = {
    en: {
        cardTitle: 'Territory Map',
        markersTitle: 'Accounts',
        kpiAccounts: 'Accounts',
        kpiAmount: 'Open pipeline',
        kpiOpenOpps: 'Open opportunities',
        kpiOpenCases: 'Open cases',
        ownerScopeLabel: 'Owner',
        ownerScopeMine: 'My accounts',
        ownerScopeAll: 'All accounts',
        recordTypeLabel: 'Account RecordType',
        recordTypeAll: 'All RecordTypes',
        amountMinLabel: 'Open amount min',
        amountMaxLabel: 'Open amount max',
        stageLabel: 'Opportunity stages',
        caseStatusLabel: 'Case status',
        nameSearchLabel: 'Search name',
        nameSearchPlaceholder: 'Account name contains...',
        stageAvailable: 'Available',
        stageSelected: 'Selected',
        applyFilters: 'Apply',
        resetFilters: 'Reset',
        toggleFilters: 'Filters',
        exportCsv: 'Export visible (CSV)',
        refresh: 'Refresh',
        noAccounts: 'No account matches the current filters.',
        loading: 'Loading…',
        accountsList: 'Accounts'
    },
    fr: {
        cardTitle: 'Carte du territoire',
        markersTitle: 'Comptes',
        kpiAccounts: 'Comptes',
        kpiAmount: 'Pipeline ouvert',
        kpiOpenOpps: 'Opportunités ouvertes',
        kpiOpenCases: 'Cases ouverts',
        ownerScopeLabel: 'Propriétaire',
        ownerScopeMine: 'Mes comptes',
        ownerScopeAll: 'Tous les comptes',
        recordTypeLabel: 'RecordType compte',
        recordTypeAll: 'Tous les RecordTypes',
        amountMinLabel: 'Montant ouvert min',
        amountMaxLabel: 'Montant ouvert max',
        stageLabel: 'Étapes opportunité',
        caseStatusLabel: 'Statuts case',
        nameSearchLabel: 'Recherche par nom',
        nameSearchPlaceholder: 'Le nom contient...',
        stageAvailable: 'Disponibles',
        stageSelected: 'Sélectionnés',
        applyFilters: 'Appliquer',
        resetFilters: 'Réinitialiser',
        toggleFilters: 'Filtres',
        exportCsv: 'Exporter visible (CSV)',
        refresh: 'Actualiser',
        noAccounts: 'Aucun compte ne correspond aux filtres.',
        loading: 'Chargement…',
        accountsList: 'Comptes'
    }
};

function formatCompactAmount(value, locale, currency) {
    if (value == null || isNaN(value)) return '–';
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency', currency: currency || 'EUR',
            notation: 'compact', maximumFractionDigits: 1
        }).format(value);
    } catch (e) {
        return `${Math.round(value).toLocaleString(locale)} ${currency || 'EUR'}`;
    }
}

export default class SeFrTerritoryMap extends NavigationMixin(LightningElement) {
    @api language = 'fr';
    @api cardTitle;
    @api limitCount = 100;
    @api defaultRecordType = '';
    @api defaultOwnerScope = 'mine';
    @api defaultStagesCsv = '';
    @api currencyCode = 'EUR';
    @api zoomLevel = 6;
    @api filtersOpenByDefault = false;
    // Default center coordinates — France hexagon centroid (Bourges area) so a fresh demo map
    // always loads on metropolitan France rather than auto-fitting to US-style markers.
    @api defaultCenterLatitude = 46.7;
    @api defaultCenterLongitude = 2.5;
    @api mapHeight = 480;
    // Map / list horizontal split. Default: map ~ 2/3, list ~ 1/3. Range 0.4 - 0.85.
    @api mapWidthRatio = 0.66;
    // Configurable filter fields. Default to standard Account.Type and Account.Industry but the
    // SE can swap to any picklist field on Account via App Builder.
    @api filterFieldAApiName = 'Type';
    @api filterFieldBApiName = 'Industry';

    @track accounts = [];
    @track stageNamesAll = [];
    @track recordTypesAll = [];
    @track caseStatusesAll = [];
    @track filterAValuesAll = [];
    @track filterBValuesAll = [];
    @track filterALabel = '';
    @track filterBLabel = '';

    // Pending filter state — what the SE is editing in the panel BEFORE clicking Apply.
    @track pendingOwnerScope = 'mine';
    @track pendingRecordType = '';
    @track pendingStages = [];
    @track pendingCaseStatuses = [];
    @track pendingNameSearch = '';
    @track pendingFilterAValues = [];
    @track pendingFilterBValues = [];
    @track pendingAmountMin = null;
    @track pendingAmountMax = null;

    // Active filter state — what's actually been applied (drives the Apex query). Auto-loaded
    // on connectedCallback so the map renders data immediately, then mutated only on Apply.
    @track activeFilters = null;

    @track showFilters = false;
    @track selectedMarkerValue;
    @track loading = false;
    @track loadError;

    connectedCallback() {
        this.pendingOwnerScope = this.defaultOwnerScope || 'mine';
        this.pendingRecordType = this.defaultRecordType || '';
        this.pendingStages = (this.defaultStagesCsv || '').split(',').map(s => s.trim()).filter(Boolean);
        this.pendingCaseStatuses = [];
        this.pendingNameSearch = '';
        this.pendingFilterAValues = [];
        this.pendingFilterBValues = [];
        this.pendingAmountMin = null;
        this.pendingAmountMax = null;
        this.showFilters = !!this.filtersOpenByDefault;
        // Apply once so the initial state mirrors the SE's defaults — fixes the bug where the
        // map only populated after the user clicked Reset.
        this._commitPendingToActive();
        this._loadAccounts();
    }

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get locale() { return this.language === 'fr' ? 'fr-FR' : 'en-US'; }

    // ---------- Wires for filter dropdowns ----------

    @wire(getStageNames)            wiredStages({ data })       { if (data) this.stageNamesAll = data; }
    @wire(getCaseStatuses)          wiredCaseStatuses({ data }) { if (data) this.caseStatusesAll = data; }
    @wire(getAccountRecordTypes)    wiredRecordTypes({ data })  { if (data) this.recordTypesAll = data; }

    @wire(getAccountPicklistValues, { fieldApiName: '$filterFieldAApiName' })
    wiredFilterAValues({ data }) { if (data) this.filterAValuesAll = data; }
    @wire(getAccountPicklistValues, { fieldApiName: '$filterFieldBApiName' })
    wiredFilterBValues({ data }) { if (data) this.filterBValuesAll = data; }

    @wire(getAccountFieldLabel, { fieldApiName: '$filterFieldAApiName' })
    wiredFilterALabel({ data }) { if (data) this.filterALabel = data; }
    @wire(getAccountFieldLabel, { fieldApiName: '$filterFieldBApiName' })
    wiredFilterBLabel({ data }) { if (data) this.filterBLabel = data; }

    // ---------- Imperative load ----------

    _commitPendingToActive() {
        this.activeFilters = {
            limitCount: this.limitCount,
            recordTypeName: this.pendingRecordType,
            ownerScope: this.pendingOwnerScope,
            amountMin: (this.pendingAmountMin === '' || this.pendingAmountMin == null) ? null : Number(this.pendingAmountMin),
            amountMax: (this.pendingAmountMax === '' || this.pendingAmountMax == null) ? null : Number(this.pendingAmountMax),
            stagesCsv: (this.pendingStages || []).join(','),
            nameSearch: this.pendingNameSearch || '',
            caseStatusCsv: (this.pendingCaseStatuses || []).join(','),
            filterFieldAApiName: this.filterFieldAApiName || '',
            filterFieldAValuesCsv: (this.pendingFilterAValues || []).join(','),
            filterFieldBApiName: this.filterFieldBApiName || '',
            filterFieldBValuesCsv: (this.pendingFilterBValues || []).join(',')
        };
    }

    _loadAccounts() {
        if (!this.activeFilters) return;
        this.loading = true;
        this.loadError = null;
        getTerritoryAccounts(this.activeFilters)
            .then(data => {
                this.accounts = data || [];
                this.loading = false;
            })
            .catch(err => {
                this.loading = false;
                this.accounts = [];
                this.loadError = (err && err.body && err.body.message) || (err && err.message) || 'Error';
                // eslint-disable-next-line no-console
                console.error('[seFrTerritoryMap] load error:', err);
            });
    }

    handleApplyFilters() {
        this._commitPendingToActive();
        this._loadAccounts();
    }

    handleRefresh() {
        this._loadAccounts();
    }

    // ---------- Derived ----------

    get hasAccounts() { return (this.accounts || []).length > 0; }

    get _amountThresholds() {
        const amounts = (this.accounts || [])
            .map(a => Number(a.openOpportunityAmount) || 0)
            .filter(v => v > 0)
            .sort((x, y) => x - y);
        if (!amounts.length) return null;
        const q = (p) => amounts[Math.min(amounts.length - 1, Math.floor(p * (amounts.length - 1)))];
        return { warm: q(0.5), hot: q(0.8) };
    }

    get mapMarkers() {
        const t = this._amountThresholds;
        return (this.accounts || [])
            .filter(a => a.latitude != null && a.longitude != null)
            .map(a => {
                const amt = Number(a.openOpportunityAmount) || 0;
                let color = COLOR_NEUTRAL;
                if (t) {
                    if (amt >= t.hot) color = COLOR_HOT;
                    else if (amt >= t.warm) color = COLOR_WARM;
                    else if (amt > 0) color = COLOR_COOL;
                }
                const amountDisplay = formatCompactAmount(amt, this.locale, this.currencyCode);
                const cityLine = [a.postalCode, a.city].filter(Boolean).join(' ');
                const description = [
                    `${this.labels.kpiAmount}: ${amountDisplay}`,
                    `${this.labels.kpiOpenOpps}: ${a.openOpportunityCount || 0}`,
                    `${this.labels.kpiOpenCases}: ${a.openCaseCount || 0}`,
                    a.ownerName ? `${a.ownerName}` : null,
                    cityLine || null
                ].filter(Boolean).join(' • ');
                return {
                    location: { Latitude: a.latitude, Longitude: a.longitude },
                    title: a.name,
                    description,
                    value: a.id,
                    icon: 'standard:account',
                    mapIcon: {
                        path: PIN_SVG,
                        fillColor: color,
                        fillOpacity: 1,
                        strokeWeight: 1,
                        strokeColor: '#ffffff',
                        scale: 1.5,
                        anchor: { x: 12, y: 22 }
                    }
                };
            });
    }

    get mapCenter() {
        // Always center on the configured default (France by default). lightning-map adjusts the
        // visible viewport to the markers automatically anyway, but the explicit center keeps
        // the map anchored on the right region when no markers are visible (loading / empty
        // filter result) — fixes the "map starts on US" symptom when the centroid of cached
        // markers happens to land outside Europe.
        return {
            location: {
                Latitude: Number(this.defaultCenterLatitude) || 46.7,
                Longitude: Number(this.defaultCenterLongitude) || 2.5
            }
        };
    }

    // Display tier per account so the side list can show a dot of the same color as the pin.
    get accountsForList() {
        const t = this._amountThresholds;
        return (this.accounts || []).map(a => {
            const amt = Number(a.openOpportunityAmount) || 0;
            let color = COLOR_NEUTRAL;
            if (t) {
                if (amt >= t.hot) color = COLOR_HOT;
                else if (amt >= t.warm) color = COLOR_WARM;
                else if (amt > 0) color = COLOR_COOL;
            }
            const isSelected = this.selectedMarkerValue === a.id;
            return {
                ...a,
                amountDisplay: formatCompactAmount(amt, this.locale, this.currencyCode),
                dotStyle: `background:${color};`,
                location: [a.postalCode, a.city].filter(Boolean).join(' ') || a.country || '',
                itemClass: isSelected ? 'tm-list-item tm-list-item_selected' : 'tm-list-item'
            };
        });
    }

    // ---------- KPIs ----------

    get kpiAccountCount() { return (this.accounts || []).length; }
    get kpiAmountTotal() {
        return (this.accounts || []).reduce((s, a) => s + (Number(a.openOpportunityAmount) || 0), 0);
    }
    get kpiAmountDisplay() { return formatCompactAmount(this.kpiAmountTotal, this.locale, this.currencyCode); }
    get kpiOpenOpps() {
        return (this.accounts || []).reduce((s, a) => s + (Number(a.openOpportunityCount) || 0), 0);
    }
    get kpiOpenCases() {
        return (this.accounts || []).reduce((s, a) => s + (Number(a.openCaseCount) || 0), 0);
    }

    // ---------- Filter UI ----------

    get ownerScopeOptions() {
        return [
            { label: this.labels.ownerScopeMine, value: 'mine' },
            { label: this.labels.ownerScopeAll, value: 'all' }
        ];
    }
    get recordTypeOptions() {
        const all = [{ label: this.labels.recordTypeAll, value: '' }];
        return all.concat((this.recordTypesAll || []).map(rt => ({ label: rt.label, value: rt.developerName })));
    }
    get stageOptions() { return (this.stageNamesAll || []).map(s => ({ label: s, value: s })); }
    get caseStatusOptions() { return (this.caseStatusesAll || []).map(s => ({ label: s, value: s })); }
    get filterAOptions() { return (this.filterAValuesAll || []).map(s => ({ label: s, value: s })); }
    get filterBOptions() { return (this.filterBValuesAll || []).map(s => ({ label: s, value: s })); }
    get hasFilterA() { return (this.filterAValuesAll || []).length > 0; }
    get hasFilterB() { return (this.filterBValuesAll || []).length > 0; }
    get filterButtonVariant() { return this.showFilters ? 'brand' : 'border-filled'; }
    get exportDisabled() { return !this.hasAccounts; }

    handleOwnerScopeChange(e) { this.pendingOwnerScope = e.detail.value; }
    handleRecordTypeChange(e) { this.pendingRecordType = e.detail.value; }
    handleStageChange(e) { this.pendingStages = e.detail.value || []; }
    handleCaseStatusChange(e) { this.pendingCaseStatuses = e.detail.value || []; }
    handleFilterAChange(e) { this.pendingFilterAValues = e.detail.value || []; }
    handleFilterBChange(e) { this.pendingFilterBValues = e.detail.value || []; }
    handleNameSearchChange(e) { this.pendingNameSearch = e.detail.value || ''; }
    handleAmountMinChange(e) { this.pendingAmountMin = e.detail.value; }
    handleAmountMaxChange(e) { this.pendingAmountMax = e.detail.value; }

    handleResetFilters() {
        this.pendingOwnerScope = this.defaultOwnerScope || 'mine';
        this.pendingRecordType = this.defaultRecordType || '';
        this.pendingStages = (this.defaultStagesCsv || '').split(',').map(s => s.trim()).filter(Boolean);
        this.pendingCaseStatuses = [];
        this.pendingNameSearch = '';
        this.pendingFilterAValues = [];
        this.pendingFilterBValues = [];
        this.pendingAmountMin = null;
        this.pendingAmountMax = null;
        this._commitPendingToActive();
        this._loadAccounts();
    }
    toggleFilters() { this.showFilters = !this.showFilters; }

    // ---------- Layout ----------

    get bodyStyle() {
        const ratio = Math.max(0.4, Math.min(0.85, Number(this.mapWidthRatio) || 0.66));
        const mapPct = Math.round(ratio * 100);
        const listPct = 100 - mapPct;
        return `--tm-map-height:${Number(this.mapHeight) || 480}px; --tm-map-width:${mapPct}%; --tm-list-width:${listPct}%;`;
    }

    // ---------- Map interaction ----------

    handleMarkerSelect(event) {
        // Single-click on the lightning-map list / pin → highlight only (do NOT navigate).
        // Navigation happens via a dedicated "Open" link inside the side list (less destructive
        // than auto-opening the record on every click).
        this.selectedMarkerValue = event.detail.selectedMarkerValue;
    }

    handleListClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this.selectedMarkerValue = id;
    }

    handleListOpen(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: 'Account', actionName: 'view' }
        });
    }

    // ---------- CSV export ----------

    handleExport() {
        const rows = this.accounts || [];
        if (!rows.length) return;
        const headers = [
            'Account', 'Industry', 'Type', 'Owner',
            'OpenOppCount', 'OpenOppAmount', 'WonOppAmount', 'OpenCaseCount',
            'City', 'PostalCode', 'Country', 'Latitude', 'Longitude'
        ];
        const escape = (v) => {
            if (v == null) return '';
            const s = String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const lines = [headers.join(',')];
        for (const a of rows) {
            lines.push([
                a.name, a.industry, a.type, a.ownerName,
                a.openOpportunityCount, a.openOpportunityAmount, a.wonOpportunityAmount, a.openCaseCount,
                a.city, a.postalCode, a.country, a.latitude, a.longitude
            ].map(escape).join(','));
        }
        const csv = lines.join('\n');
        const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const fileName = `territory-map-${ts}.csv`;

        // Build a data URL — works inside Locker / Lightning containers where Blob URLs sometimes
        // get blocked. Encode the BOM + content in URI-encoded form.
        const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent('﻿' + csv);
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = fileName;
        // Some Lightning containers ignore .click() on detached anchors — append to the DOM,
        // dispatch a synthetic MouseEvent (more reliable than .click()), then clean up.
        document.body.appendChild(a);
        const evt = new MouseEvent('click', { view: window, bubbles: false, cancelable: true });
        a.dispatchEvent(evt);
        document.body.removeChild(a);
    }
}
