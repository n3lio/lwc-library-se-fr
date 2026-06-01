import { LightningElement, api } from 'lwc';

const TODAY = new Date();
const Y = TODAY.getFullYear();

// ─────────────────────────────────────────────────────────────────────────
// Default phase sets per scope. Each is a self-contained narrative used
// when `phasesJson` is empty. Admins can override fully via the Phases JSON
// property in App Builder — the placeholder shown there exposes the format.
// ─────────────────────────────────────────────────────────────────────────

// "record" — sales / deal cycle. Best on Account / Opportunity / Lead pages.
function recordPhases(lang) {
    if (lang === 'en') return [
        { label: 'Prospecting',       date: `${Y}-02-15`, done: true  },
        { label: 'Discovery meeting', date: `${Y}-03-10`, done: true  },
        { label: 'Demo',              date: `${Y}-04-05`, done: true  },
        { label: 'Proposal',          date: `${Y}-05-10`, done: false },
        { label: 'Closing',           date: `${Y}-06-20`, done: false }
    ];
    return [
        { label: 'Prospection', date: `${Y}-02-15`, done: true  },
        { label: 'Découverte',  date: `${Y}-03-10`, done: true  },
        { label: 'Démo',        date: `${Y}-04-05`, done: true  },
        { label: 'Proposition', date: `${Y}-05-10`, done: false },
        { label: 'Closing',     date: `${Y}-06-20`, done: false }
    ];
}

// "case" — service case resolution lifecycle. Best on Case record page.
function casePhases(lang) {
    if (lang === 'en') return [
        { label: 'Logged',         date: `${Y}-05-15`, done: true  },
        { label: 'Triage',         date: `${Y}-05-16`, done: true  },
        { label: 'Investigation',  date: `${Y}-05-19`, done: true  },
        { label: 'Workaround',     date: `${Y}-05-23`, done: false },
        { label: 'Resolution',     date: `${Y}-05-28`, done: false },
        { label: 'Customer review',date: `${Y}-06-02`, done: false },
        { label: 'Closed',         date: `${Y}-06-05`, done: false }
    ];
    return [
        { label: 'Création',         date: `${Y}-05-15`, done: true  },
        { label: 'Qualification',    date: `${Y}-05-16`, done: true  },
        { label: 'Investigation',    date: `${Y}-05-19`, done: true  },
        { label: 'Solution proposée',date: `${Y}-05-23`, done: false },
        { label: 'Résolution',       date: `${Y}-05-28`, done: false },
        { label: 'Validation client',date: `${Y}-06-02`, done: false },
        { label: 'Clôturé',          date: `${Y}-06-05`, done: false }
    ];
}

// "service" — field service intervention lifecycle. Best on WorkOrder / ServiceAppointment.
function servicePhases(lang) {
    if (lang === 'en') return [
        { label: 'Order received',    date: `${Y}-05-10`, done: true  },
        { label: 'Technician assigned',date: `${Y}-05-12`, done: true  },
        { label: 'On site',           date: `${Y}-05-18`, done: false },
        { label: 'Diagnosis',         date: `${Y}-05-19`, done: false },
        { label: 'Repair',            date: `${Y}-05-21`, done: false },
        { label: 'Customer sign-off', date: `${Y}-05-22`, done: false }
    ];
    return [
        { label: 'Demande reçue',     date: `${Y}-05-10`, done: true  },
        { label: 'Technicien affecté',date: `${Y}-05-12`, done: true  },
        { label: 'Sur site',          date: `${Y}-05-18`, done: false },
        { label: 'Diagnostic',        date: `${Y}-05-19`, done: false },
        { label: 'Intervention',      date: `${Y}-05-21`, done: false },
        { label: 'Validation client', date: `${Y}-05-22`, done: false }
    ];
}

// "onboarding" — customer onboarding journey. Best on Account or Contact record page.
function onboardingPhases(lang) {
    if (lang === 'en') return [
        { label: 'Welcome',         date: `${Y}-04-01`, done: true  },
        { label: 'Kick-off',        date: `${Y}-04-15`, done: true  },
        { label: 'Configuration',   date: `${Y}-05-01`, done: true  },
        { label: 'Training',        date: `${Y}-05-20`, done: false },
        { label: 'Go-live',         date: `${Y}-06-10`, done: false },
        { label: 'Adoption review', date: `${Y}-07-15`, done: false }
    ];
    return [
        { label: 'Bienvenue',          date: `${Y}-04-01`, done: true  },
        { label: 'Kick-off',           date: `${Y}-04-15`, done: true  },
        { label: 'Configuration',      date: `${Y}-05-01`, done: true  },
        { label: 'Formation',          date: `${Y}-05-20`, done: false },
        { label: 'Mise en production', date: `${Y}-06-10`, done: false },
        { label: 'Revue d\'adoption',   date: `${Y}-07-15`, done: false }
    ];
}

