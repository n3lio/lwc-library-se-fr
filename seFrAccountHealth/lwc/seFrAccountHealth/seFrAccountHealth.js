import { LightningElement, api, wire } from 'lwc';
import getSnapshot from '@salesforce/apex/SE_FR_AccountHealthController.getSnapshot';

const LABELS = {
    en: {
        cardTitle: 'Account Health',
        scoreSuffix: '/ 100',
        signalsTitle: 'Signals',
        levelExcellent: 'Excellent',
        levelHealthy: 'Healthy',
        levelWatch: 'Watch',
        levelAtRisk: 'At risk',
        levelCritical: 'Critical',
        plus: '+',
        minus: '−',
        solidRevenue: 'Solid revenue',
        lowRevenue: 'Low revenue',
        recentActivity: 'Recent activity',
        staleActivity: 'No activity in {d}d',
        recentVisit: 'Recent visit',
        staleVisit: 'No visit in {d}d',
        openOpps: '{n} open opportunities',
        openCases: '{n} open cases',
        recentOrders: '{n} recent orders (90d)',
        noRecentOrder: 'No recent order (90d)',
        npsHigh: 'NPS {n} (promoter)',
        npsLow: 'NPS {n} (detractor)',
        npsNeutral: 'NPS {n}',
        contacts: '{n} contact(s) mapped'
    },
    fr: {
        cardTitle: 'Santé du compte',
        scoreSuffix: '/ 100',
        signalsTitle: 'Signaux',
        levelExcellent: 'Excellent',
        levelHealthy: 'Bonne santé',
        levelWatch: 'À surveiller',
        levelAtRisk: 'À risque',
        levelCritical: 'Critique',
        plus: '+',
        minus: '−',
        solidRevenue: 'CA solide',
        lowRevenue: 'CA faible',
        recentActivity: 'Activité récente',
        staleActivity: "Pas d'activité depuis {d} j",
        recentVisit: 'Visite récente',
        staleVisit: 'Pas de visite depuis {d} j',
        openOpps: '{n} opp. ouvertes',
        openCases: '{n} cas ouverts',
        recentOrders: '{n} commandes récentes (90 j)',
        noRecentOrder: 'Aucune commande récente (90 j)',
        npsHigh: 'NPS {n} (promoteur)',
        npsLow: 'NPS {n} (détracteur)',
        npsNeutral: 'NPS {n}',
        contacts: '{n} contact(s) cartographié(s)'
    }
};

// Level thresholds (inclusive-lower). Tweak here to re-tune the scale globally.
function levelFor(score) {
    if (score >= 85) return { key: 'excellent', accent: '#1f8f3a', soft: '#e6f4ea' };
    if (score >= 65) return { key: 'healthy',   accent: '#2e844a', soft: '#ecf7ec' };
    if (score >= 45) return { key: 'watch',     accent: '#fe9339', soft: '#fff4d6' };
    if (score >= 25) return { key: 'atRisk',    accent: '#ba4b00', soft: '#fde6cf' };
    return                 { key: 'critical',   accent: '#b7253f', soft: '#fde2e4' };
}

export default class SeFrAccountHealth extends LightningElement {
    @api recordId;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:goals';
    @api revenueThreshold = 500000;
    @api inactivityThresholdDays = 45;
    @api staleVisitThresholdDays = 60;

    snapshot;

