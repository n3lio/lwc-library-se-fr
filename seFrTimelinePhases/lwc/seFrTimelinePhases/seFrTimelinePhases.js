import { LightningElement, api } from 'lwc';

const TODAY = new Date();
const Y = TODAY.getFullYear();

// Phases for the default "record" scope — represents a customer / deal cycle (prospection →
// découverte → démo → proposition → closing). Best on Opportunity or Account record pages.
function recordPhasesFr() {
    return JSON.stringify([
        { label: 'Prospection',         date: `${Y}-02-15`, done: true },
        { label: 'Découverte',          date: `${Y}-03-10`, done: true },
        { label: 'Démo',                date: `${Y}-04-05`, done: true },
        { label: 'Proposition',         date: `${Y}-05-10`, done: false },
        { label: 'Closing',             date: `${Y}-06-20`, done: false }
    ]);
}
function recordPhasesEn() {
    return JSON.stringify([
        { label: 'Prospecting',         date: `${Y}-02-15`, done: true },
        { label: 'Discovery meeting',   date: `${Y}-03-10`, done: true },
        { label: 'Demo',                date: `${Y}-04-05`, done: true },
        { label: 'Proposal',            date: `${Y}-05-10`, done: false },
        { label: 'Closing',             date: `${Y}-06-20`, done: false }
    ]);
}

// Phases for the default "home" scope — represents global strategic milestones / fiscal periods
// so the component makes sense on a Home or App page (no record context).
function homePhasesFr() {
    return JSON.stringify([
        { label: 'T1 — Kick-off',        date: `${Y}-02-01`, done: true },
        { label: 'T2 — Montée en charge',date: `${Y}-05-01`, done: true },
        { label: 'T3 — Expansion',       date: `${Y}-08-01`, done: false },
        { label: 'T4 — Clôture annuelle',date: `${Y}-11-01`, done: false }
    ]);
}
function homePhasesEn() {
    return JSON.stringify([
        { label: 'Q1 — Kick-off',       date: `${Y}-02-01`, done: true },
        { label: 'Q2 — Ramp-up',        date: `${Y}-05-01`, done: true },
        { label: 'Q3 — Expansion',      date: `${Y}-08-01`, done: false },
        { label: 'Q4 — Year-end close', date: `${Y}-11-01`, done: false }
    ]);
}

const LABELS = {
    fr: {
        cardTitle: 'Parcours',
        today: "Aujourd'hui",
        empty: 'Aucune phase à afficher.'
    },
    en: {
        cardTitle: 'Journey',
        today: 'Today',
        empty: 'No phase to display.'
    }
};

function defaultJsonFor(scope, language) {
    if (scope === 'home') return language === 'en' ? homePhasesEn() : homePhasesFr();
    return language === 'en' ? recordPhasesEn() : recordPhasesFr();
}

export default class SeFrTimelinePhases extends LightningElement {
    @api language = 'fr';
    @api scope = 'record';             // 'record' (customer cycle) or 'home' (global milestones)
    @api cardTitle;
    @api cardIcon = 'standard:timesheet';
    @api phasesJson;
    @api localeTag = 'fr-FR';
    @api hideTodayMarker = false;

    get labels() { return LABELS[this.language] || LABELS.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedPhasesJson() {
        if (this.phasesJson && this.phasesJson.trim().length) return this.phasesJson;
        return defaultJsonFor(this.scope, this.language);
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
