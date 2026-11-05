import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const LABELS = {
    fr: {
        cardTitle: 'Scanner de cartes de visite',
        counter: '{0} prêtes sur {1}',
        dropTitle: 'Déposez vos cartes de visite ici',
        dropHint: 'ou cliquez pour sélectionner',
        add: 'Ajouter',
        clear: 'Vider',
        create: 'Créer les {0} leads',
        createOne: 'Créer le lead',
        creating: 'Création en cours…',
        created: '{0} leads créés avec succès',
        createdOne: '1 lead créé avec succès',
        statusProcessing: 'Analyse en cours',
        statusReady: 'Prêt',
        statusError: 'Erreur',
        statusCreated: 'Créé',
        firstName: 'Prénom',
        lastName: 'Nom',
        company: 'Société',
        title: 'Fonction',
        email: 'E-mail',
        mobile: 'Mobile',
        phone: 'Téléphone',
        remove: 'Retirer cette carte',
        retry: 'Réessayer',
        errorText: 'Lecture impossible. Vérifiez que le fichier est bien une image.',
        thumbAlt: 'Aperçu de la carte de visite',
        maxReached: 'Limite de {0} cartes atteinte, les fichiers en trop ont été ignorés.',
        warningTitle: 'Attention',
        successTitle: 'Succès',
        zoneLabel: 'Zone de dépôt des cartes de visite'
    },
    en: {
        cardTitle: 'Business Card Scanner',
        counter: '{0} ready of {1}',
        dropTitle: 'Drop your business cards here',
        dropHint: 'or click to select',
        add: 'Add',
        clear: 'Clear all',
        create: 'Create {0} leads',
        createOne: 'Create lead',
        creating: 'Creating…',
        created: '{0} leads created successfully',
        createdOne: '1 lead created successfully',
        statusProcessing: 'Processing',
        statusReady: 'Ready',
        statusError: 'Error',
        statusCreated: 'Created',
        firstName: 'First name',
        lastName: 'Last name',
        company: 'Company',
        title: 'Job title',
        email: 'Email',
        mobile: 'Mobile',
        phone: 'Phone',
        remove: 'Remove this card',
        retry: 'Retry',
        errorText: 'Could not read this file. Make sure it is an image.',
        thumbAlt: 'Business card preview',
        maxReached: 'Limit of {0} cards reached, extra files were ignored.',
        warningTitle: 'Warning',
        successTitle: 'Success',
        zoneLabel: 'Business card drop zone'
    }
};

const PERSONAS = [
    { firstName: 'Fabien', lastName: 'Dubois', company: 'Boulangerie du Centre', title: 'Gérant', email: 'fabien.dubois@bdc.fr', mobile: '+33 6 12 34 56 78', phone: '+33 4 72 00 11 22' },
    { firstName: 'Clara', lastName: 'Moreau', company: 'Pharmacie des Lilas', title: 'Pharmacienne titulaire', email: 'c.moreau@pharmalilas.com', mobile: '+33 6 98 76 54 32', phone: '+33 1 43 00 22 33' },
    { firstName: 'Michel', lastName: 'Lefebvre', company: 'GMS Lefebvre & Fils', title: 'Directeur de magasin', email: 'm.lefebvre@gmslef.fr', mobile: '+33 6 55 44 33 22', phone: '+33 3 20 00 33 44' },
    { firstName: 'Nathalie', lastName: 'Petit', company: 'Épicerie Fine Bordeaux', title: 'Fondatrice', email: 'n.petit@epifb.com', mobile: '+33 6 11 22 33 44', phone: '+33 5 56 00 44 55' }
];

const FIELDS = ['firstName', 'lastName', 'company', 'title', 'email', 'mobile', 'phone'];
const CREATE_DELAY_MS = 1000;

