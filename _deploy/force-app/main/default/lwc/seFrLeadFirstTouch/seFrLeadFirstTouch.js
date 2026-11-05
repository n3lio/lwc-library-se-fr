import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const LABELS = {
    fr: {
        cardTitle: 'First Touch Capture',
        humanContext: 'Contexte humain',
        attachments: 'Pièces jointes',
        dropzone: 'Déposez ici notes manuscrites ou photos',
        dropzoneHint: 'PDF, PNG, JPG, DOCX, XLSX',
        removeFile: 'Retirer',
        transcript: 'Transcription réunion',
        transcriptPlaceholder: 'Collez ou saisissez la transcription de la réunion…',
        assistant: 'Assistant Agentforce',
        notesTileTitle: 'Notes générées par IA',
        notesTileBody: 'Génère des notes de réunion professionnelles à partir de la transcription.',
        generate: 'Générer les notes IA',
        generating: 'Génération en cours…',
        regenerate: 'Régénérer les notes IA',
        activitiesTileTitle: 'Assistant activités',
        activitiesTileBody: 'Crée les tâches et événements du plan d’action des notes.',
        createActivities: 'Créer les activités',
        creating: 'Création en cours…',
        notesResult: 'Notes de réunion',
        activitiesResult: 'Activités qui seraient créées',
        mockBadge: 'Agentforce',
        toastNotesTitle: 'Notes générées',
        toastNotesMsg: 'Les notes IA ont été générées.',
        toastActTitle: 'Activités créées',
        toastActMsg: '3 activités créées sur le Lead.',
        typeTask: 'Tâche',
        typeEvent: 'Événement',
        notesMd: '## Points clés\n- Le prospect cherche à consolider ses outils de gestion commerciale d’ici le prochain trimestre.\n- Budget indicatif validé, décision attendue sous 6 semaines.\n- Intérêt marqué pour la qualification automatique des leads.\n\n## Besoins identifiés\n- Vue unifiée des interactions terrain et télévente\n- Reporting hebdomadaire automatisé\n\n## Plan d’action\n- Envoyer la documentation produit sous 48 h\n- Planifier une démo personnalisée la semaine prochaine\n- Appeler le décideur financier pour valider le budget',
        activities: [
            { type: 'task', subject: 'Envoyer la documentation produit', due: 'Échéance : J+2' },
            { type: 'event', subject: 'Démo personnalisée', due: 'Semaine prochaine, 10:00' },
            { type: 'call', subject: 'Appeler le décideur financier', due: 'Échéance : J+5' }
        ]
    },
    en: {
        cardTitle: 'First Touch Capture',
        humanContext: 'Human context',
        attachments: 'Attachments',
        dropzone: 'Drop handwritten notes or photos here',
        dropzoneHint: 'PDF, PNG, JPG, DOCX, XLSX',
        removeFile: 'Remove',
        transcript: 'Meeting transcript',
        transcriptPlaceholder: 'Paste or type the meeting transcript…',
        assistant: 'Agentforce assistant',
        notesTileTitle: 'AI-generated notes',
        notesTileBody: 'Generate professional meeting notes from the transcript.',
        generate: 'Generate AI notes',
        generating: 'Generating…',
        regenerate: 'Regenerate AI notes',
        activitiesTileTitle: 'Activities assistant',
        activitiesTileBody: 'Create Tasks and Events from the notes action plan.',
        createActivities: 'Create activities',
        creating: 'Creating…',
        notesResult: 'Meeting notes',
        activitiesResult: 'Activities that would be created',
        mockBadge: 'Agentforce',
        toastNotesTitle: 'Notes generated',
        toastNotesMsg: 'AI notes were generated.',
        toastActTitle: 'Activities created',
        toastActMsg: '3 activities created on the Lead.',
        typeTask: 'Task',
        typeEvent: 'Event',
        notesMd: '## Key points\n- The prospect wants to consolidate its sales tools by next quarter.\n- Indicative budget confirmed, decision expected within 6 weeks.\n- Strong interest in automatic lead qualification.\n\n## Identified needs\n- Unified view of field and telesales interactions\n- Automated weekly reporting\n\n## Action plan\n- Send product documentation within 48 h\n- Schedule a tailored demo next week\n- Call the finance decision maker to validate the budget',
        activities: [
            { type: 'task', subject: 'Send product documentation', due: 'Due: D+2' },
            { type: 'event', subject: 'Tailored demo', due: 'Next week, 10:00 AM' },
            { type: 'call', subject: 'Call the finance decision maker', due: 'Due: D+5' }
        ]
    }
};

