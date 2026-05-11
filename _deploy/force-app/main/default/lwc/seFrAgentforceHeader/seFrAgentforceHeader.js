import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import Id from '@salesforce/user/Id';
import FIRSTNAME_FIELD from '@salesforce/schema/User.FirstName';
import ASTRO_IMG from '@salesforce/resourceUrl/astro_agentforce';

const LABELS = {
    fr: {
        greetingTemplate: 'Bonjour **{name}**, comment puis-je vous aider ?',
        idlePlaceholder: 'Posez-moi une question…',
        listeningPlaceholder: "J'écoute…",
        speechLocale: 'fr-FR',
        defaultName: ''
    },
    en: {
        greetingTemplate: 'Hello **{name}**, how can I help?',
        idlePlaceholder: 'Ask me a question…',
        listeningPlaceholder: 'Listening…',
        speechLocale: 'fr-FR',
        defaultName: ''
    }
};

export default class SeFrAgentforceHeader extends NavigationMixin(LightningElement) {
    userId = Id;

    @api language = 'fr';
    // All four resolve to a language-aware default when left empty in App Builder.
    @api greetingTemplate;
    @api idlePlaceholder;
    @api listeningPlaceholder;
    @api speechLocale;
    // Highlight color used for the **bold** segment of the greeting.
    @api highlightColor = '#0176d3';

    @track userInput = '';
    @track isDictating = false;
    astroImageUrl = ASTRO_IMG;
    recognition;

    get labels() { return LABELS[this.language] || LABELS.fr; }
    get resolvedGreetingTemplate() { return this.greetingTemplate || this.labels.greetingTemplate; }
    get resolvedIdlePlaceholder()  { return this.idlePlaceholder  || this.labels.idlePlaceholder; }
    get resolvedListeningPlaceholder() { return this.listeningPlaceholder || this.labels.listeningPlaceholder; }
    get resolvedSpeechLocale()     { return this.speechLocale     || this.labels.speechLocale; }

    @wire(getRecord, { recordId: '$userId', fields: [FIRSTNAME_FIELD] })
    userRecord;

    get userFirstName() {
        return (this.userRecord && this.userRecord.data && getFieldValue(this.userRecord.data, FIRSTNAME_FIELD)) || '';
    }

    get placeholderText() {
        return this.isDictating ? this.resolvedListeningPlaceholder : this.resolvedIdlePlaceholder;
    }

    // Replaces {name} with the running user's first name, then splits the template around **…**
    // segments for highlighted rendering.
    get greetingSegments() {
        const raw = (this.resolvedGreetingTemplate || '').replace('{name}', this.userFirstName);
        const parts = raw.split(/(\*\*[^*]+\*\*)/);
        return parts
            .filter(p => p.length > 0)
            .map((p, i) => ({
                id: i,
                text: p.startsWith('**') && p.endsWith('**') ? p.slice(2, -2) : p,
                highlight: p.startsWith('**') && p.endsWith('**')
            }));
    }

    get highlightStyle() {
        return `color: ${this.highlightColor}; font-weight: 700;`;
    }
    get inputWrapperClass() {
        return this.isDictating ? 'input-wrapper is-dictating' : 'input-wrapper';
    }

    connectedCallback() { this.initSpeechRecognition(); }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = this.resolvedSpeechLocale;
            this.recognition.onstart = () => { this.isDictating = true; };
            this.recognition.onend = () => { this.isDictating = false; };
            this.recognition.onresult = (event) => {
                this.userInput = event.results[0][0].transcript;
            };
        }
    }

    toggleDictation() {
        if (this.isDictating) { this.recognition.stop(); }
        else { this.recognition.start(); }
    }

    handleInputChange(event) { this.userInput = event.target.value; }
    handleKeyUp(event) { if (event.key === 'Enter') { this.triggerAgentforce(); } }

    triggerAgentforce() {
        if (!this.userInput) return;

        const astroImg = this.template.querySelector('.astro-img');
        if (astroImg) {
            astroImg.classList.add('spin');
            setTimeout(() => astroImg.classList.remove('spin'), 800);
        }

        // Aura Locker blocks us from opening the Agentforce panel programmatically. Quiet fallback:
        // copy the question to the clipboard so the user can paste it after opening Agentforce themselves.
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(this.userInput).catch(() => {});
        }
    }
}
