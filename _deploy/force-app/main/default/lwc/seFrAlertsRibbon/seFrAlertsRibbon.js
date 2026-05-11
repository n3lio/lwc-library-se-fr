import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord } from 'lightning/uiRecordApi';

const LABELS = {
    en: {
        cardTitle: 'Alerts',
        dismiss: 'Dismiss',
        info: 'Info',
        warning: 'Warning',
        error: 'Critical',
        success: 'OK'
    },
    fr: {
        cardTitle: 'Alertes',
        dismiss: 'Ignorer',
        info: 'Info',
        warning: 'Attention',
        error: 'Critique',
        success: 'OK'
    }
};

// Severity metadata — soft pastel background + saturated accent + matching icon.
const SEVERITY = {
    info:    { icon: 'utility:info_alt',     accent: '#0176d3', soft: '#ECF5FC' },
    success: { icon: 'utility:success',      accent: '#2E844A', soft: '#E5F5EA' },
    warning: { icon: 'utility:warning',      accent: '#FE9339', soft: '#FFF4DB' },
    error:   { icon: 'utility:error',        accent: '#BA0517', soft: '#FCEBEB' }
};

const OPERATORS = new Set(['=', '!=', '>', '<', '>=', '<=', 'contains', 'startsWith', 'endsWith', 'isBlank', 'isNotBlank']);

/**
 * Rule grammar (one per line, or comma-separated). Each rule:
 *   <field><op><value>|<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>
 * Static alert grammar (rules-less, always shown):
 *   <severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>
 */
function parseRules(csv) {
    if (!csv) return [];
    const lines = csv.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const line of lines) {
        const parts = line.split('|');
        if (parts.length < 2) continue;
        const [condRaw, severity, icon, message, ctaLabel, ctaUrl] = parts;
        let op, field, value;
        const trimCond = condRaw.trim();
        const mUnary = trimCond.match(/^([A-Za-z0-9_.]+)\s+(isBlank|isNotBlank)$/);
        if (mUnary) {
            field = mUnary[1]; op = mUnary[2]; value = null;
        } else {
            for (const candidate of ['>=', '<=', '!=', '=', '>', '<', ' contains ', ' startsWith ', ' endsWith ']) {
                const idx = trimCond.indexOf(candidate);
                if (idx > 0) {
                    field = trimCond.substring(0, idx).trim();
                    op = candidate.trim();
                    value = trimCond.substring(idx + candidate.length).trim();
                    break;
                }
            }
        }
        if (!field || !op || !OPERATORS.has(op)) continue;
        out.push({
            field, op, value,
            severity: (severity || 'info').trim().toLowerCase(),
            icon: (icon || '').trim(),
            message: (message || '').trim(),
            ctaLabel: (ctaLabel || '').trim(),
            ctaUrl: (ctaUrl || '').trim()
        });
    }
    return out;
}

function parseStaticAlerts(csv) {
    if (!csv) return [];
    const lines = csv.split(/\n/).map(s => s.trim()).filter(Boolean);
    return lines.map(line => {
        const [severity, icon, message, ctaLabel, ctaUrl] = line.split('|').map(s => (s || '').trim());
        return {
            severity: (severity || 'info').toLowerCase(),
            icon: icon || '',
            message: message || '',
            ctaLabel: ctaLabel || '',
            ctaUrl: ctaUrl || ''
        };
    });
}

function evalRule(rule, recordValue) {
    const v = recordValue;
    switch (rule.op) {
        case '=':         return String(v) === rule.value;
        case '!=':        return String(v) !== rule.value;
        case '>':         return Number(v) > Number(rule.value);
        case '<':         return Number(v) < Number(rule.value);
        case '>=':        return Number(v) >= Number(rule.value);
        case '<=':        return Number(v) <= Number(rule.value);
        case 'contains':  return (v || '').toString().toLowerCase().includes(rule.value.toLowerCase());
        case 'startsWith':return (v || '').toString().toLowerCase().startsWith(rule.value.toLowerCase());
        case 'endsWith':  return (v || '').toString().toLowerCase().endsWith(rule.value.toLowerCase());
        case 'isBlank':   return v === null || v === undefined || v === '';
        case 'isNotBlank':return v !== null && v !== undefined && v !== '';
        default:          return false;
    }
}