const ACTIVITY_ICONS = { task: 'utility:task', event: 'utility:event', call: 'utility:call' };

export default class SeFrLeadFirstTouch extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:lead_insights';
    @api simulatedDelayMs = 1500;

    _mockTranscript;
    @api
    get mockTranscript() {
        return this._mockTranscript;
    }
    set mockTranscript(v) {
        this._mockTranscript = v;
        if (v && !this.transcript) {
            this.transcript = v;
        }
    }

    transcript = '';
    files = [];
    isGenerating = false;
    isCreating = false;
    notesReady = false;
    activitiesReady = false;
    _fileSeq = 0;

    get labels() {
        return LABELS[this.language] || LABELS.fr;
    }

    get resolvedCardTitle() {
        return this.cardTitle || this.labels.cardTitle;
    }

    get delay() {
        const n = Number(this.simulatedDelayMs);
        return Number.isFinite(n) && n >= 0 ? n : 1500;
    }

    get hasFiles() {
        return this.files.length > 0;
    }

    get generateLabel() {
        if (this.isGenerating) return this.labels.generating;
        return this.notesReady ? this.labels.regenerate : this.labels.generate;
    }

    get createLabel() {
        return this.isCreating ? this.labels.creating : this.labels.createActivities;
    }

    get isCreateDisabled() {
        return !this.notesReady || this.isCreating || this.isGenerating;
    }

    // Minimal markdown: "## " headings and "- " bullets -> typed blocks
    get notesBlocks() {
        return this.labels.notesMd.split('\n').reduce((acc, line, i) => {
            const t = line.trim();
            if (!t) return acc;
            const isHeading = t.startsWith('## ');
            const isBullet = t.startsWith('- ');
            acc.push({
                key: 'b' + i,
                isHeading,
                isBullet,
                text: isHeading ? t.substring(3) : isBullet ? t.substring(2) : t
            });
            return acc;
        }, []);
    }

    get activityRows() {
        return this.labels.activities.map((a, i) => ({
            key: 'a' + i,
            icon: ACTIVITY_ICONS[a.type] || 'utility:task',
            typeLabel: a.type === 'event' ? this.labels.typeEvent : this.labels.typeTask,
            subject: a.subject,
            due: a.due
        }));
    }

    handleTranscript(event) {
        this.transcript = event.target.value;
    }

    handleDropzoneClick() {
        this._fileSeq += 1;
        this.files = [
            ...this.files,
            { id: 'f' + this._fileSeq, name: `notes_${this._fileSeq}.jpg` }
        ];
    }

    handleRemoveFile(event) {
        const id = event.currentTarget.dataset.id;
        this.files = this.files.filter((f) => f.id !== id);
    }

    handleGenerate() {
        this.isGenerating = true;
        this.activitiesReady = false;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.isGenerating = false;
            this.notesReady = true;
            this.toast(this.labels.toastNotesTitle, this.labels.toastNotesMsg);
        }, this.delay);
    }

    handleCreate() {
        this.isCreating = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.isCreating = false;
            this.activitiesReady = true;
            this.toast(this.labels.toastActTitle, this.labels.toastActMsg);
        }, Math.round(this.delay * 2 / 3));
    }

    toast(title, message) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant: 'success' }));
    }
}
