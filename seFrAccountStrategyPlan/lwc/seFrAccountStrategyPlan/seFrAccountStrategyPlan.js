import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const SWOT_META = {
    strengths:    { icon: 'utility:success',  color: '#2e844a' },
    weaknesses:   { icon: 'utility:warning',  color: '#ba0517' },
    opportunities:{ icon: 'utility:rocket',   color: '#0176d3' },
    threats:      { icon: 'utility:shield',   color: '#ea7600' }
};

// Status keys are canonical (lowercase, English) so data flows work the same in both languages.
const STATUS_KEYS = ['not started', 'in progress', 'on track', 'at risk', 'done'];
const STATUS_COLORS = {
    'not started': { bg: '#e5e5e5', fg: '#444' },
    'in progress': { bg: '#cfe7ff', fg: '#014486' },
    'on track':    { bg: '#d4edda', fg: '#1f6b3a' },
    'at risk':     { bg: '#fde2e4', fg: '#8a1f11' },
    'done':        { bg: '#dcdcdc', fg: '#2e844a' }
};

const LABELS = {
    en: {
        cardTitle: 'Account Strategy & Action Plan',
        sectionSnapshot: 'Performance snapshot',
        sectionPositioning: 'Strategic positioning',
        sectionActionPlan: 'Action plan',
        sectionNotes: 'Strategic notes',
        reset: 'Reset',
        doneEditing: 'Done editing',
        edit: 'Edit',
        addAction: 'Add action',
        remove: 'Remove',
        quarter: 'Quarter',
        action: 'Action',
        owner: 'Owner',
        status: 'Status',
        strengthsEdit: 'Strengths (one per line)',
        weaknessesEdit: 'Weaknesses (one per line)',
        opportunitiesEdit: 'Opportunities (one per line)',
        threatsEdit: 'Threats (one per line)',
        strategyNotesLabel: 'Strategic notes',
        savePlan: 'Save plan',
        submitToManager: 'Submit to manager',
        target: 'Target',
        toastResetTitle: 'Reset',
        toastResetMsg: 'Defaults restored.',
        toastSavedTitle: 'Saved',
        toastSavedMsg: 'The account plan has been saved successfully.',
        toastSubmitTitle: 'Submitted for approval',
        toastSubmitMsg: 'The strategic plan has been sent to the Sales Manager.',
        swot: {
            strengths: 'Strengths',
            weaknesses: 'Weaknesses',
            opportunities: 'Opportunities',
            threats: 'Threats'
        },
        statuses: {
            'not started': 'Not started',
            'in progress': 'In progress',
            'on track': 'On track',
            'at risk': 'At risk',
            'done': 'Done'
        },
        defaults: {
            kpiPreviousYearLabel: 'Revenue (Y-1)',
            kpiRunRateLabel: 'Run rate',
            kpiPotentialLabel: 'Portfolio potential',
            kpiShareLabel: 'Share of wallet',
            annualTargetLabel: 'Annual target',
            ytdRevenueLabel: 'YTD revenue',
            runRateSuffix: '/ mo',
            strengthsCsv: 'Long-standing partnership,Premium product adoption,Strong NPS (72)',
            weaknessesCsv: 'Single product line,Low digital adoption,No training plan',
            opportunitiesCsv: 'Category expansion,Cross-sell on adjacent products,New decision-maker onboarded',
            threatsCsv: 'Competitive pricing pressure,Service complaints trending up',
            actionPlanCsv: 'Q2 2026|Schedule on-site demo|Alice|In progress,Q2 2026|Commercial incentive|Bob|At risk,Q3 2026|Category expansion pilot|Alice|Not started,Q4 2026|Year-end rebate proposal|Carol|Not started',
            strategyNotes: 'Focus on counter-acting competitive pricing with the year-end rebate and a premium demo in Q2.'
        }
    },
    fr: {
        cardTitle: "Stratégie de compte & plan d'action",
        sectionSnapshot: 'Performances',
        sectionPositioning: 'Positionnement stratégique',
        sectionActionPlan: "Plan d'action",
        sectionNotes: 'Notes stratégiques',
        reset: 'Réinitialiser',
        doneEditing: "Fin d'édition",
        edit: 'Modifier',
        addAction: 'Ajouter une action',
        remove: 'Supprimer',
        quarter: 'Trimestre',
        action: 'Action',
        owner: 'Responsable',
        status: 'Statut',
        strengthsEdit: 'Forces (une par ligne)',
        weaknessesEdit: 'Faiblesses (une par ligne)',
        opportunitiesEdit: 'Opportunités (une par ligne)',
        threatsEdit: 'Menaces (une par ligne)',
        strategyNotesLabel: 'Notes stratégiques',
        savePlan: 'Enregistrer le plan',
        submitToManager: 'Envoyer au manager',
        target: 'Objectif',
        toastResetTitle: 'Réinitialisé',
        toastResetMsg: 'Valeurs par défaut restaurées.',
        toastSavedTitle: 'Enregistré',
        toastSavedMsg: 'Le plan de compte a été enregistré.',
        toastSubmitTitle: 'Envoyé pour validation',
        toastSubmitMsg: 'Le plan stratégique a été envoyé au Sales Manager.',
        swot: {
            strengths: 'Forces',
            weaknesses: 'Faiblesses',
            opportunities: 'Opportunités',
            threats: 'Menaces'
        },
        statuses: {
            'not started': 'Non commencé',
            'in progress': 'En cours',
            'on track': 'Dans les temps',
            'at risk': 'À risque',
            'done': 'Terminé'
        },
        defaults: {
            kpiPreviousYearLabel: 'CA (A-1)',
            kpiRunRateLabel: 'Run rate',
            kpiPotentialLabel: 'Potentiel portefeuille',
            kpiShareLabel: 'Part de marché client',
            annualTargetLabel: 'Objectif annuel',
            ytdRevenueLabel: 'CA cumulé',
            runRateSuffix: '/ mois',
            strengthsCsv: 'Partenariat historique,Adoption premium,NPS fort (72)',
            weaknessesCsv: 'Gamme unique,Faible adoption digitale,Aucun plan de formation',
            opportunitiesCsv: 'Extension de catégorie,Cross-sell sur produits adjacents,Nouveau décideur onboardé',
            threatsCsv: 'Pression tarifaire concurrentielle,Réclamations service en hausse',
            actionPlanCsv: 'T2 2026|Organiser démo on-site|Alice|in progress,T2 2026|Incentive commerciale|Bob|at risk,T3 2026|Pilote extension catégorie|Alice|not started,T4 2026|Proposition remise de fin d\'année|Carol|not started',
            strategyNotes: "Contrer la pression tarifaire concurrentielle via la remise de fin d'année et une démo premium au T2."
        }
    }
};