export default class SeFrBusinessCardScanner extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:lead';
    @api simulatedDelayMs = 1200;
    @api maxCards = 10;
    @api autoCreate = false;

    cards = [];
    isDragOver = false;
    isCreating = false;

    _seq = 0;
    _personaIdx = 0;
    _timers = new Map();

    disconnectedCallback() {
        this._timers.forEach((t) => clearTimeout(t));
        this._timers.clear();
    }

    // ---------- labels / getters ----------
    get labels() {
        return LABELS[this.language] || LABELS.fr;
    }
    get resolvedCardTitle() {
        return this.cardTitle || this.labels.cardTitle;
    }
    get _delay() {
        const n = Number(this.simulatedDelayMs);
        return Number.isFinite(n) && n >= 0 ? n : 1200;
    }
    get _max() {
        const n = Number(this.maxCards);
        return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
    }
    get hasCards() {
        return this.cards.length > 0;
    }
    get totalCount() {
        return this.cards.length;
    }
    get readyCount() {
        return this.cards.filter((c) => this._isCreatable(c)).length;
    }
    get counterLabel() {
        return this.labels.counter.replace('{0}', this.readyCount).replace('{1}', this.totalCount);
    }
    get createLabel() {
        if (this.isCreating) return this.labels.creating;
        return this.readyCount === 1 ? this.labels.createOne : this.labels.create.replace('{0}', this.readyCount);
    }
    get createDisabled() {
        return this.readyCount === 0 || this.isCreating;
    }
    get createButtonClass() {
        return this.autoCreate && this.readyCount > 0 && !this.isCreating ? 'sebcs-pulse' : '';
    }
    get addDisabled() {
        return this.cards.length >= this._max || this.isCreating;
    }
    get dropClass() {
        return 'sebcs-drop slds-align_absolute-center slds-text-align_center slds-p-around_xx-large' +
            (this.isDragOver ? ' sebcs-drop_over' : '');
    }
    get gridClass() {
        return 'slds-grid slds-wrap slds-gutters_x-small' + (this.isDragOver ? ' sebcs-grid_over' : '');
    }

    get viewCards() {
        const L = this.labels;
        return this.cards.map((c) => {
            const isProcessing = c.status === 'processing';
            const isError = c.status === 'error';
            const isCreated = c.status === 'created';
            const isReady = c.status === 'ready';
            let badgeClass = 'slds-badge';
            let statusLabel = L.statusReady;
            if (isProcessing) {
                badgeClass += ' slds-theme_info';
                statusLabel = L.statusProcessing;
            } else if (isError) {
                badgeClass += ' slds-theme_error';
                statusLabel = L.statusError;
            } else {
                badgeClass += ' slds-theme_success';
                statusLabel = isCreated ? L.statusCreated : L.statusReady;
            }
            return {
                ...c,
                isProcessing,
                isError,
                isReady,
                isCreated,
                showForm: isReady || isCreated,
                badgeClass,
                statusLabel,
                hasPreview: !!c.previewUrl,
                tileClass: 'slds-col slds-size_1-of-1 slds-large-size_1-of-2 slds-p-around_xx-small',
                inner: 'sebcs-tile slds-box slds-box_x-small' + (isError ? ' sebcs-tile_error' : '') + (isCreated ? ' sebcs-tile_created' : ''),
                lastNameMissing: isReady && !(c.lastName || '').trim(),
                companyMissing: isReady && !(c.company || '').trim(),
                disabled: isCreated || this.isCreating
            };
        });
    }

    // ---------- helpers ----------
    _isCreatable(c) {
        return c.status === 'ready' && !!(c.lastName || '').trim() && !!(c.company || '').trim();
    }
    _patch(id, patch) {
        this.cards = this.cards.map((c) => (c.id === id ? { ...c, ...patch } : c));
    }
    _toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }
    _readPreview(file) {
        return new Promise((resolve) => {
            try {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => resolve(null);
                fr.readAsDataURL(file);
            } catch (e) {
                resolve(null);
            }
        });
    }
    _startOcr(id, isImage) {
        clearTimeout(this._timers.get(id));
        const t = setTimeout(() => {
            this._timers.delete(id);
            if (!this.cards.some((c) => c.id === id)) return;
            if (!isImage) {
                this._patch(id, { status: 'error' });
                return;
            }
            const persona = PERSONAS[this._personaIdx % PERSONAS.length];
            this._personaIdx += 1;
            this._patch(id, { ...persona, status: 'ready' });
        }, this._delay);
        this._timers.set(id, t);
    }

    // ---------- ingest ----------
    async _ingest(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        const room = this._max - this.cards.length;
        if (room <= 0 || files.length > room) {
            this._toast(this.labels.warningTitle, this.labels.maxReached.replace('{0}', this._max), 'warning');
        }
        const accepted = files.slice(0, Math.max(room, 0));
        const added = accepted.map((file) => {
            this._seq += 1;
            return {
                id: `card-${Date.now()}-${this._seq}`,
                fileName: file.name,
                isImage: (file.type || '').startsWith('image/'),
                status: 'processing',
                previewUrl: null,
                firstName: '', lastName: '', company: '', title: '', email: '', mobile: '', phone: '',
                file
            };
        });
        this.cards = [...this.cards, ...added];
        added.forEach((c) => {
            this._startOcr(c.id, c.isImage);
            if (c.isImage) {
                this._readPreview(c.file).then((url) => {
                    if (url && this.cards.some((x) => x.id === c.id)) this._patch(c.id, { previewUrl: url });
                });
            }
        });
    }

    // ---------- handlers ----------
    handleZoneClick() {
        if (this.addDisabled) return;
        const input = this.refs.fileInput;
        if (input) input.click();
    }
    handleZoneKey(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            this.handleZoneClick();
        }
    }
    handleFileChange(event) {
        const input = event.target;
        this._ingest(input.files);
        input.value = '';
    }
    handleDragOver(event) {
        event.preventDefault();
        this.isDragOver = true;
    }
    handleDragLeave(event) {
        event.preventDefault();
        this.isDragOver = false;
    }
    handleDrop(event) {
        event.preventDefault();
        this.isDragOver = false;
        if (this.isCreating) return;
        this._ingest(event.dataTransfer && event.dataTransfer.files);
    }
    handleFieldChange(event) {
        const id = event.target.dataset.id;
        const field = event.target.dataset.field;
        if (!id || !FIELDS.includes(field)) return;
        this._patch(id, { [field]: event.target.value });
    }
    handleRemove(event) {
        const id = event.currentTarget.dataset.id;
        clearTimeout(this._timers.get(id));
        this._timers.delete(id);
        this.cards = this.cards.filter((c) => c.id !== id);
    }
    handleRetry(event) {
        const id = event.currentTarget.dataset.id;
        const card = this.cards.find((c) => c.id === id);
        if (!card) return;
        this._patch(id, { status: 'processing' });
        // Retry always succeeds in mock mode, even for non-image files.
        this._startOcr(id, true);
    }
    handleClear() {
        this._timers.forEach((t) => clearTimeout(t));
        this._timers.clear();
        this.cards = [];
    }
    handleCreate() {
        if (this.createDisabled) return;
        const ids = this.cards.filter((c) => this._isCreatable(c)).map((c) => c.id);
        const n = ids.length;
        this.isCreating = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            this.cards = this.cards.map((c) => (ids.includes(c.id) ? { ...c, status: 'created' } : c));
            this._toast(
                this.labels.successTitle,
                n === 1 ? this.labels.createdOne : this.labels.created.replace('{0}', n),
                'success'
            );
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this.cards = this.cards.filter((c) => c.status !== 'created');
                this.isCreating = false;
            }, 600);
        }, CREATE_DELAY_MS);
    }
}
