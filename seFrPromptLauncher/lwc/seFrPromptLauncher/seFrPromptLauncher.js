import { LightningElement, api, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import runPrompt from '@salesforce/apex/SE_FR_PromptLauncherController.runPrompt';
import saveAsNote from '@salesforce/apex/SE_FR_PromptLauncherController.saveAsNote';

const LABELS = {
    en: {
        cardTitle: 'AI Assistant',
        run: 'Run',
        rerun: 'Re-run',
        copy: 'Copy',
        copied: 'Copied to clipboard',
        saveNote: 'Save as Note',
        saved: 'Saved as Note',
        thinking: 'Thinking…',
        emptyState: 'Choose a prompt above and click Run.',
        invalidConfig: 'Prompt config is invalid — check the JSON syntax in App Builder.',
        noPromptForObject: 'No prompt configured for this record type.',
        runError: 'The prompt could not be run.',
        copyError: 'Could not copy to clipboard.',
        saveError: 'Could not save as Note.',
        promptPlaceholder: 'Type the prompt input here…',
        ariaPromptList: 'Available prompts'
    },
    fr: {
        cardTitle: 'Assistant IA',
        run: 'Lancer',
        rerun: 'Relancer',
        copy: 'Copier',
        copied: 'Copié dans le presse-papiers',
        saveNote: 'Enregistrer en Note',
        saved: 'Enregistré en Note',
        thinking: 'Réflexion en cours…',
        emptyState: 'Choisissez un prompt ci-dessus et cliquez sur Lancer.',
        invalidConfig: 'Configuration des prompts invalide — vérifie la syntaxe JSON dans App Builder.',
        noPromptForObject: 'Aucun prompt configuré pour ce type d\'enregistrement.',
        runError: "Impossible d'exécuter le prompt.",
        copyError: 'Copie impossible.',
        saveError: "Sauvegarde impossible.",
        promptPlaceholder: 'Saisissez la valeur ici…',
        ariaPromptList: 'Prompts disponibles'
    }
};

// Built-in catalogue of common Salesforce / SDO-shipped prompt templates. The SE can override
// entirely via the `promptsJson` property in App Builder. Each entry is filtered against the host
// page's objectApiName at render time — `objects: []` means "always show".
const DEFAULT_CATALOG = [
    {
        apiName: 'einstein_gpt__summarizeAccountDefault',
        label: 'Account summary',
        icon: 'utility:summarydetail',
        objects: ['Account'],
        recordInputName: 'Input:Account',
        userInputs: []
    },
    {
        apiName: 'einstein_gpt__summarizeContact',
        label: 'Contact summary',
        icon: 'utility:summarydetail',
        objects: ['Contact'],
        recordInputName: 'Input:Contact',
        userInputs: []
    },
    {
        apiName: 'einstein_gpt__summarizeDeal',
        label: 'Deal summary',
        icon: 'utility:summarydetail',
        objects: ['Opportunity'],
        recordInputName: 'Input:Opportunity',
        userInputs: []
    },
    {
        apiName: 'einstein_gpt__summarizeLead',
        label: 'Lead summary',
        icon: 'utility:summarydetail',
        objects: ['Lead'],
        recordInputName: 'Input:Lead',
        userInputs: []
    },
    {
        apiName: 'svc_emp_intelligence__SummarizeRecord',
        label: 'Case summary',
        icon: 'utility:summarydetail',
        objects: ['Case'],
        recordInputName: 'Input:recordId',
        recordInputType: 'string',
        userInputs: []
    },
    {
        apiName: 'einstein_gpt__summarizeText',
        label: 'Summarize text',
        icon: 'utility:edit_form',
        objects: [],
        // Both inputs are tagged required server-side. We expose only the text to summarize and
        // silently fill the conversation transcript with a non-empty placeholder — Salesforce
        // rejects empty strings as "missing" for required inputs, so a placeholder is needed.
        extraInputs: { 'Input:conversationTranscript': 'N/A — standalone summarization, no chat context.' },
        userInputs: [
            { name: 'Input:textToRephrase', label: 'Text to summarize', type: 'textarea', required: true }
        ]
    },
    {
        apiName: 'einstein_gpt__refineText',
        label: 'Refine text',
        icon: 'utility:magicwand',
        objects: [],
        extraInputs: { 'Input:conversationTranscript': 'N/A — standalone refinement, no chat context.' },
        userInputs: [
            { name: 'Input:textToRephrase', label: 'Text to refine', type: 'textarea', required: true }
        ]
    }
];

export default class SeFrPromptLauncher extends NavigationMixin(LightningElement) {
    // ---- Host context -----------------------------------------------------------------------
    @api recordId;
    @api objectApiName;

    // ---- App Builder properties --------------------------------------------------------------
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:bot';
    @api namedCredential = 'Agentforce_API';
    /** JSON array of prompts. See DEFAULT_CATALOG for the shape. Leave empty for the catalogue default. */
    @api promptsJson = '';
    /** When ON, the first applicable prompt is run automatically as soon as the page loads. */
    @api autoRunFirstPrompt = false;
    /** Visual accent for the result panel ('blue', 'purple', 'green'). */
    @api resultAccent = 'blue';
    /**
     * Maximum height in px before the result panel scrolls internally. 0 (default) means no
     * cap — the component grows with the response. Useful in dense dashboards where you want
     * to bound the vertical footprint regardless of the AI output size.
     */
    @api maxHeight = 0;
    /** Legacy property — kept so existing FlexiPages don't break. No effect. */
    @api height;

    // Legacy properties kept so existing FlexiPages don't break on upgrade. The component used
    // to be a chat surface for a real Agentforce agent — the refactor replaced it with a Prompt
    // Launcher. None of these are read by the new code; they exist purely to satisfy the
    // platform's "FlexiPage references this property" check.
    @api mode;
    @api agentRef;
    @api agentDisplayName;
    @api scriptedRepliesJson;
    @api flowRulesCsv;
    @api quickFlowsCsv;
    @api inputPlaceholder;

    // ---- Tracked state ----------------------------------------------------------------------
    @track activePromptApiName;
    @track userInputValues = {};        // name → value
    @track resultHtml = '';
    @track isRunning = false;
    @track lastRunInputs;               // snapshot used for "Re-run"
    @track configError = '';

    _autoRunFired = false;

    // ---- Init -------------------------------------------------------------------------------
    connectedCallback() {
        // Pick the first applicable prompt as active by default
        const list = this.applicablePrompts;
        if (list.length > 0) {
            this.activePromptApiName = list[0].apiName;
        }
    }

    renderedCallback() {
        // Inject HTML response after each render — using lwc:dom="manual" pattern.
        const target = this.template.querySelector('.pl-result-html');
        if (target && target.innerHTML !== this.resultHtml) {
            target.innerHTML = this.resultHtml || '';
        }
        // Auto-run once the prompt list + recordId are settled
        if (this.autoRunFirstPrompt && !this._autoRunFired && this.activePrompt && this._autoRunReady()) {
            this._autoRunFired = true;
            this.handleRun();
        }
    }

    _autoRunReady() {
        // Block auto-run if a record-bound prompt expects a recordId we don't have yet.
        const p = this.activePrompt;
        if (!p) return false;
        if (p.recordInputName && !this.recordId) return false;
        // Block if any required user input is empty.
        for (const u of (p.userInputs || [])) {
            if (u.required && !this.userInputValues[u.name]) return false;
        }
        return true;
    }

    // ---- Derived ----------------------------------------------------------------------------

    get labels() { return LABELS[this.language] || LABELS.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get containerStyle() {
        // No fixed height — the component sizes itself to its content. Optionally cap with
        // maxHeight so a very long AI response doesn't push the rest of the page down too much.
        const cap = Number(this.maxHeight) || 0;
        return cap > 0 ? `max-height: ${cap}px;` : '';
    }

    /** Parsed JSON from `promptsJson`, or DEFAULT_CATALOG when empty. */
    get parsedPrompts() {
        if (!this.promptsJson || !this.promptsJson.trim()) {
            this.configError = '';
            return DEFAULT_CATALOG;
        }
        try {
            const parsed = JSON.parse(this.promptsJson);
            if (!Array.isArray(parsed)) throw new Error('Expected an array');
            this.configError = '';
            return parsed;
        } catch (e) {
            this.configError = `${this.labels.invalidConfig} (${e.message})`;
            return [];
        }
    }

    /** Filtered to prompts compatible with the current host (object type). */
    get applicablePrompts() {
        const obj = this.objectApiName;
        return this.parsedPrompts.filter(p => {
            if (!p || !p.apiName) return false;
            const objects = p.objects || [];
            // Empty objects array = available everywhere
            if (objects.length === 0) return true;
            // Otherwise the host's object must be in the list
            return obj && objects.indexOf(obj) >= 0;
        });
    }

    /** Pills shown above the result area — one per applicable prompt. */
    get promptPills() {
        const active = this.activePromptApiName;
        return this.applicablePrompts.map(p => ({
            ...p,
            isActive: p.apiName === active,
            pillClass: p.apiName === active ? 'pl-pill pl-pill_active' : 'pl-pill'
        }));
    }

    get activePrompt() {
        return this.applicablePrompts.find(p => p.apiName === this.activePromptApiName);
    }

    get hasUserInputs() {
        return !!(this.activePrompt && this.activePrompt.userInputs && this.activePrompt.userInputs.length > 0);
    }

    get userInputFields() {
        if (!this.activePrompt || !this.activePrompt.userInputs) return [];
        return this.activePrompt.userInputs.map(input => ({
            ...input,
            isText: input.type === 'text' || !input.type,
            isTextarea: input.type === 'textarea',
            isNumber: input.type === 'number',
            isPicklist: input.type === 'picklist',
            value: this.userInputValues[input.name] || '',
            placeholder: input.placeholder || this.labels.promptPlaceholder,
            picklistOptions: (input.options || []).map(o => ({ label: o, value: o }))
        }));
    }

    get hasApplicablePrompts() { return this.applicablePrompts.length > 0; }
    get hasResult() { return !!this.resultHtml && !this.isRunning; }
    get hasNoResult() { return !this.resultHtml && !this.isRunning; }
    get canRun() {
        if (!this.activePrompt || this.isRunning) return false;
        // Required user inputs must be filled
        for (const u of (this.activePrompt.userInputs || [])) {
            if (u.required && !this.userInputValues[u.name]) return false;
        }
        return true;
    }
    get runDisabled() { return !this.canRun; }
    get runLabel() { return this.lastRunInputs ? this.labels.rerun : this.labels.run; }

    get resultClass() {
        const accent = ['blue', 'purple', 'green'].indexOf(this.resultAccent) >= 0 ? this.resultAccent : 'blue';
        return `pl-result pl-result_${accent}`;
    }

    get showSaveAsNote() { return !!this.recordId; }

    // ---- Handlers ---------------------------------------------------------------------------

    handlePromptSelect(event) {
        const apiName = event.currentTarget.dataset.api;
        if (!apiName || apiName === this.activePromptApiName) return;
        this.activePromptApiName = apiName;
        this.userInputValues = {};
        this.resultHtml = '';
        this.lastRunInputs = null;
    }

    handleUserInputChange(event) {
        const name = event.target.dataset.name;
        const value = event.target.value;
        this.userInputValues = { ...this.userInputValues, [name]: value };
    }

    async handleRun() {
        const prompt = this.activePrompt;
        if (!prompt) return;
        const inputs = this._buildInputs(prompt);
        this.isRunning = true;
        this.resultHtml = '';
        try {
            const raw = await runPrompt({
                promptApiName: prompt.apiName,
                inputsJson: JSON.stringify(inputs),
                namedCredential: this.namedCredential
            });
            const data = this._safeParse(raw);
            if (data && data.error) {
                this.resultHtml = this._renderErrorBox(data.error);
            } else {
                this.resultHtml = this._extractResponse(data);
                this.lastRunInputs = inputs;
            }
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[seFrPromptLauncher] runPrompt error:', err);
            const msg = (err && err.body && err.body.message) || (err && err.message) || 'unknown';
            this.resultHtml = this._renderErrorBox(msg);
        } finally {
            this.isRunning = false;
        }
    }

    handleCopy() {
        if (!this.resultHtml) return;
        // Use the visible text (innerText) when copying — drops HTML markup.
        const target = this.template.querySelector('.pl-result-html');
        const plain = target ? target.innerText : this.resultHtml;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(plain).then(() => {
                this._toast(this.labels.copied, 'success');
            }).catch(() => this._toast(this.labels.copyError, 'error'));
        } else {
            this._toast(this.labels.copyError, 'error');
        }
    }

    async handleSaveAsNote() {
        if (!this.recordId || !this.resultHtml) return;
        try {
            const title = (this.activePrompt && this.activePrompt.label) || 'AI summary';
            await saveAsNote({
                recordId: this.recordId,
                title: `${title} — ${new Date().toLocaleDateString(this.language === 'fr' ? 'fr-FR' : 'en-US')}`,
                htmlContent: this.resultHtml
            });
            this._toast(this.labels.saved, 'success');
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[seFrPromptLauncher] saveAsNote error:', err);
            this._toast(this.labels.saveError, 'error');
        }
    }

    // ---- Private ----------------------------------------------------------------------------

    _buildInputs(prompt) {
        const inputs = {};
        // Auto-fill the record-bound input from the host context.
        // Salesforce prompt templates with a SObject-typed input (the common case for record
        // summaries) expect a JSON object `{ "Id": "<recordId>" }`. Templates with a STRING input
        // type (e.g. svc_emp_intelligence__SummarizeRecord using `Input:recordId`) take a raw
        // string. The catalogue entry can override via `recordInputType: 'string' | 'sobject'`.
        if (prompt.recordInputName && this.recordId) {
            const inputType = (prompt.recordInputType || 'sobject').toLowerCase();
            if (inputType === 'string') {
                inputs[prompt.recordInputName] = this.recordId;
            } else {
                inputs[prompt.recordInputName] = { Id: this.recordId };
            }
        }
        // Merge static extras (rare — used to satisfy prompts that mark an input required even
        // though the SE doesn't want to expose it to the user, e.g. an empty conversation
        // transcript on the standalone Summarize Text template).
        if (prompt.extraInputs) {
            for (const k of Object.keys(prompt.extraInputs)) {
                inputs[k] = prompt.extraInputs[k];
            }
        }
        // Merge user-typed inputs (always strings unless the prompt expects something else)
        for (const u of (prompt.userInputs || [])) {
            if (this.userInputValues[u.name] !== undefined) {
                inputs[u.name] = this.userInputValues[u.name];
            }
        }
        return inputs;
    }

    _safeParse(raw) {
        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch (e) { return { error: 'Invalid response' }; }
    }

    /**
     * The Invocable Action response shape is:
     *   [{ "actionName": "...", "outputValues": { "promptResponse": "<rendered text>" }, ... }]
     * Plus the controller wraps errors as { error: "..." }.
     *
     * Some prompt templates return HTML markup (<p>, <strong>, <a href>...) — others return
     * Markdown-flavoured text (**bold**, lists with `- `, headings with `#`...). We detect
     * which one and either pass HTML through as-is, or convert Markdown to HTML so the user
     * sees properly formatted output regardless of the template's choice.
     */
    _extractResponse(data) {
        if (!data) return '';
        let raw = '';
        if (Array.isArray(data) && data.length > 0) {
            const first = data[0];
            if (first && first.outputValues && first.outputValues.promptResponse) {
                raw = first.outputValues.promptResponse;
            }
        } else if (data.promptResponse) {
            raw = data.promptResponse;
        }
        if (!raw) {
            // Fallback — JSON dump for debug
            return `<pre>${this._escapeHtml(JSON.stringify(data, null, 2))}</pre>`;
        }
        return this._isHtml(raw) ? raw : this._markdownToHtml(raw);
    }

    /**
     * Cheap HTML detection: look for any opening tag that's part of the typical Salesforce
     * prompt-template response set. We don't need a full parser — a single match is enough to
     * decide that the response should be treated as HTML.
     */
    _isHtml(s) {
        return /<\s*(p|br|div|span|strong|b|em|i|a|ul|ol|li|h[1-6]|pre|code|table)\b/i.test(s);
    }

    /**
     * Lightweight Markdown → HTML converter. Handles the patterns Salesforce prompt templates
     * actually emit: **bold**, *italic*, headings (#, ##, ###), unordered lists (- or *),
     * ordered lists (1. ), links [text](url), inline `code`, paragraph breaks (double newline),
     * single-line breaks. Not a full CommonMark implementation — just what we need for the
     * known templates, kept tiny on purpose.
     */
    _markdownToHtml(src) {
        // Escape HTML first so a stray < or & in the source doesn't break the output, then we
        // re-introduce safe markup as we apply Markdown rules.
        let s = this._escapeHtml(src);

        // Code blocks (`code`) — done before bold/italic so backticks inside code aren't parsed
        s = s.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headings — must be at start of a line. We support up to h3 (Salesforce templates rarely go deeper).
        s = s.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        s = s.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        s = s.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Bold: **text** — non-greedy, must contain at least one non-* char.
        s = s.replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>');
        // Italic: *text* or _text_ — also non-greedy.
        s = s.replace(/(^|\s)\*([^*\s][^*]*?)\*(?=\s|$|[.,;:!?])/g, '$1<em>$2</em>');
        s = s.replace(/(^|\s)_([^_\s][^_]*?)_(?=\s|$|[.,;:!?])/g, '$1<em>$2</em>');

        // Links: [text](url)
        s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // Lists — process line by line, group consecutive list items into <ul>/<ol>.
        const lines = s.split('\n');
        const out = [];
        let inUl = false;
        let inOl = false;
        const closeLists = () => {
            if (inUl) { out.push('</ul>'); inUl = false; }
            if (inOl) { out.push('</ol>'); inOl = false; }
        };
        for (const rawLine of lines) {
            const ulMatch = rawLine.match(/^\s*[-*]\s+(.+)$/);
            const olMatch = rawLine.match(/^\s*\d+\.\s+(.+)$/);
            if (ulMatch) {
                if (!inUl) { closeLists(); out.push('<ul>'); inUl = true; }
                out.push(`<li>${ulMatch[1]}</li>`);
            } else if (olMatch) {
                if (!inOl) { closeLists(); out.push('<ol>'); inOl = true; }
                out.push(`<li>${olMatch[1]}</li>`);
            } else {
                closeLists();
                out.push(rawLine);
            }
        }
        closeLists();
        s = out.join('\n');

        // Paragraphs — split on blank lines, wrap each in <p>… unless the block already starts
        // with a block-level tag (heading / list / pre / blockquote).
        const blocks = s.split(/\n{2,}/);
        const wrapped = blocks.map(block => {
            const trimmed = block.trim();
            if (!trimmed) return '';
            if (/^<(h[1-6]|ul|ol|pre|blockquote|table|p)\b/i.test(trimmed)) return trimmed;
            // Single newlines within a paragraph become <br>.
            return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
        }).filter(Boolean);

        return wrapped.join('\n');
    }

    _escapeHtml(s) {
        return String(s || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    _renderErrorBox(msg) {
        return `<div class="pl-error">⚠️ ${this.labels.runError}<br><small>${this._escapeHtml(msg)}</small></div>`;
    }

    _toast(message, variant) {
        this.dispatchEvent(new ShowToastEvent({ message, variant }));
    }
}