function splitLines(csv) {
    if (!csv) return [];
    return csv.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
}

export default class SeFrAccountStrategyPlan extends LightningElement {
    @api recordId;

    @api language = 'fr';

    // Card framing
    @api cardTitle;
    @api cardIcon = 'standard:goals';
    @api currencyCode = 'EUR';
    @api localeTag = 'fr-FR';

    // Performance snapshot - KPIs + target progress
    // Default narrative across all 4 revenue-aware components: YTD = 38 550, previous year = 33 800
    // (so trend = +14.2%), run rate ~3.2k/month, potential ~75k, share 56%, annual target 55k.
    @api kpiPreviousYearLabel;
    @api kpiPreviousYearValue = 33800;
    @api kpiRunRateLabel;
    @api kpiRunRateValue = 3200;
    @api kpiPotentialLabel;
    @api kpiPotentialValue = 75000;
    @api kpiShareLabel;
    @api kpiShareValue = '56%';

    @api annualTargetLabel;
    @api annualTargetDefault = 55000;
    @api ytdRevenueLabel;
    @api ytdRevenueDefault = 38550;

    // SWOT defaults (overridable via App Builder — else from the language dictionary)
    @api strengthsCsv;
    @api weaknessesCsv;
    @api opportunitiesCsv;
    @api threatsCsv;

    // Action plan — CSV of Quarter|Action|Owner|Status
    @api actionPlanCsv;

    // Strategic notes default (editable)
    @api strategyNotesDefault;

    // Deprecated props — kept for backwards compat with pages still referencing them.
    @api logisticOptionsCsv;
    @api competitorOptionsCsv;
    @api riskOptionsCsv;
    @api leversOptionsCsv;

