import { LightningElement, api, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import summarizeVisit from '@salesforce/apex/SE_FR_VisitSummaryController.summarizeVisit';
import VISIT_NAME from '@salesforce/schema/Visit__c.Name';
import VISIT_STATE from '@salesforce/schema/Visit__c.VisitState__c';
import VISIT_CHECKIN from '@salesforce/schema/Visit__c.CheckInDateTime__c';
import VISIT_CHECKOUT from '@salesforce/schema/Visit__c.CheckOutDateTime__c';
import VISIT_ACCOUNT_NAME from '@salesforce/schema/Visit__c.Account__r.Name';

/**
 * CCO FR — Visit Summary AI
 *
 * Agentforce / Einstein-powered summary for a Visit__c record. Enriches the Einstein prompt
 * with client-side context captured by sibling components during the visit (progress steps,
 * shelf PDL insights, product check ruptures/price alerts, cadencier order lines). Falls
 * back to a rich deterministic summary built client-side when Einstein is unavailable or
 * returns a thin response.
 */

const PROGRESS_KEY_PREFIX = 'sefr-visit-progress::';
const SHELF_INSIGHTS_KEY_PREFIX = 'sefr-shelf-insights::';
const SHELF_DATA_KEY_PREFIX = 'sefr-shelf-data::';
const PRODUCT_CHECK_KEY_PREFIX = 'sefr-product-check::';
const VISIT_INSIGHTS_KEY_PREFIX = 'sefr-visit-insights::';
const ORDER_DRAFT_KEY_PREFIX = 'sefr-order-draft::';

const MAX_NAMES_INLINE = 6;

const LABELS = {
    fr: {
        title: 'Compte-rendu de visite',
        emptyText: 'Synthèse automatique des relevés et actions de la visite.',
        contextSignalsPrefix: 'Signaux captés : ',
        contextStepsLabel: 'étapes bouclées',
        contextShelfLabel: 'relevé de linéaire',
        contextProductsLabel: 'relevé produits',
        contextOrderLabel: 'commande saisie',
        generate: 'Générer le compte-rendu',
        generating: 'Analyse en cours…',
        regenerate: 'Régénérer',
        sendToManager: 'Envoyer au manager',
        sentConfirmation: 'Compte-rendu envoyé',
        sectionSummary: 'Synthèse',
        sectionKeyPoints: 'Points clés',
        sectionActions: 'Actions recommandées',
        generatedOn: 'Généré le',
        errorNonJson: 'Réponse Einstein non JSON — synthèse en texte brut.',
        errorToastTitle: 'Compte-rendu indisponible',
        narrativeVisitAt: 'Visite chez',
        narrativeDuration: 'durée',
        unitMinutes: 'min',
        unitHours: 'h',
        fallbackNoAccount: 'ce client',
        shelfLead: 'Part de linéaire marque',
        shelfVs: 'vs concurrence',
        shelfTrendUp: 'en progression de',
        shelfTrendDown: 'en recul de',
        shelfFacings: 'facings',
        ruptures: 'Ruptures',
        priceAlerts: 'Alertes prix',
        lowPdl: 'Segments sous-exposés',
        topSegments: 'Segments où la marque domine',
        orderDrafted: 'Commande saisie',
        orderLines: 'lignes',
        orderUnits: 'unités',
        notesCount: 'notes terrain',
        actionRupture: 'Relancer le réassort auprès du siège sur',
        actionShelf: 'Négocier +1 facing sur',
        actionShelfBrand: 'Négocier +1 facing avec le chef de rayon (part marque sous 30 %).',
        actionPrice: 'Partager les alertes prix à la cellule promo :',
        actionNoOrder: 'Déclencher une commande de rattrapage pour couvrir les ruptures.',
        actionDefault: 'Programmer la prochaine visite dans 4 semaines.',
        kpAccount: 'Compte',
        kpOwner: 'Commercial',
        kpDuration: 'Durée',
        kpCheckin: 'Check-in',
        kpCheckout: 'Check-out',
        kpPdl: 'PDL marque',
        kpRuptures: 'Ruptures',
        kpPriceAlerts: 'Alertes prix',
        kpProducts: 'Produits relevés',
        kpOrderLines: 'Lignes commande',
        kpOrderTotal: 'Montant commande',
        andMore: 'autres'
    },
    en: {
        title: 'Visit debrief',
        emptyText: 'Automatic summary of the visit based on captured checks and actions.',
        contextSignalsPrefix: 'Signals captured: ',
        contextStepsLabel: 'steps done',
        contextShelfLabel: 'shelf check',
        contextProductsLabel: 'product check',
        contextOrderLabel: 'order drafted',
        generate: 'Generate debrief',
        generating: 'Analyzing…',
        regenerate: 'Regenerate',
        sendToManager: 'Send to manager',
        sentConfirmation: 'Debrief sent',
        sectionSummary: 'Summary',
        sectionKeyPoints: 'Key points',
        sectionActions: 'Recommended actions',
        generatedOn: 'Generated on',
        errorNonJson: 'Einstein response was not JSON — showing as plain text.',
        errorToastTitle: 'Debrief unavailable',
        narrativeVisitAt: 'Visit at',
        narrativeDuration: 'duration',
        unitMinutes: 'min',
        unitHours: 'h',
        fallbackNoAccount: 'the customer',
        shelfLead: 'Brand shelf share',
        shelfVs: 'vs competition',
        shelfTrendUp: 'up by',
        shelfTrendDown: 'down by',
        shelfFacings: 'facings',
        ruptures: 'Out-of-stock',
        priceAlerts: 'Price alerts',
        lowPdl: 'Under-exposed segments',
        topSegments: 'Segments where the brand leads',
        orderDrafted: 'Order drafted',
        orderLines: 'lines',
        orderUnits: 'units',
        notesCount: 'field notes',
        actionRupture: 'Chase replenishment at HQ for',
        actionShelf: 'Negotiate +1 facing on',
        actionShelfBrand: 'Negotiate +1 facing with the category manager (brand share below 30%).',
        actionPrice: 'Share the price alerts with the promo team:',
        actionNoOrder: 'Trigger a top-up order to cover the ruptures.',
        actionDefault: 'Schedule the next visit in 4 weeks.',
        kpAccount: 'Account',
        kpOwner: 'Sales rep',
        kpDuration: 'Duration',
        kpCheckin: 'Check-in',
        kpCheckout: 'Check-out',
        kpPdl: 'Brand shelf share',
        kpRuptures: 'Out-of-stock',
        kpPriceAlerts: 'Price alerts',
        kpProducts: 'Products audited',
        kpOrderLines: 'Order lines',
        kpOrderTotal: 'Order amount',
        andMore: 'more'
    }
};

export default class SeFrVisitSummaryAI extends LightningElement {
    @api recordId;
    /** 'fr' | 'en' — defaults to 'fr' (lib convention). */
    @api language = 'fr';
    /** Optional card title override (otherwise translated default). */
    @api cardTitle;
    /** Lightning icon used in the standard card header. */
    @api cardIcon = 'standard:document';
    /** DeveloperName of an Einstein Prompt Template that takes an Input:Visit__c
     *  plus an Input:ClientContext (string) and returns a JSON `{summary, keyPoints[],
     *  actions[]}`. If blank, a rich deterministic summary is built from the
     *  sibling-component context + Visit fields. */
    @api promptTemplateApiName = '';

    summary = '';
    narrativeLines = []; // [{ key, text }]
    keyPoints = [];      // [{ key, label, value }]
    actions = [];        // [{ key, text }]
    isLoading = false;
    generatedDate = '';
    sentConfirmation = false;
    errorMessage = '';

    _visit;

    @wire(getRecord, {
        recordId: '$recordId',
        fields: [VISIT_NAME, VISIT_STATE, VISIT_CHECKIN, VISIT_CHECKOUT, VISIT_ACCOUNT_NAME]
    })
    wiredVisit({ data }) {
        if (data) this._visit = data;
    }

    get t() { return LABELS[this.language] || LABELS.fr; }
    get effectiveTitle() { return this.cardTitle || this.t.title; }
    get effectiveIcon() { return this.cardIcon || 'standard:document'; }

    // ------------------------------------------------------------------
    //  Context collection
    // ------------------------------------------------------------------
    _readJson(prefix) {
        if (!this.recordId) return null;
        try {
            const raw = window.localStorage.getItem(prefix + this.recordId);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    _collectContext() {
        return {
            progress: this._readJson(PROGRESS_KEY_PREFIX) || {},
            shelfInsights: this._readJson(SHELF_INSIGHTS_KEY_PREFIX) || {},
            shelfData: this._readJson(SHELF_DATA_KEY_PREFIX) || {},
            productCheck: this._readJson(PRODUCT_CHECK_KEY_PREFIX) || {},
            visitInsights: this._readJson(VISIT_INSIGHTS_KEY_PREFIX) || {},
            orderDraft: this._readJson(ORDER_DRAFT_KEY_PREFIX) || {}
        };
    }

    _nameList(items, max = MAX_NAMES_INLINE) {
        if (!Array.isArray(items) || !items.length) return '';
        const names = items.map(i => (typeof i === 'string' ? i : (i.name || i.segment || i.code || ''))).filter(Boolean);
        if (!names.length) return '';
        if (names.length <= max) return names.join(', ');
        return `${names.slice(0, max).join(', ')} (+${names.length - max} ${this.t.andMore})`;
    }

    _segmentList(items, max = MAX_NAMES_INLINE) {
        if (!Array.isArray(items) || !items.length) return '';
        const labels = items.map(s => {
            if (!s || typeof s !== 'object') return String(s);
            const name = s.segment || s.name || s.category || '';
            return s.pdl != null ? `${name} (${s.pdl} %)` : name;
        }).filter(Boolean);
        if (labels.length <= max) return labels.join(', ');
        return `${labels.slice(0, max).join(', ')} (+${labels.length - max} ${this.t.andMore})`;
    }

    _formatMoney(n, iso) {
        if (n == null) return '';
        try {
            return new Intl.NumberFormat(this.language === 'en' ? 'en-US' : 'fr-FR', {
                style: 'currency',
                currency: iso || (this.language === 'en' ? 'USD' : 'EUR'),
                maximumFractionDigits: 2
            }).format(n);
        } catch (e) { return `${n}`; }
    }

    _formatDuration(mins) {
        if (mins == null || isNaN(mins)) return '';
        const m = Math.max(0, Math.round(mins));
        return m >= 60
            ? `${Math.floor(m / 60)} ${this.t.unitHours} ${String(m % 60).padStart(2, '0')}`
            : `${m} ${this.t.unitMinutes}`;
    }

    _actualDurationMins() {
        const ci = this._visit && getFieldValue(this._visit, VISIT_CHECKIN);
        const co = this._visit && getFieldValue(this._visit, VISIT_CHECKOUT);
        if (!ci || !co) return null;
        const mins = (new Date(co) - new Date(ci)) / 60000;
        return mins >= 0 && mins < 24 * 60 ? mins : null; // sanity cap at a day
    }

    _formatDateTime(iso) {
        const locale = this.language === 'fr' ? 'fr-FR' : 'en-US';
        try {
            return new Date(iso).toLocaleString(locale, {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch (e) { return iso; }
    }

    /**
     * Rich context text we hand to Einstein (Input:ClientContext). Uses actual product
     * and segment names so the prompt can author sentences by name.
     */
    _buildClientContext() {
        const ctx = this._collectContext();
        const lines = [];

        const accountName = this._visit ? getFieldValue(this._visit, VISIT_ACCOUNT_NAME) : null;
        const visitName = this._visit ? getFieldValue(this._visit, VISIT_NAME) : null;
        const state = this._visit ? getFieldValue(this._visit, VISIT_STATE) : null;
        const durMins = this._actualDurationMins();
        if (accountName) lines.push(`Account: ${accountName}.`);
        if (visitName) lines.push(`Visit: ${visitName}${state ? ` (state: ${state})` : ''}.`);
        if (durMins != null) lines.push(`Actual duration: ${Math.round(durMins)} min.`);

        const stepsDone = Object.keys(ctx.progress).filter(k => ctx.progress[k]?.done);
        if (stepsDone.length) lines.push(`Steps completed: ${stepsDone.join(', ')}.`);

        const si = ctx.shelfInsights;
        if (si && typeof si.brandSharePct === 'number') {
            const competition = typeof si.competitionSharePct === 'number' ? si.competitionSharePct : (100 - si.brandSharePct);
            lines.push(`Brand shelf share (PDL): ${si.brandSharePct}% vs competition ${competition}% over ${si.segmentsCount || '?'} segments.`);
        }
        if (si && typeof si.deltaFacings === 'number' && si.deltaFacings !== 0) {
            lines.push(`Brand facings delta vs previous visit: ${si.deltaFacings > 0 ? '+' : ''}${si.deltaFacings}.`);
        }
        if (Array.isArray(si?.lowPdl) && si.lowPdl.length) {
            lines.push(`Under-exposed segments (PDL < 30% or declining): ${si.lowPdl.map(s => `${s.segment} ${s.pdl}%`).join(', ')}.`);
        }
        if (Array.isArray(si?.topSegments) && si.topSegments.length) {
            lines.push(`Top segments: ${si.topSegments.map(s => `${s.segment} ${s.pdl}%`).join(', ')}.`);
        }

        const pc = ctx.productCheck;
        if (pc && typeof pc.items === 'number') {
            lines.push(`Products audited: ${pc.audited || 0} / ${pc.items}.`);
        }
        if (Array.isArray(pc?.ruptures) && pc.ruptures.length) {
            lines.push(`Out-of-stock SKUs (${pc.ruptures.length}): ${pc.ruptures.map(r => r.name).join(', ')}.`);
        }
        if (Array.isArray(pc?.priceAlerts) && pc.priceAlerts.length) {
            lines.push(`Price alerts (${pc.priceAlerts.length}): ${pc.priceAlerts.map(p => `${p.name} observed ${p.observedPrice}€ vs list ${p.listPrice}€${p.deltaPct != null ? ` (${p.deltaPct > 0 ? '+' : ''}${p.deltaPct}%)` : ''}`).join('; ')}.`);
        }
        if (Array.isArray(pc?.notes) && pc.notes.length) {
            lines.push(`Field notes: ${pc.notes.map(n => `${n.name}: "${n.note}"`).join(' | ')}.`);
        }

        const od = ctx.orderDraft;
        if (Array.isArray(od?.lines) && od.lines.length) {
            const topLines = od.lines.slice(0, 5).map(l => `${l.quantity}× ${l.name}`).join(', ');
            lines.push(`Order drafted: ${od.lines.length} lines / ${od.totalUnits || 0} units / ${od.totalAmount || 0}€ — top: ${topLines}.`);
        }

        return { text: lines.join('\n'), ctx };
    }

    // ------------------------------------------------------------------
    //  Empty-state signals
    // ------------------------------------------------------------------
    get hasContextSignals() {
        const ctx = this._collectContext();
        return Object.keys(ctx.progress).length > 0
            || (ctx.shelfInsights && Object.keys(ctx.shelfInsights).length > 0)
            || (ctx.productCheck && (
                (Array.isArray(ctx.productCheck.ruptures) && ctx.productCheck.ruptures.length) ||
                (Array.isArray(ctx.productCheck.priceAlerts) && ctx.productCheck.priceAlerts.length) ||
                ctx.productCheck.items > 0
            ))
            || (ctx.orderDraft && Array.isArray(ctx.orderDraft.lines) && ctx.orderDraft.lines.length > 0);
    }

    get contextSignalsLabel() {
        const ctx = this._collectContext();
        const bits = [];
        const nSteps = Object.keys(ctx.progress).filter(k => ctx.progress[k]?.done).length;
        if (nSteps) bits.push(`${nSteps} ${this.t.contextStepsLabel}`);
        if (ctx.shelfInsights && Object.keys(ctx.shelfInsights).length) bits.push(this.t.contextShelfLabel);
        if (ctx.productCheck && (
            (Array.isArray(ctx.productCheck.ruptures) && ctx.productCheck.ruptures.length) ||
            ctx.productCheck.items > 0
        )) bits.push(this.t.contextProductsLabel);
        if (ctx.orderDraft && Array.isArray(ctx.orderDraft.lines) && ctx.orderDraft.lines.length) bits.push(this.t.contextOrderLabel);
        return this.t.contextSignalsPrefix + bits.join(' · ');
    }

    // ------------------------------------------------------------------
    //  Einstein call + fallback merge
    // ------------------------------------------------------------------
    async generateSummary() {
        this.isLoading = true;
        this.errorMessage = '';
        const { text: clientContext, ctx } = this._buildClientContext();
        try {
            const raw = await summarizeVisit({
                recordId: this.recordId,
                promptTemplateApiName: this.promptTemplateApiName,
                clientContext
            });
            let data;
            let jsonParsed = true;
            try {
                data = JSON.parse(raw);
            } catch (parseErr) {
                this.errorMessage = this.t.errorNonJson;
                data = { summary: raw || '', keyPoints: [], actions: [] };
                jsonParsed = false;
            }
            // Build the rich fallback regardless. We always render our structured narrative
            // + key points (because Einstein usually can't produce clean typed KP objects),
            // then layer Einstein's prose/actions on top if it came back with structured
            // JSON. If Einstein returned flat non-JSON text, discard it entirely to avoid
            // surfacing stale/raw strings in the UI headline.
            const rich = this._buildFallbackSummary(ctx);
            const einsteinUseful = jsonParsed && typeof data.summary === 'string' && data.summary.trim().length >= 80;
            const merged = {
                summary: einsteinUseful ? data.summary.trim() : rich.summary,
                narrativeLines: rich.narrativeLines,
                keyPoints: rich.keyPoints,
                actions: this._mergeActions(rich.actions, (jsonParsed && Array.isArray(data.actions)) ? data.actions : [])
            };
            if (jsonParsed && Array.isArray(data.keyPoints) && data.keyPoints.length) {
                const existingSig = new Set(merged.keyPoints.map(k => (k.label || '') + '|' + (k.value || '')));
                data.keyPoints.forEach((kp, idx) => {
                    if (typeof kp === 'string') {
                        const sig = '|' + kp;
                        if (!existingSig.has(sig)) {
                            merged.keyPoints.push({ key: 'einstein-kp-' + idx, label: '', value: kp });
                            existingSig.add(sig);
                        }
                    } else if (kp && typeof kp === 'object') {
                        const sig = (kp.label || '') + '|' + (kp.value || '');
                        if (!existingSig.has(sig)) {
                            merged.keyPoints.push({ key: 'einstein-kp-' + idx, label: kp.label || '', value: kp.value || '' });
                            existingSig.add(sig);
                        }
                    }
                });
            }
            this._applyGenerated(merged);
            this._publishProgress();
        } catch (e) {
            const rich = this._buildFallbackSummary(ctx);
            this._applyGenerated(rich);
            this._publishProgress();
            const msg = e.body?.message || e.message || 'Einstein error.';
            this.errorMessage = msg;
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.errorToastTitle,
                message: msg,
                variant: 'warning'
            }));
        } finally {
            this.isLoading = false;
        }
    }

    _mergeActions(richActions, extra) {
        const seen = new Set(richActions.map(a => a.text));
        const out = [...richActions];
        extra.forEach((a, idx) => {
            const text = typeof a === 'string' ? a : (a && a.text) || '';
            if (text && !seen.has(text)) {
                out.push({ key: 'einstein-act-' + idx, text });
                seen.add(text);
            }
        });
        return out;
    }

    _applyGenerated(data) {
        this.summary = data.summary || '';
        this.narrativeLines = Array.isArray(data.narrativeLines) ? data.narrativeLines : [];
        this.keyPoints = Array.isArray(data.keyPoints) ? data.keyPoints : [];
        this.actions = Array.isArray(data.actions) ? data.actions : [];
        const locale = this.language === 'fr' ? 'fr-FR' : 'en-US';
        this.generatedDate = new Date().toLocaleDateString(locale, {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    _publishProgress() {
        if (!this.recordId) return;
        try {
            const key = PROGRESS_KEY_PREFIX + this.recordId;
            const raw = window.localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            obj.summary = { done: true, at: new Date().toISOString() };
            window.localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) { /* ignore */ }
    }

    // ------------------------------------------------------------------
    //  Deterministic rich fallback — reads the sibling-captured context +
    //  Visit fields and produces a structured output with named products.
    // ------------------------------------------------------------------
    _buildFallbackSummary(ctx) {
        const t = this.t;
        const accountName = (this._visit && getFieldValue(this._visit, VISIT_ACCOUNT_NAME)) || t.fallbackNoAccount;
        const checkIn = this._visit && getFieldValue(this._visit, VISIT_CHECKIN);
        const checkOut = this._visit && getFieldValue(this._visit, VISIT_CHECKOUT);
        const durMins = this._actualDurationMins();
        const durationLabel = durMins != null ? this._formatDuration(durMins) : '';

        const si = ctx.shelfInsights || {};
        const pc = ctx.productCheck || {};
        const od = ctx.orderDraft || {};

        // Headline
        const lead = `${t.narrativeVisitAt} ${accountName}${durationLabel ? ` (${t.narrativeDuration} ${durationLabel})` : ''}.`;

        // Narrative lines (one <p> each in the UI)
        const narrativeLines = [];

        if (typeof si.brandSharePct === 'number') {
            const comp = typeof si.competitionSharePct === 'number' ? si.competitionSharePct : (100 - si.brandSharePct);
            let line = `${t.shelfLead} à ${si.brandSharePct} % ${t.shelfVs} ${comp} %`;
            if (si.brandFacings != null && si.totalFacings != null) {
                line += ` (${si.brandFacings}/${si.totalFacings} ${t.shelfFacings})`;
            }
            if (si.deltaFacings) {
                line += `, ${si.deltaFacings > 0 ? t.shelfTrendUp : t.shelfTrendDown} ${Math.abs(si.deltaFacings)} ${t.shelfFacings}`;
            }
            line += '.';
            narrativeLines.push({ key: 'shelf-share', text: line });
        }

        if (Array.isArray(si.lowPdl) && si.lowPdl.length) {
            narrativeLines.push({
                key: 'low-pdl',
                text: `${t.lowPdl} : ${this._segmentList(si.lowPdl)}.`
            });
        }

        if (Array.isArray(pc.ruptures) && pc.ruptures.length) {
            narrativeLines.push({
                key: 'ruptures',
                text: `${t.ruptures} (${pc.ruptures.length}) : ${this._nameList(pc.ruptures)}.`
            });
        }

        if (Array.isArray(pc.priceAlerts) && pc.priceAlerts.length) {
            const items = pc.priceAlerts.map(p => {
                const obs = this._formatMoney(p.observedPrice, p.currencyIsoCode) || `${p.observedPrice}€`;
                const list = this._formatMoney(p.listPrice, p.currencyIsoCode) || `${p.listPrice}€`;
                const delta = p.deltaPct != null ? ` ${p.deltaPct > 0 ? '+' : ''}${p.deltaPct}%` : '';
                return `${p.name} ${obs} (vs ${list}${delta})`;
            });
            narrativeLines.push({
                key: 'price-alerts',
                text: `${t.priceAlerts} (${pc.priceAlerts.length}) : ${items.slice(0, MAX_NAMES_INLINE).join(' · ')}${items.length > MAX_NAMES_INLINE ? ` (+${items.length - MAX_NAMES_INLINE} ${t.andMore})` : ''}.`
            });
        }

        if (Array.isArray(od.lines) && od.lines.length) {
            const topLines = od.lines.slice(0, 3).map(l => `${l.quantity}× ${l.name}`).join(', ');
            const amount = od.totalAmount != null ? this._formatMoney(od.totalAmount) : '';
            narrativeLines.push({
                key: 'order',
                text: `${t.orderDrafted} : ${od.lines.length} ${t.orderLines}, ${od.totalUnits || 0} ${t.orderUnits}${amount ? ` (${amount})` : ''} — ${topLines}${od.lines.length > 3 ? `, +${od.lines.length - 3} ${t.andMore}` : ''}.`
            });
        }

        if (Array.isArray(pc.notes) && pc.notes.length) {
            narrativeLines.push({
                key: 'notes',
                text: `${pc.notes.length} ${t.notesCount} : ${pc.notes.slice(0, 2).map(n => `${n.name} — « ${n.note} »`).join(' ; ')}${pc.notes.length > 2 ? ` (+${pc.notes.length - 2} ${t.andMore})` : ''}.`
            });
        }

        const summary = narrativeLines.length ? `${lead} ${narrativeLines.map(l => l.text).join(' ')}` : lead;

        // Key points
        const keyPoints = [];
        if (accountName && accountName !== t.fallbackNoAccount) keyPoints.push({ key: 'kp-account', label: t.kpAccount, value: accountName });
        if (durationLabel) keyPoints.push({ key: 'kp-dur', label: t.kpDuration, value: durationLabel });
        if (checkIn) keyPoints.push({ key: 'kp-ci', label: t.kpCheckin, value: this._formatDateTime(checkIn) });
        if (checkOut) keyPoints.push({ key: 'kp-co', label: t.kpCheckout, value: this._formatDateTime(checkOut) });
        if (typeof si.brandSharePct === 'number') keyPoints.push({ key: 'kp-pdl', label: t.kpPdl, value: `${si.brandSharePct} %` });
        if (Array.isArray(pc.ruptures) && pc.ruptures.length) keyPoints.push({ key: 'kp-rup', label: t.kpRuptures, value: `${pc.ruptures.length} — ${this._nameList(pc.ruptures, 3)}` });
        if (Array.isArray(pc.priceAlerts) && pc.priceAlerts.length) keyPoints.push({ key: 'kp-pa', label: t.kpPriceAlerts, value: `${pc.priceAlerts.length} — ${this._nameList(pc.priceAlerts, 3)}` });
        if (pc.items > 0) keyPoints.push({ key: 'kp-items', label: t.kpProducts, value: `${pc.audited || 0} / ${pc.items}` });
        if (Array.isArray(od.lines) && od.lines.length) {
            keyPoints.push({ key: 'kp-ol', label: t.kpOrderLines, value: `${od.lines.length} (${od.totalUnits || 0} ${t.orderUnits})` });
            if (od.totalAmount != null) keyPoints.push({ key: 'kp-oa', label: t.kpOrderTotal, value: this._formatMoney(od.totalAmount) });
        }

        // Actions (contextualized with names)
        const actions = [];
        if (Array.isArray(pc.ruptures) && pc.ruptures.length) {
            actions.push({ key: 'a-rup', text: `${t.actionRupture} ${this._nameList(pc.ruptures, 4)}.` });
        }
        if (Array.isArray(si.lowPdl) && si.lowPdl.length) {
            actions.push({ key: 'a-shelf', text: `${t.actionShelf} ${this._segmentList(si.lowPdl, 4)}.` });
        } else if (typeof si.brandSharePct === 'number' && si.brandSharePct < 30) {
            actions.push({ key: 'a-shelf-brand', text: t.actionShelfBrand });
        }
        if (Array.isArray(pc.priceAlerts) && pc.priceAlerts.length) {
            actions.push({ key: 'a-price', text: `${t.actionPrice} ${this._nameList(pc.priceAlerts, 4)}.` });
        }
        if (Array.isArray(pc.ruptures) && pc.ruptures.length && !(Array.isArray(od.lines) && od.lines.length)) {
            actions.push({ key: 'a-no-order', text: t.actionNoOrder });
        }
        if (!actions.length) actions.push({ key: 'a-default', text: t.actionDefault });

        return { summary, narrativeLines, keyPoints, actions };
    }

    // ------------------------------------------------------------------
    //  UI buttons / state
    // ------------------------------------------------------------------
    regenerate() {
        this.summary = '';
        this.narrativeLines = [];
        this.keyPoints = [];
        this.actions = [];
        this.generateSummary();
    }

    sendToManager() {
        this.sentConfirmation = true;
        setTimeout(() => { this.sentConfirmation = false; }, 3000);
    }

    get hasContent() {
        return !!(this.summary || this.narrativeLines.length > 0 || this.keyPoints.length > 0 || this.actions.length > 0);
    }
    get hasNarrativeLines() { return this.narrativeLines && this.narrativeLines.length > 0; }
    get hasKeyPoints() { return this.keyPoints && this.keyPoints.length > 0; }
    get hasActions() { return this.actions && this.actions.length > 0; }
    get showEmptyState() { return !this.hasContent && !this.isLoading; }
    get showSpinner() { return this.isLoading && !this.hasContent; }

    /** Headline = first sentence of summary. Rendered as the lead paragraph. */
    get headlineText() {
        if (!this.summary) return '';
        const m = /^[^.!?]+[.!?]/.exec(this.summary);
        return m ? m[0] : this.summary;
    }
    /** Only render the full summary as plain text when there are no structured
     *  narrativeLines (which already contain the detail). */
    get fullSummaryIfNoNarrative() {
        return this.hasNarrativeLines ? '' : this.summary;
    }
}
