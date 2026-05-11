import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getFiles from '@salesforce/apex/SE_FR_FilesGalleryController.getFiles';
import deleteFile from '@salesforce/apex/SE_FR_FilesGalleryController.deleteFile';
import uploadFile from '@salesforce/apex/SE_FR_FilesGalleryController.uploadFile';

const LABELS = {
    en: {
        cardTitle: 'Files',
        refresh: 'Refresh',
        download: 'Download',
        preview: 'Preview',
        delete: 'Delete',
        deleteConfirm: 'Delete "{title}"?',
        deletedTitle: 'Deleted',
        deletedMsg: 'File removed.',
        empty: 'No file yet.',
        uploadedBy: 'by {name}',
        prev: 'Previous',
        next: 'Next',
        uploadButton: 'Upload files',
        uploadHelper: 'or drop your files here',
        uploading: 'Uploading',
        uploadError: 'Upload error',
        uploadMaxSize: 'File too large (max 5 MB).'
    },
    fr: {
        cardTitle: 'Fichiers',
        refresh: 'Actualiser',
        download: 'Télécharger',
        preview: 'Aperçu',
        delete: 'Supprimer',
        deleteConfirm: 'Supprimer « {title} » ?',
        deletedTitle: 'Supprimé',
        deletedMsg: 'Fichier retiré.',
        empty: 'Aucun fichier pour le moment.',
        uploadedBy: 'par {name}',
        prev: 'Précédent',
        next: 'Suivant',
        uploadButton: 'Charger',
        uploadHelper: 'ou déposez vos fichiers ici',
        uploading: 'Envoi en cours',
        uploadError: 'Erreur lors de l\'envoi',
        uploadMaxSize: 'Fichier trop volumineux (max 5 Mo).'
    }
};

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;

// Known image extensions used to display thumbnails via the Salesforce rendition endpoint.
const IMG_EXT = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg']);

// Small icon inference for the fallback tile (non-image files)
function iconFor(ext) {
    const e = (ext || '').toLowerCase();
    if (e === 'pdf') return 'doctype:pdf';
    if (['doc', 'docx'].includes(e)) return 'doctype:word';
    if (['xls', 'xlsx', 'csv'].includes(e)) return 'doctype:excel';
    if (['ppt', 'pptx'].includes(e)) return 'doctype:ppt';
    if (['zip', 'rar', '7z'].includes(e)) return 'doctype:zip';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return 'doctype:video';
    if (['mp3', 'wav', 'aac'].includes(e)) return 'doctype:audio';
    if (['txt', 'md'].includes(e)) return 'doctype:txt';
    return 'doctype:unknown';
}

