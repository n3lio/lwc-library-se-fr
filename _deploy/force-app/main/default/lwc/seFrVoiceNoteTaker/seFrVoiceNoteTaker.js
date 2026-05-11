import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import saveVoiceNoteForRecord from '@salesforce/apex/SE_FR_VoiceNoteController.saveVoiceNoteForRecord';

const LABELS = {
    en: {
        cardTitle: 'Voice Note Taker',
        taskSubject: 'Visit notes (voice dictation)',
        recordingHint: 'Listening… Speak now.',
        textareaLabel: 'Your note',
        textareaPlaceholder: 'Press the button above to dictate, or type your note here…',
        startButton: 'Start dictation',
        stopButton: 'Stop recording',
        saveButton: 'Save to record',
        unsupportedBrowser: 'Voice recognition is not supported by your browser. Use Google Chrome.',
        successMessage: 'Note saved as a Task successfully.',
        toastSuccess: 'Success',
        toastError: 'Error',
        unableToSave: 'Unable to save the note.',
        saving: 'Saving…'
    },
    fr: {
        cardTitle: 'Dictée vocale',
        taskSubject: 'Notes de visite (dictée vocale)',
        recordingHint: 'Enregistrement… Parlez maintenant.',
        textareaLabel: 'Votre note',
        textareaPlaceholder: 'Appuyez sur le bouton ci-dessus pour dicter, ou saisissez votre note ici…',
        startButton: 'Démarrer la dictée',
        stopButton: "Arrêter l'enregistrement",
        saveButton: "Enregistrer sur l'enregistrement",
        unsupportedBrowser: "La reconnaissance vocale n'est pas prise en charge par votre navigateur. Utilisez Google Chrome.",
        successMessage: 'Note enregistrée comme Tâche.',
        toastSuccess: 'Succès',
        toastError: 'Erreur',
        unableToSave: "Impossible d'enregistrer la note.",
        saving: 'Enregistrement…'
    }
};

export default class SeFrVoiceNoteTaker extends LightningElement {
    @api recordId;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:voice_call';
    @api speechLocale = 'fr-FR';
    @api taskSubject;
    @api recordingHint;
    @api textareaLabel;
    @api textareaPlaceholder;
    @api startButtonLabel;
    @api stopButtonLabel;
    @api saveButtonLabel;
    @api unsupportedBrowserMessage;
    @api successMessage;

    @track transcript = '';
    @track isRecording = false;
    @track isSaving = false;
    @track notSupported = false;

    recognition;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedTaskSubject() { return this.taskSubject || this.labels.taskSubject; }
    get resolvedRecordingHint() { return this.recordingHint || this.labels.recordingHint; }
    get resolvedTextareaLabel() { return this.textareaLabel || this.labels.textareaLabel; }
    get resolvedTextareaPlaceholder() { return this.textareaPlaceholder || this.labels.textareaPlaceholder; }
    get resolvedStartButton() { return this.startButtonLabel || this.labels.startButton; }
    get resolvedStopButton() { return this.stopButtonLabel || this.labels.stopButton; }
    get resolvedSaveButton() { return this.saveButtonLabel || this.labels.saveButton; }
    get resolvedUnsupported() { return this.unsupportedBrowserMessage || this.labels.unsupportedBrowser; }
    get resolvedSuccessMessage() { return this.successMessage || this.labels.successMessage; }
    get savingText() { return this.labels.saving; }

    connectedCallback() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.lang = this.speechLocale;
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.recognition.onresult = (event) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    currentTranscript += event.results[i][0].transcript;
                }
                this.transcript = currentTranscript;
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.stopRecording();
            };

            this.recognition.onend = () => {
                this.isRecording = false;
            };
        } else {
            this.notSupported = true;
        }
    }

    get recordButtonIcon() {
        return this.isRecording ? 'utility:stop' : 'utility:unmuted';
    }

    get recordButtonVariant() {
        return this.isRecording ? 'destructive' : 'brand';
    }

    get recordButtonLabel() {
        return this.isRecording ? this.resolvedStopButton : this.resolvedStartButton;
    }

    get isSaveDisabled() {
        return this.transcript.trim().length === 0 || this.isSaving || this.isRecording;
    }

    toggleRecording() {
        if (this.isRecording) this.stopRecording();
        else this.startRecording();
    }

    startRecording() {
        if (this.recognition) {
            this.transcript = '';
            this.recognition.start();
            this.isRecording = true;
        }
    }

    stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
            this.isRecording = false;
        }
    }

    handleTextChange(event) {
        this.transcript = event.target.value;
    }

    handleSave() {
        this.isSaving = true;

        saveVoiceNoteForRecord({
            recordId: this.recordId,
            noteText: this.transcript,
            taskSubject: this.resolvedTaskSubject
        })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastSuccess,
                    message: this.resolvedSuccessMessage,
                    variant: 'success'
                }));
                this.transcript = '';
                this.isSaving = false;
            })
            .catch(error => {
                console.error('Error:', error);
                const msg = (error && error.body && error.body.message) || this.labels.unableToSave;
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.toastError,
                    message: msg,
                    variant: 'error'
                }));
                this.isSaving = false;
            });
    }
}
