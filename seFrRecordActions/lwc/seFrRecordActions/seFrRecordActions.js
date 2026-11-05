import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import SeFrFlowModal from 'c/seFrFlowModal';
import { encodeDefaultFieldValues } from 'lightning/pageReferenceUtils';
import getPromptSummary from '@salesforce/apex/SE_FR_AccountActionsController.getPromptSummary';

/**
 * CCO FR — Record Actions
 *
 * Compact toolbar on a record page:
 *   1. Primary action → launches a Screen Flow (configurable name). Record Id is passed as input.
 *   2. AI summary → calls Einstein Prompt Template via ConnectApi, renders the response as markdown.
 *
 * Ported from DBI retail-execution demo (dimAccountActions, 2026-07). Changes applied for library
 * compliance (see `_build/LIB_COMPLIANCE_SPECS.md`):
 *   - All DIM / client refs stripped
 *   - CSS variables renamed `--dim-*` → `--sefraa-*`
 *   - FR/EN i18n via LABELS + t() getter
 *   - Visit sObject hardcoded creation replaced by configurable Flow launch (rule 10.9)
 *   - Markdown parser kept inline (rule 10.4 — candidate for shared util `seFrMarkdown` later)
 *   - Apex pivoted to ConnectApi.EinsteinLLM (seFrContactCard pattern — no Named Credential needed)
 */
const LABELS = {
    en: {
        cardTitle: 'Quick actions',
        primaryActionDefault: 'Start visit',
        newRecordDefault: 'New record',
        newRecordNotConfigured: 'No object configured for the primary action.',
        primaryActionLoading: 'Launching…',
        aiSummaryDefault: 'AI summary',
        aiSummaryLoading: 'Generating summary…',
        aiSummaryHeader: 'Einstein summary',
        aiSummaryEmpty: 'No summary returned.',
        aiSummaryError: 'Einstein unavailable.',
        close: 'Close',
        flowNotConfigured: 'Primary action Flow is not configured on this component.',
        flowModalTitle: 'Primary action',
        toastErrorTitle: 'Error',
        toastWarnTitle: 'Summary unavailable'
    },
    fr: {
        cardTitle: 'Actions rapides',
        primaryActionDefault: 'Démarrer une visite',
        newRecordDefault: 'Nouvel enregistrement',
        newRecordNotConfigured: 'Aucun objet configuré pour l’action primaire.',
        primaryActionLoading: 'Ouverture…',
        aiSummaryDefault: 'Résumé IA',
        aiSummaryLoading: 'Génération du résumé…',
        aiSummaryHeader: 'Résumé Einstein',
        aiSummaryEmpty: 'Aucun résumé généré.',
        aiSummaryError: 'Einstein indisponible.',
        close: 'Fermer',
        flowNotConfigured: 'Aucun Flow configuré pour l’action primaire.',
        flowModalTitle: 'Action',
        toastErrorTitle: 'Erreur',
        toastWarnTitle: 'Résumé indisponible'
    }
};