    @wire(getSnapshot, { accountId: '$recordId' })
    wired({ data }) { if (data) this.snapshot = data; }

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }

    // Score 0-100 computed from weighted signals. Each "positive" signal adds, each negative subtracts.
    // Start at 50 (neutral) and clamp to [0, 100]. Designed to feel intuitive, not actuarial.
    get scoreComputation() {
        const s = this.snapshot;
        if (!s) return null;

        let score = 50;
        const signals = [];
        const l = this.labels;

        // Revenue
        if (s.annualRevenue != null) {
            if (Number(s.annualRevenue) >= Number(this.revenueThreshold)) {
                score += 10; signals.push({ key: 'rev+', label: l.solidRevenue, positive: true });
            } else {
                score -= 5; signals.push({ key: 'rev-', label: l.lowRevenue, positive: false });
            }
        }

        // Activity recency
        if (s.daysSinceLastActivity != null) {
            const d = Number(s.daysSinceLastActivity);
            if (d <= Number(this.inactivityThresholdDays)) {
                score += 10; signals.push({ key: 'act+', label: l.recentActivity, positive: true });
            } else {
                score -= 10; signals.push({ key: 'act-', label: l.staleActivity.replace('{d}', d), positive: false });
            }
        }

        // Visits (optional — MAPS field)
        if (s.daysSinceLastVisit != null) {
            const d = Number(s.daysSinceLastVisit);
            if (d <= Number(this.staleVisitThresholdDays)) {
                score += 5; signals.push({ key: 'visit+', label: l.recentVisit, positive: true });
            } else {
                score -= 5; signals.push({ key: 'visit-', label: l.staleVisit.replace('{d}', d), positive: false });
            }
        }

        // Pipeline
        if (Number(s.openOpportunities) > 0) {
            score += 10; signals.push({ key: 'opps+', label: l.openOpps.replace('{n}', s.openOpportunities), positive: true });
        }

        // Service pain
        if (Number(s.openCases) >= 3) {
            score -= 15; signals.push({ key: 'cases-', label: l.openCases.replace('{n}', s.openCases), positive: false });
        } else if (Number(s.openCases) > 0) {
            score -= 5; signals.push({ key: 'cases-some', label: l.openCases.replace('{n}', s.openCases), positive: false });
        }

        // Orders
        if (Number(s.recentOrders90d) > 0) {
            score += 10; signals.push({ key: 'orders+', label: l.recentOrders.replace('{n}', s.recentOrders90d), positive: true });
        } else {
            score -= 5; signals.push({ key: 'orders-', label: l.noRecentOrder, positive: false });
        }

        // NPS (optional)
        if (s.npsScore != null) {
            const nps = Number(s.npsScore);
            if (nps >= 9) {
                score += 10; signals.push({ key: 'nps+', label: l.npsHigh.replace('{n}', nps), positive: true });
            } else if (nps <= 6) {
                score -= 10; signals.push({ key: 'nps-', label: l.npsLow.replace('{n}', nps), positive: false });
            } else {
                signals.push({ key: 'nps0', label: l.npsNeutral.replace('{n}', nps), positive: true });
            }
        }

        // Contacts (small nudge — team coverage)
        if (Number(s.totalContacts) >= 3) {
            score += 3; signals.push({ key: 'contacts', label: l.contacts.replace('{n}', s.totalContacts), positive: true });
        }

        score = Math.max(0, Math.min(100, Math.round(score)));
        return { score, signals };
    }

    get hasSnapshot() { return !!this.snapshot; }

    get levelInfo() {
        if (!this.scoreComputation) return null;
        const lvl = levelFor(this.scoreComputation.score);
        const labelKey = 'level' + lvl.key.charAt(0).toUpperCase() + lvl.key.slice(1);
        return {
            ...lvl,
            label: this.labels[labelKey]
        };
    }

    get score() { return this.scoreComputation ? this.scoreComputation.score : 0; }

    // SVG donut — stroke-dasharray trick: a circle of circumference 2πr, and we show `score`% of it.
    get gaugeAttributes() {
        const radius = 42;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference * (1 - this.score / 100);
        const lvl = this.levelInfo || { accent: '#0176d3' };
        return {
            radius,
            circumference,
            offset,
            stroke: lvl.accent
        };
    }

    get gaugeStrokeColor() { return (this.levelInfo || {}).accent || '#0176d3'; }
    get gaugeCircumference() { return this.gaugeAttributes.circumference; }
    get gaugeOffset() { return this.gaugeAttributes.offset; }

    get signals() {
        if (!this.scoreComputation) return [];
        return this.scoreComputation.signals.map((sig, i) => ({
            key: `${sig.key}-${i}`,
            label: sig.label,
            chipClass: sig.positive ? 'signal signal_pos' : 'signal signal_neg',
            sign: sig.positive ? this.labels.plus : this.labels.minus
        }));
    }

    get cardAccentStyle() {
        const accent = this.gaugeStrokeColor;
        const soft = (this.levelInfo || {}).soft || '#eef4fb';
        return `--se-accent: ${accent}; --se-accent-soft: ${soft};`;
    }
}