    // ------- Editable state (pre-filled from defaults, SE can edit for demo) -------
    @track annualTarget;
    @track ytdRevenue;
    @track strengthsText;
    @track weaknessesText;
    @track opportunitiesText;
    @track threatsText;
    @track strategyNotes;
    @track actionRowsEdit;

    @track editMode = false;              // kept for backwards compatibility (templates previously referenced it)
    @track editSnapshot = false;          // Performance snapshot + target edit toggle
    @track editSwot = false;              // SWOT textarea edit toggle
    @track editPlan = false;              // Action plan edit toggle (quarterly actions table)
    @track editNotes = false;             // Strategic notes edit toggle
    _lastLang;

    get labels() { return LABELS[this.language] || LABELS.en; }

    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedKpiPreviousYearLabel() { return this.kpiPreviousYearLabel || this.labels.defaults.kpiPreviousYearLabel; }
    get resolvedKpiRunRateLabel() { return this.kpiRunRateLabel || this.labels.defaults.kpiRunRateLabel; }
    get resolvedKpiPotentialLabel() { return this.kpiPotentialLabel || this.labels.defaults.kpiPotentialLabel; }
    get resolvedKpiShareLabel() { return this.kpiShareLabel || this.labels.defaults.kpiShareLabel; }
    get resolvedAnnualTargetLabel() { return this.annualTargetLabel || this.labels.defaults.annualTargetLabel; }
    get resolvedYtdRevenueLabel() { return this.ytdRevenueLabel || this.labels.defaults.ytdRevenueLabel; }

    connectedCallback() {
        this.resetFromDefaults();
        this._lastLang = this.language;
    }

    renderedCallback() {
        if (this._lastLang !== this.language) {
            this.resetFromDefaults();
            this._lastLang = this.language;
        }
    }

    resetFromDefaults() {
        const d = this.labels.defaults;
        this.annualTarget = this.annualTargetDefault;
        this.ytdRevenue = this.ytdRevenueDefault;
        this.strengthsText = splitLines(this.strengthsCsv || d.strengthsCsv).join('\n');
        this.weaknessesText = splitLines(this.weaknessesCsv || d.weaknessesCsv).join('\n');
        this.opportunitiesText = splitLines(this.opportunitiesCsv || d.opportunitiesCsv).join('\n');
        this.threatsText = splitLines(this.threatsCsv || d.threatsCsv).join('\n');
        this.strategyNotes = this.strategyNotesDefault || d.strategyNotes;
        this.actionRowsEdit = this.parseActionCsv(this.actionPlanCsv || d.actionPlanCsv);
    }

    parseActionCsv(csv) {
        if (!csv) return [];
        return csv.split(',').map((row, i) => {
            const parts = row.split('|').map(p => p.trim());
            return {
                id: `a${i}`,
                quarter: parts[0] || '',
                action: parts[1] || '',
                owner: parts[2] || '',
                // Normalize status to a canonical lowercase English key
                status: this.normalizeStatus(parts[3])
            };
        }).filter(r => r.action);
    }

    normalizeStatus(raw) {
        const s = (raw || '').trim().toLowerCase();
        // Accept FR and EN values; default to 'not started'
        const frToEn = {
            'non commencé': 'not started',
            'en cours': 'in progress',
            'dans les temps': 'on track',
            'à risque': 'at risk',
            'terminé': 'done'
        };
        if (frToEn[s]) return frToEn[s];
        if (STATUS_KEYS.includes(s)) return s;
        return 'not started';
    }

    // ------- Derived display -------

    get accentStyle() {
        return '--se-accent: var(--slds-g-color-accent-base-50, #0176d3);';
    }

    get formattedPreviousYear() { return this.formatCurrency(this.kpiPreviousYearValue); }
    get formattedRunRate() { return `${this.formatCurrency(this.kpiRunRateValue)} ${this.labels.defaults.runRateSuffix}`; }
    get formattedPotential() { return this.formatCurrency(this.kpiPotentialValue); }

    get targetPercent() {
        const target = Number(this.annualTarget) || 0;
        const ytd = Number(this.ytdRevenue) || 0;
        if (!target) return 0;
        return Math.min(100, Math.round((ytd / target) * 100));
    }
    get targetPercentLabel() { return `${this.targetPercent}%`; }
    get targetFillStyle() { return `width: ${this.targetPercent}%; background: var(--se-accent, #0176d3);`; }
    get formattedYtd() { return this.formatCurrency(this.ytdRevenue); }
    get formattedTarget() { return this.formatCurrency(this.annualTarget); }