export default class SeFrRecordActions extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;
    @api accentColor;

    // Primary action
    @api disablePrimaryAction = false;
    @api primaryActionLabel;
    @api primaryActionIcon = 'utility:routing_offline';
    // 'flow' (default) launches a Screen Flow; 'newRecord' opens the standard "New <object>" form
    // (same result as the standard quick actions NewTask / NewEvent / NewCase / NewOpportunity…).
    @api primaryActionType = 'flow';
    @api primaryActionFlowApiName;
    @api newRecordObjectApiName;
    // Pipe-separated defaults: Field=Value|Field2=Value. Tokens: {recordId}, {objectApiName}.
    @api newRecordDefaults;

    // AI summary
    @api disableAiSummary = false;
    @api aiSummaryLabel;
    @api promptTemplateApiName = 'einstein_gpt__summarizeAccountDefault';
    @api promptInputApiName = 'Input:Account';
    @api autoRunOnLoad = false;

    // Internal state
    isLaunchingPrimary = false;
    isSummarizing = false;
    summary;
    _autoRan = false;

    // --- i18n -----------------------------------------------------------------------------------
    get _lang() { return this.language === 'fr' ? 'fr' : 'en'; }
    t(key) { return LABELS[this._lang][key] || key; }

    get resolvedCardTitle() { return this.cardTitle || this.t('cardTitle'); }
    get isNewRecordMode() { return this.primaryActionType === 'newRecord'; }
    get resolvedPrimaryLabel() {
        return this.primaryActionLabel || this.t(this.isNewRecordMode ? 'newRecordDefault' : 'primaryActionDefault');
    }
    get resolvedAiLabel() { return this.aiSummaryLabel || this.t('aiSummaryDefault'); }
    get primaryLoadingLabel() { return this.t('primaryActionLoading'); }
    get aiLoadingLabel() { return this.t('aiSummaryLoading'); }
    get summaryHeaderLabel() { return this.t('aiSummaryHeader'); }
    get closeLabel() { return this.t('close'); }
    get showPrimary() { return !this.disablePrimaryAction; }
    get showAi() { return !this.disableAiSummary; }

    // --- Lifecycle ------------------------------------------------------------------------------
    _summaryRendered;

    renderedCallback() {
        if (this.autoRunOnLoad && !this._autoRan && this.showAi && this.recordId) {
            this._autoRan = true;
            // Fire-and-forget — any error is toasted by the handler.
            this.handleSummarize();
        }
        // Keep the manual-DOM body in sync with `this.summary`. We can't rely on template
        // bindings for lwc:dom="manual" nodes.
        if (this.summary !== this._summaryRendered) {
            const host = this.template.querySelector('.sefraa-summary__body');
            if (host) {
                host.innerHTML = this.summary || '';
                this._summaryRendered = this.summary;
            }
        }
    }

    // --- Handlers -------------------------------------------------------------------------------
    _parseDefaults() {
        const out = {};
        (this.newRecordDefaults || '').split('|').forEach((pair) => {
            const i = pair.indexOf('=');
            if (i < 1) return;
            const key = pair.substring(0, i).trim();
            const val = pair.substring(i + 1).trim()
                .replace(/\{recordId\}/g, this.recordId || '')
                .replace(/\{objectApiName\}/g, this.objectApiName || '');
            if (key) out[key] = val;
        });
        return out;
    }

    _openNewRecord() {
        if (!this.newRecordObjectApiName) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t('toastErrorTitle'),
                message: this.t('newRecordNotConfigured'),
                variant: 'warning'
            }));
            return;
        }
        const defaults = this._parseDefaults();
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: this.newRecordObjectApiName, actionName: 'new' },
            state: Object.keys(defaults).length
                ? { defaultFieldValues: encodeDefaultFieldValues(defaults), nooverride: '1' }
                : { nooverride: '1' }
        });
    }

    async handlePrimary() {
        if (this.isLaunchingPrimary) return;
        if (this.isNewRecordMode) { this._openNewRecord(); return; }
        if (!this.primaryActionFlowApiName) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t('toastErrorTitle'),
                message: this.t('flowNotConfigured'),
                variant: 'warning'
            }));
            return;
        }
        this.isLaunchingPrimary = true;
        try {
            // lightning/modal — native, correctly sizes the flow footer. A custom slds-modal
            // wrapper clips the flow's own Next / Finish footer out of the scrollable area.
            const result = await SeFrFlowModal.open({
                size: 'medium',
                label: this.resolvedPrimaryLabel,
                flowApiName: this.primaryActionFlowApiName,
                recordId: this.recordId,
                modalTitle: this.resolvedPrimaryLabel
            });
            // If the shipped flow outputs a `newEventId` (or any `*Id` output variable), navigate
            // to it so the user lands on the just-created record. "Démarrer une visite" → open
            // the Event. The convention is any output var whose name ends in `Id`.
            const outputs = result && Array.isArray(result.outputVariables) ? result.outputVariables : [];
            const idOutput = outputs.find(v => v && typeof v.name === 'string' && v.name.endsWith('Id') && v.value);
            if (result?.status === 'FINISHED' && idOutput) {
                this[NavigationMixin.Navigate]({
                    type: 'standard__recordPage',
                    attributes: { recordId: idOutput.value, actionName: 'view' }
                });
            }
        } finally {
            this.isLaunchingPrimary = false;
        }
    }

    async handleSummarize() {
        if (this.isSummarizing) return;
        this.isSummarizing = true;
        this.summary = null;
        try {
            const result = await getPromptSummary({
                recordId: this.recordId,
                promptTemplateApiName: this.promptTemplateApiName,
                inputApiName: this.promptInputApiName
            });
            if (!result) {
                this.summary = this._markdownToHtml(this.t('aiSummaryEmpty'));
            } else {
                // Strip any ```lang … ``` code fence BEFORE detecting HTML vs markdown.
                // Einstein sometimes wraps HTML output in ```html … ``` ; without this
                // the raw backticks leak into the UI (screenshot bug 2026-11-03).
                const stripped = this._stripCodeFence(result);
                if (this._looksLikeHtml(stripped)) {
                    this.summary = stripped;
                } else {
                    this.summary = this._markdownToHtml(stripped);
                }
            }
        } catch (e) {
            const msg = (e && e.body && e.body.message) || (e && e.message) || this.t('aiSummaryError');
            this.dispatchEvent(new ShowToastEvent({
                title: this.t('toastWarnTitle'),
                message: msg,
                variant: 'warning'
            }));
        } finally {
            this.isSummarizing = false;
        }
    }

    handleCloseSummary() {
        this.summary = null;
    }

    // --- HTML vs markdown detection ------------------------------------------------------------
    // Einstein Prompt Templates with the "Standard" response-type setting return pre-rendered
    // HTML (<p>, <strong>, <a href>, …). Custom "Flex" response types return raw markdown.
    // The parser escapes '<'/'>' as an XSS guard, so we must bypass it on HTML input.
    _looksLikeHtml(s) {
        return /<\/?[a-z][\s\S]*?>/i.test(String(s));
    }

    /**
     * Strip a surrounding ```lang … ``` fence that Einstein likes to add to its answers
     * (``` ```html … ``` ```, ``` ```markdown … ``` ```, plain ``` ``` … ``` ```). Only strips
     * if the fence truly wraps the whole string — mid-text fences are left alone.
     */
    _stripCodeFence(s) {
        if (!s) return '';
        let out = String(s).trim();
        // Opening fence : optional language tag on same line, then newline.
        const open = out.match(/^```[a-zA-Z0-9_-]*\s*\r?\n/);
        if (open) out = out.slice(open[0].length);
        // Closing fence.
        out = out.replace(/\r?\n?```\s*$/, '');
        return out.trim();
    }

    // --- Markdown mini-parser (compliance rule 10.4) --------------------------------------------
    // Note: kept inline on purpose. If a 3rd component ports the same logic, factor into a shared
    // `seFrMarkdown` util (see LIB_COMPLIANCE_SPECS.md).
    _markdownToHtml(md) {
        if (!md) return '';
        let s = String(md).replace(/^```(?:markdown|md)?\s*\n?/, '').replace(/\n?```\s*$/, '');
        // Escape raw HTML before any transformation.
        s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const lines = s.split(/\r?\n/);
        const out = [];
        let inList = false;
        const closeList = () => {
            if (inList) { out.push('</ul>'); inList = false; }
        };
        for (const raw of lines) {
            const line = raw.trim();
            if (line === '') { closeList(); continue; }
            let m;
            if ((m = line.match(/^###\s+(.+)$/))) { closeList(); out.push('<h4>' + m[1] + '</h4>'); continue; }
            if ((m = line.match(/^##\s+(.+)$/)))  { closeList(); out.push('<h3>' + m[1] + '</h3>'); continue; }
            if ((m = line.match(/^#\s+(.+)$/)))   { closeList(); out.push('<h2>' + m[1] + '</h2>'); continue; }
            if ((m = line.match(/^[-*]\s+(.+)$/))) {
                if (!inList) { out.push('<ul>'); inList = true; }
                out.push('<li>' + this._inlineMd(m[1]) + '</li>');
                continue;
            }
            if ((m = line.match(/^\d+\.\s+(.+)$/))) {
                if (!inList) { out.push('<ul>'); inList = true; }
                out.push('<li>' + this._inlineMd(m[1]) + '</li>');
                continue;
            }
            closeList();
            out.push('<p>' + this._inlineMd(line) + '</p>');
        }
        closeList();
        return out.join('');
    }

    _inlineMd(s) {
        s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/(^|\s)\*([^*]+)\*(?=\s|$|[.,!?])/g, '$1<em>$2</em>');
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
        return s;
    }
}