export default class SeFrAlertsRibbon extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';

    // Rules evaluated against the current record (Record Page only). Pipe-separated grammar
    // documented in `parseRules`. When the component is placed on a Home / App Page, only
    // `staticAlertsCsv` is read.
    @api rulesCsv = '';

    // Static alerts — always shown regardless of record context. Useful on Home / App Pages
    // (system status banners, release announcements, demo-mode disclaimers).
    @api staticAlertsCsv = '';

    // Visual style. 'card' wraps the ribbon in a lightning-card chrome (with title + count
    // pill). 'inline' (default) renders just the alerts stacked, no card chrome.
    @api visualStyle = 'inline';

    // 'banner' (default — soft pastel + accent border-left) | 'solid' (saturated background)
    // | 'minimal' (just the accent bar + white background, ultra-sober).
    @api alertVariant = 'banner';

    // Layout density: 'comfortable' (default — full message + CTA wrapped) | 'compact'
    // (single-line, message truncated with ellipsis).
    @api density = 'comfortable';

    @api cardTitle;
    @api cardIcon = 'standard:announcement';
    @api hideDismissButton = false;
    // Cap rendering. 0 = unlimited.
    @api maxAlerts = 0;
    // Stick to the top of the viewport on scroll. Off by default.
    @api stickyOnScroll = false;

    @track dismissed = new Set();
    @track record;

    get labels() { return LABELS[this.language] || LABELS.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    get parsedRules() { return parseRules(this.rulesCsv); }
    get parsedStaticAlerts() { return parseStaticAlerts(this.staticAlertsCsv); }

    get fieldsToQuery() {
        const fields = new Set();
        for (const r of this.parsedRules) {
            if (r.field && this.objectApiName) fields.add(`${this.objectApiName}.${r.field}`);
        }
        return Array.from(fields);
    }

    @wire(getRecord, { recordId: '$recordId', fields: '$fieldsToQuery' })
    wiredRecord({ data }) { if (data) this.record = data; }

    // Build alert list — combines rule-matched + static alerts, applies dismissed filter,
    // caps to maxAlerts.
    get matchedAlerts() {
        const out = [];
        // 1) Rule-driven alerts (need a record loaded)
        if (this.record) {
            this.parsedRules.forEach((r, i) => {
                const key = `r${i}`;
                if (this.dismissed.has(key)) return;
                const cell = this.record.fields && this.record.fields[r.field];
                const value = cell ? cell.value : null;
                if (!evalRule(r, value)) return;
                out.push(this._buildAlert(key, r));
            });
        }
        // 2) Static alerts (always evaluated)
        this.parsedStaticAlerts.forEach((a, i) => {
            const key = `s${i}`;
            if (this.dismissed.has(key)) return;
            if (!a.message) return;
            out.push(this._buildAlert(key, a));
        });
        const cap = Math.max(0, Number(this.maxAlerts) || 0);
        return cap > 0 ? out.slice(0, cap) : out;
    }

    _buildAlert(id, rawAlert) {
        const meta = SEVERITY[rawAlert.severity] || SEVERITY.info;
        return {
            id,
            severity: rawAlert.severity,
            severityLabel: this.labels[rawAlert.severity] || this.labels.info,
            message: rawAlert.message,
            icon: rawAlert.icon || meta.icon,
            ctaLabel: rawAlert.ctaLabel,
            ctaUrl: rawAlert.ctaUrl,
            hasCta: !!(rawAlert.ctaLabel && rawAlert.ctaUrl),
            style: `--alert-accent: ${meta.accent}; --alert-soft: ${meta.soft};`,
            alertClass: this._alertClass(rawAlert.severity)
        };
    }

    _alertClass(severity) {
        const variant = this.alertVariant === 'solid' ? 'alert_solid'
            : this.alertVariant === 'minimal' ? 'alert_minimal'
            : 'alert_banner';
        const dens = this.density === 'compact' ? 'alert_compact' : 'alert_comfortable';
        return `alert ${variant} ${dens} alert_${severity}`;
    }

    get hasAlerts() { return this.matchedAlerts.length > 0; }
    get showDismiss() { return !this.hideDismissButton; }
    get showCardWrapper() { return this.visualStyle === 'card'; }
    get countDisplay() { return this.matchedAlerts.length; }
    get ribbonClass() {
        const base = 'ribbon';
        return this.stickyOnScroll ? base + ' ribbon_sticky' : base;
    }

    handleDismiss(event) {
        const id = event.currentTarget.dataset.id;
        const next = new Set(this.dismissed);
        next.add(id);
        this.dismissed = next;
    }

    handleCta(event) {
        const url = event.currentTarget.dataset.url;
        if (!url) return;
        event.stopPropagation();
        if (/^https?:\/\//i.test(url)) { window.open(url, '_blank'); return; }
        this[NavigationMixin.Navigate]({ type: 'standard__webPage', attributes: { url } });
    }
}