// "home" — global fiscal milestones. Best on Home / App pages.
function homePhases(lang) {
    if (lang === 'en') return [
        { label: 'Q1 — Kick-off',       date: `${Y}-02-01`, done: true  },
        { label: 'Q2 — Ramp-up',        date: `${Y}-05-01`, done: true  },
        { label: 'Q3 — Expansion',      date: `${Y}-08-01`, done: false },
        { label: 'Q4 — Year-end close', date: `${Y}-11-01`, done: false }
    ];
    return [
        { label: 'T1 — Kick-off',         date: `${Y}-02-01`, done: true  },
        { label: 'T2 — Montée en charge', date: `${Y}-05-01`, done: true  },
        { label: 'T3 — Expansion',        date: `${Y}-08-01`, done: false },
        { label: 'T4 — Clôture annuelle', date: `${Y}-11-01`, done: false }
    ];
}

const SCOPE_BUILDERS = {
    record:     recordPhases,
    case:       casePhases,
    service:    servicePhases,
    onboarding: onboardingPhases,
    home:       homePhases
};

const LABELS = {
    fr: { cardTitle: 'Parcours', today: "Aujourd'hui", empty: 'Aucune phase à afficher.' },
    en: { cardTitle: 'Journey',  today: 'Today',       empty: 'No phase to display.'    }
};

// Auto-detect scope from objectApiName when admin leaves scope on default.
function autoScopeForObject(objectApiName) {
    if (!objectApiName) return null;
    if (objectApiName === 'Case') return 'case';
    if (objectApiName === 'WorkOrder' || objectApiName === 'ServiceAppointment') return 'service';
    if (objectApiName === 'Contract' || objectApiName === 'Order') return 'onboarding';
    if (['Account','Opportunity','Lead','Contact'].includes(objectApiName)) return 'record';
    return null;
}

function buildPhases(scope, language) {
    const builder = SCOPE_BUILDERS[scope] || SCOPE_BUILDERS.record;
    return builder(language);
}

function defaultJsonFor(scope, language) {
    return JSON.stringify(buildPhases(scope, language), null, 2);
}

export default class SeFrTimelinePhases extends LightningElement {
    @api recordId;
    @api objectApiName;                   // auto-set by LWC on record pages
    @api language = 'fr';
    @api scope = 'auto';                  // 'auto' | 'record' | 'case' | 'service' | 'onboarding' | 'home'
    @api cardTitle;
    @api cardIcon = 'standard:timesheet';
    @api phasesJson;
    @api localeTag = 'fr-FR';
    @api hideTodayMarker = false;

    get labels() { return LABELS[this.language] || LABELS.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    get effectiveScope() {
        // Manual override wins
        if (this.scope && this.scope !== 'auto') return this.scope;
        // Then try auto-detection from the object the page is bound to
        const auto = autoScopeForObject(this.objectApiName);
        if (auto) return auto;
        // Fallback: home if no recordId (App/Home page), otherwise record
        return this.recordId ? 'record' : 'home';
    }

    get resolvedPhasesJson() {
        if (this.phasesJson && this.phasesJson.trim().length) return this.phasesJson;
        return defaultJsonFor(this.effectiveScope, this.language);
    }

    get phases() {
        let parsed;
        try { parsed = JSON.parse(this.resolvedPhasesJson); }
        catch (e) { return []; }
        if (!Array.isArray(parsed) || parsed.length === 0) return [];

        const sorted = parsed.slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        const now = Date.now();
        return sorted.map((p, i) => {
            const isFuture = p.date ? (new Date(p.date).getTime() > now) : true;
            const isDone = !!p.done;
            let stateClass = 'phase phase_pending';
            if (isDone) stateClass = 'phase phase_done';
            else if (!isFuture) stateClass = 'phase phase_current';
            return {
                id: `p${i}`,
                label: p.label || '',
                dateDisplay: this.formatDate(p.date),
                stateClass,
                connectorClass: isDone ? 'connector connector_done' : 'connector'
            };
        });
    }

    get hasPhases() { return this.phases && this.phases.length > 0; }
    get showTodayMarker() { return !this.hideTodayMarker; }

    get todayMarkerStyle() {
        const phases = this.phases;
        if (phases.length < 2) return 'display: none;';
        const raw = JSON.parse(this.resolvedPhasesJson).slice().sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
        const first = this._parseDate(raw[0].date);
        const last  = this._parseDate(raw[raw.length - 1].date);
        if (!first || !last) return 'display: none;';
        const now = Date.now();
        if (now < first || now > last) return 'display: none;';
        const pct = ((now - first) / (last - first)) * 100;
        return `left: ${pct}%;`;
    }

    _parseDate(iso) {
        if (!iso) return null;
        const t = new Date(iso).getTime();
        return Number.isNaN(t) ? null : t;
    }
    formatDate(iso) {
        if (!iso) return '';
        try { return new Date(iso).toLocaleDateString(this.localeTag, { day: '2-digit', month: 'short', year: 'numeric' }); }
        catch (e) { return ''; }
    }
}