function formatBytes(n) {
    if (!n || Number.isNaN(Number(n))) return '';
    const b = Number(n);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default class SeFrFilesGallery extends NavigationMixin(LightningElement) {
    @api recordId;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:file';
    @api limitCount = 20;
    @api hideUploadButton = false;
    // When off (default), a delete button is shown on each tile. Turn on to hide it.
    @api hideDeleteButton = false;
    // Number of file tiles visible in the carousel at once.
    @api visibleCount = 4;

    @track files = [];
    @track startIndex = 0;
    @track isUploading = false;
    @track isDragging = false;
    wiredResult;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() {
        const base = this.cardTitle || this.labels.cardTitle;
        const n = (this.files || []).length;
        return n > 0 ? `${base} (${n})` : base;
    }

    @wire(getFiles, { recordId: '$recordId', limitCount: '$limitCount' })
    wiredFiles(result) {
        this.wiredResult = result;
        if (result.data) {
            this.files = result.data.map(f => {
                const ext = (f.fileExtension || '').toLowerCase();
                const isImage = IMG_EXT.has(ext);
                return {
                    ...f,
                    isImage,
                    icon: iconFor(ext),
                    sizeDisplay: formatBytes(f.sizeBytes),
                    // Rendition endpoint for image thumbnail (THUMB720BY480 works for most image types)
                    thumbUrl: isImage ? `/sfc/servlet.shepherd/version/renditionDownload?rendition=THUMB720BY480&versionId=${f.versionId}` : null,
                    downloadUrl: `/sfc/servlet.shepherd/document/download/${f.documentId}`,
                    ownerLine: f.ownerName ? this.labels.uploadedBy.replace('{name}', f.ownerName) : ''
                };
            });
        }
    }

    get hasFiles() { return (this.files || []).length > 0; }

    get visibleFiles() {
        const win = Number(this.visibleCount) || 4;
        return (this.files || []).slice(this.startIndex, this.startIndex + win);
    }
    get canPrev() { return this.startIndex > 0; }
    get canNext() {
        const win = Number(this.visibleCount) || 4;
        return this.startIndex + win < (this.files || []).length;
    }
    get prevDisabled() { return !this.canPrev; }
    get nextDisabled() { return !this.canNext; }

    handlePrev() {
        const win = Number(this.visibleCount) || 4;
        this.startIndex = Math.max(0, this.startIndex - win);
    }
    handleNext() {
        const win = Number(this.visibleCount) || 4;
        const max = Math.max(0, (this.files || []).length - win);
        this.startIndex = Math.min(max, this.startIndex + win);
    }

    handleRefresh() { if (this.wiredResult) refreshApex(this.wiredResult); }

    handlePreview(event) {
        const documentId = event.currentTarget.dataset.id;
        if (!documentId) return;
        // Remember scroll position, then restore it after the preview modal closes. The standard
        // filePreview named page resets the scroll to 0 when it opens and when it returns.
        const x = window.scrollX;
        const y = window.scrollY;
        const restore = () => {
            window.scrollTo(x, y);
            window.removeEventListener('focus', restore);
        };
        // The preview modal briefly steals focus; on the next focus event (modal close) we restore.
        window.addEventListener('focus', restore);
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: { pageName: 'filePreview' },
            state: { selectedRecordId: documentId }
        });
    }

    // ---------------- Upload ----------------

    get dropzoneClass() {
        return this.isDragging ? 'dropzone dropzone_drag' : 'dropzone';
    }

    handleUploadClick() {
        if (this.isUploading) return;
        const input = this.refs ? this.refs.fileInput : null;
        if (input) input.click();
    }

    handleFileChange(event) {
        const list = Array.from(event.target.files || []);
        event.target.value = '';
        this._uploadFiles(list);
    }

    handleDragEnter(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }
    handleDragOver(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }
    handleDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }
    handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
        const files = Array.from(event.dataTransfer.files || []);
        this._uploadFiles(files);
    }

    _uploadFiles(files) {
        if (!files.length || !this.recordId || this.isUploading) return;
        const oversize = files.find(f => f.size > MAX_UPLOAD_SIZE);
        if (oversize) {
            this.dispatchEvent(new ShowToastEvent({
                title: this.labels.uploadError,
                message: this.labels.uploadMaxSize,
                variant: 'error'
            }));
            return;
        }
        this.isUploading = true;
        // Sequential upload: simpler error handling and stays well below the @AuraEnabled
        // payload limits (each call carries a single file).
        const uploadOne = (file) => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                uploadFile({ recordId: this.recordId, fileName: file.name, base64Data: base64 })
                    .then(resolve)
                    .catch(reject);
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
        });
        files.reduce((p, f) => p.then(() => uploadOne(f)), Promise.resolve())
            .then(() => {
                this.isUploading = false;
                refreshApex(this.wiredResult);
            })
            .catch(err => {
                this.isUploading = false;
                const msg = (err && err.body && err.body.message) || (err && err.message) || '';
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.uploadError,
                    message: msg,
                    variant: 'error',
                    mode: 'sticky'
                }));
            });
    }

    handleDelete(event) {
        event.stopPropagation();
        const documentId = event.currentTarget.dataset.id;
        const title = event.currentTarget.dataset.title || '';
        if (!documentId) return;
        // Native confirm — no modal framework needed; SEs get a standard browser dialog.
        // eslint-disable-next-line no-alert
        if (!window.confirm(this.labels.deleteConfirm.replace('{title}', title))) return;
        deleteFile({ contentDocumentId: documentId })
            .then(() => {
                this.dispatchEvent(new ShowToastEvent({
                    title: this.labels.deletedTitle,
                    message: this.labels.deletedMsg,
                    variant: 'success'
                }));
                refreshApex(this.wiredResult);
            })
            .catch(err => {
                const msg = (err && err.body && err.body.message) || '';
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error', message: msg, variant: 'error', mode: 'sticky'
                }));
            });
    }

    // Prevent the parent tile's onclick from firing when the user clicks the Download link.
    stopPropagation(event) { event.stopPropagation(); }
}
