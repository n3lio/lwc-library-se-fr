import { LightningElement, api, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getPhotos from '@salesforce/apex/SE_FR_ShelfComplianceController.getPhotos';
import analyzeShelf from '@salesforce/apex/SE_FR_ShelfComplianceController.analyzeShelf';
import uploadPhoto from '@salesforce/apex/SE_FR_ShelfComplianceController.uploadPhoto';

const DICT = {
    fr: {
        uploadTitle: 'Photos',
        uploadBtn: 'Charger',
        uploadBtnMultiple: 'Charger des photos',
        uploadHint: 'PNG · JPG · HEIC (6 max)',
        uploading: 'Envoi…',
        uploadingN: 'Envoi {n}/{total}',
        galleryTitle: 'Galerie',
        empty: 'Aucune photo pour cette visite.',
        analysisTitle: 'Analyse IA',
        analyze: 'Analyser avec Agentforce',
        analyzeShort: 'Lancer l\'analyse',
        analyzing: 'Analyse…',
        needPhoto: 'Ajoutez au moins une photo.',
        uploaded: 'photo(s) ajoutée(s)',
        toastTitle: 'Envoi terminé',
        toastErrorTitle: 'Envoi incomplet',
        tooBig: 'Fichier trop volumineux : {name} ({size} Mo)',
        tooMany: 'Vous ne pouvez téléverser que {max} photos par visite.',
        result: [
            'Taux d\'occupation estimé : 78%',
            '3 facings manquants : Coca Zero 33cl, Evian 50cl, Perrier 1L',
            '2 produits mal placés : chips Lay\'s en bas de linéaire',
            'Score global : 7.2 / 10 — à améliorer'
        ]
    },
    en: {
        uploadTitle: 'Photos',
        uploadBtn: 'Upload',
        uploadBtnMultiple: 'Upload photos',
        uploadHint: 'PNG · JPG · HEIC (max 6)',
        uploading: 'Uploading…',
        uploadingN: 'Uploading {n}/{total}',
        galleryTitle: 'Gallery',
        empty: 'No photos for this visit yet.',
        analysisTitle: 'AI analysis',
        analyze: 'Analyze with Agentforce',
        analyzeShort: 'Run analysis',
        analyzing: 'Analyzing…',
        needPhoto: 'Add at least one photo.',
        uploaded: 'photo(s) added',
        toastTitle: 'Upload complete',
        toastErrorTitle: 'Upload incomplete',
        tooBig: 'File too large: {name} ({size} MB)',
        tooMany: 'You can only upload up to {max} photos per visit.',
        result: [
            'Estimated shelf occupancy: 78%',
            '3 missing facings: Coca Zero 33cl, Evian 50cl, Perrier 1L',
            '2 misplaced products: Lay\'s chips on the bottom shelf',
            'Overall score: 7.2 / 10 — Needs improvement'
        ]
    }
};

const MAX_FILE_MB = 5;

export default class SeFrVisitShelfCompliance extends LightningElement {
    @api recordId;
    @api language = 'fr';
    @api cardTitle = 'Conformité du linéaire';
    @api cardIcon = 'standard:product_item';
    @api maxFiles = 6;
    @api promptTemplateApiName = '';

    photos = [];
    resultLines = [];
    isAnalyzing = false;
    isUploading = false;
    uploadProgress = { done: 0, total: 0 };
    _wired;

    get t() { return DICT[this.language] || DICT.fr; }
    get title() { return this.cardTitle || this.t.uploadTitle; }
    get icon() { return this.cardIcon || 'standard:product_item'; }
    get acceptedFormats() { return ['.png', '.jpg', '.jpeg', '.heic']; }
    get acceptString() { return 'image/png,image/jpeg,image/heic,.png,.jpg,.jpeg,.heic'; }
    get hasPhotos() { return this.photos.length > 0; }
    get noPhotos() { return !this.hasPhotos; }
    get hasResult() { return this.resultLines.length > 0; }
    get analyzeDisabled() { return !this.hasPhotos || this.isAnalyzing; }
    get analyzeLabel() { return this.isAnalyzing ? this.t.analyzing : this.t.analyze; }
    /** Short label for the custom upload button — fits any column width without wrapping. */
    get uploadBtnLabel() { return this.t.uploadBtn; }
    get uploadingText() {
        return (this.t.uploadingN || this.t.uploading)
            .replace('{n}', this.uploadProgress.done)
            .replace('{total}', this.uploadProgress.total);
    }

    @wire(getPhotos, { recordId: '$recordId' })
    wiredPhotos(value) {
        this._wired = value;
        const { data } = value;
        if (data) {
            this.photos = data.map((p) => ({
                key: p.contentVersionId,
                title: p.title,
                url: `/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB720BY480&versionId=${p.contentVersionId}`,
                previewUrl: `/sfc/servlet.shepherd/document/download/${p.contentDocumentId}`
            }));
        } else if (value.error) {
            this.photos = [];
        }
    }

    /**
     * Native file-input change handler. Replaces lightning-file-upload entirely so we can
     * control the button layout (lightning-file-upload wraps "Charger des fichiers" on 2
     * lines in narrow columns and we can't reach into its shadow DOM to fix it).
     */
    async handleFileSelected(event) {
        const inputEl = event.target;
        const files = Array.from(inputEl.files || []);
        if (!files.length) return;

        // Guard : max N photos per visit (combined with existing gallery).
        const already = this.photos.length;
        const slots = Math.max(0, (this.maxFiles || 6) - already);
        if (slots === 0 || files.length > slots) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastErrorTitle,
                message: this.t.tooMany.replace('{max}', this.maxFiles || 6),
                variant: 'warning'
            }));
            inputEl.value = '';
            if (slots === 0) return;
        }
        const batch = files.slice(0, slots);

        this.isUploading = true;
        this.uploadProgress = { done: 0, total: batch.length };
        const errors = [];
        for (const f of batch) {
            // Soft size cap — ContentVersion single-shot ~37 MB, we stay conservative.
            if (f.size > MAX_FILE_MB * 1024 * 1024) {
                errors.push(this.t.tooBig
                    .replace('{name}', f.name)
                    .replace('{size}', (f.size / (1024 * 1024)).toFixed(1)));
                this.uploadProgress = { done: this.uploadProgress.done + 1, total: batch.length };
                continue;
            }
            try {
                const base64 = await this._readAsBase64(f);
                await uploadPhoto({ recordId: this.recordId, fileName: f.name, base64Data: base64 });
            } catch (e) {
                errors.push(f.name + ' — ' + (e.body?.message || e.message || 'erreur'));
            }
            this.uploadProgress = { done: this.uploadProgress.done + 1, total: batch.length };
        }
        this.isUploading = false;
        inputEl.value = ''; // reset so re-picking the same file re-fires change

        const success = batch.length - errors.length;
        if (success > 0) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastTitle,
                message: `${success} ${this.t.uploaded}`,
                variant: 'success'
            }));
            this._publishProgress('shelf', true);
        }
        if (errors.length) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.t.toastErrorTitle,
                message: errors.join(' · '),
                variant: 'warning',
                mode: 'sticky'
            }));
        }
        if (this._wired) refreshApex(this._wired);
    }

    _readAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const r = reader.result || '';
                // Strip the "data:*;base64," prefix.
                const idx = String(r).indexOf('base64,');
                resolve(idx >= 0 ? String(r).slice(idx + 'base64,'.length) : String(r));
            };
            reader.onerror = () => reject(reader.error || new Error('read error'));
            reader.readAsDataURL(file);
        });
    }

    /**
     * Publie la progression dans localStorage, clé partagée avec seFrVisitPlan.
     * seFrVisitPlan poll cette clé toutes les 2s et coche automatiquement l'étape.
     */
    _publishProgress(stepKey, done) {
        if (!this.recordId) return;
        try {
            const key = 'sefr-visit-progress::' + this.recordId;
            const raw = window.localStorage.getItem(key);
            const obj = raw ? JSON.parse(raw) : {};
            if (done) {
                obj[stepKey] = { done: true, at: new Date().toISOString() };
            } else {
                delete obj[stepKey];
            }
            window.localStorage.setItem(key, JSON.stringify(obj));
        } catch (e) { /* ignore */ }
    }

    async handleAnalyze() {
        this.isAnalyzing = true;
        this.resultLines = [];
        let lines = null;
        try {
            // Soft-fail: Apex returns null (or throws) when Agentforce is not configured.
            const text = await analyzeShelf({
                recordId: this.recordId,
                promptTemplateApiName: this.promptTemplateApiName
            });
            if (text && String(text).trim()) {
                lines = String(text).split('\n').map((l) => l.trim()).filter((l) => l);
            }
        } catch (e) {
            lines = null;
        }
        // Simulated thinking time, then real result or mock fallback.
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.resultLines = (lines && lines.length ? lines : this.t.result)
                .map((text, i) => ({ key: `r${i}`, text }));
            this.isAnalyzing = false;
        }, 1500);
    }
}