    get swotCards() {
        return [
            this.buildSwotCard('strengths', this.strengthsText),
            this.buildSwotCard('weaknesses', this.weaknessesText),
            this.buildSwotCard('opportunities', this.opportunitiesText),
            this.buildSwotCard('threats', this.threatsText)
        ];
    }

    buildSwotCard(key, text) {
        const meta = SWOT_META[key];
        const items = splitLines(text);
        return {
            key,
            label: this.labels.swot[key],
            icon: meta.icon,
            items: items.map((t, i) => ({ id: `${key}-${i}`, text: t })),
            headerStyle: `border-left: 4px solid ${meta.color}; background: ${meta.color}14;`,
            iconStyle: `--sds-c-icon-color-foreground-default: ${meta.color};`
        };
    }

    get actionRows() {
        return this.actionRowsEdit.map(r => {
            const key = (r.status || '').toLowerCase();
            const colors = STATUS_COLORS[key] || STATUS_COLORS['not started'];
            return {
                ...r,
                statusLabel: this.labels.statuses[key] || key,
                pillStyle: `background: ${colors.bg}; color: ${colors.fg};`
            };
        });
    }

    formatCurrency(value) {
        if (value === null || value === undefined || value === '') return '';
        return new Intl.NumberFormat(this.localeTag, {
            style: 'currency',
            currency: this.currencyCode,
            maximumFractionDigits: 0
        }).format(Number(value));
    }

    // ------- Edit handlers -------

    toggleEditMode() { this.editMode = !this.editMode; }
    toggleEditSnapshot() { this.editSnapshot = !this.editSnapshot; }
    toggleEditSwot() { this.editSwot = !this.editSwot; }
    toggleEditPlan() { this.editPlan = !this.editPlan; }
    toggleEditNotes() { this.editNotes = !this.editNotes; }

    // When any section is in edit mode the footer Save button is active; a single Save exits all sections.
    get isAnySectionEditing() { return this.editSnapshot || this.editSwot || this.editPlan || this.editNotes; }

    handleResetDefaults() {
        this.resetFromDefaults();
        this.dispatchEvent(new ShowToastEvent({ title: this.labels.toastResetTitle, message: this.labels.toastResetMsg, variant: 'info' }));
    }

    handleTargetChange(e) { this.annualTarget = e.target.value; }
    handleYtdChange(e) { this.ytdRevenue = e.target.value; }
    handleStrengthsChange(e) { this.strengthsText = e.target.value; }
    handleWeaknessesChange(e) { this.weaknessesText = e.target.value; }
    handleOpportunitiesChange(e) { this.opportunitiesText = e.target.value; }
    handleThreatsChange(e) { this.threatsText = e.target.value; }
    handleNotesChange(e) { this.strategyNotes = e.target.value; }

    handleActionEdit(event) {
        const id = event.target.dataset.id;
        const field = event.target.dataset.field;
        const value = event.target.value;
        this.actionRowsEdit = this.actionRowsEdit.map(r => r.id === id ? { ...r, [field]: value } : r);
    }

    handleActionDelete(event) {
        const id = event.currentTarget.dataset.id;
        this.actionRowsEdit = this.actionRowsEdit.filter(r => r.id !== id);
    }

    handleActionAdd() {
        const newId = `a${Date.now()}`;
        this.actionRowsEdit = [...this.actionRowsEdit, { id: newId, quarter: '', action: '', owner: '', status: 'not started' }];
    }

    get statusOptions() {
        // The combobox stores the canonical key as the value; its label follows the active language.
        return STATUS_KEYS.map(k => ({ label: this.labels.statuses[k], value: k }));
    }

    handleSave() {
        this.editMode = false;
        this.editSnapshot = false;
        this.editSwot = false;
        this.editPlan = false;
        this.editNotes = false;
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.toastSavedTitle,
            message: this.labels.toastSavedMsg,
            variant: 'success'
        }));
    }

    handleSubmit() {
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.toastSubmitTitle,
            message: this.labels.toastSubmitMsg,
            variant: 'info'
        }));
    }
}
