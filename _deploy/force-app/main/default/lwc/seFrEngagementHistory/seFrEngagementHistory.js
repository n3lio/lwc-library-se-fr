import { LightningElement, api, track } from 'lwc';

/* ─── TYPE META — bilingual keys map to same icon/color ─── */
const TYPE_META = {
    // English keys
    'Email Open':   { icon: 'utility:email',       color: '#3b82f6' },
    'Email Sent':   { icon: 'utility:send',        color: '#6366f1' },
    'Email Click':  { icon: 'utility:link',        color: '#16a34a' },
    'Email Bounce': { icon: 'utility:warning',     color: '#dc2626' },
    'SMS Sent':     { icon: 'utility:chat',        color: '#7c3aed' },
    'SMS Click':    { icon: 'utility:link',        color: '#7c3aed' },
    'Form Submit':  { icon: 'utility:edit_form',   color: '#0891b2' },
    'Page View':    { icon: 'utility:preview',     color: '#475569' },
    // French keys (with accents)
    'Email ouvert':   { icon: 'utility:email',     color: '#3b82f6' },
    'Email envoyé':   { icon: 'utility:send',      color: '#6366f1' },
    'Email cliqué':   { icon: 'utility:link',      color: '#16a34a' },
    'Email rejeté':   { icon: 'utility:warning',   color: '#dc2626' },
    'SMS envoyé':     { icon: 'utility:chat',      color: '#7c3aed' },
    'SMS cliqué':     { icon: 'utility:link',      color: '#7c3aed' },
    'Formulaire':     { icon: 'utility:edit_form',  color: '#0891b2' },
    'Page vue':       { icon: 'utility:preview',   color: '#475569' },
    // French keys (without accents — safe for XML defaults)
    'Email envoye':   { icon: 'utility:send',      color: '#6366f1' },
    'Email clique':   { icon: 'utility:link',      color: '#16a34a' },
    'Email rejete':   { icon: 'utility:warning',   color: '#dc2626' },
    'SMS envoye':     { icon: 'utility:chat',      color: '#7c3aed' },
    'SMS clique':     { icon: 'utility:link',      color: '#7c3aed' }
};
const DEFAULT_META = { icon: 'utility:notification', color: '#64748b' };

const INITIAL_VISIBLE = 6;

const DICT = {
    fr: {
        cardTitle: 'Historique d\'engagement',
        searchPlaceholder: 'Rechercher…',
        emptyState: 'Aucun engagement.',
        emailLabel: 'Email :',
        listLabel: 'Liste :',
        showMore: 'Voir plus',
        showLess: 'Voir moins'
    },
    en: {
        cardTitle: 'Engagement History',
        searchPlaceholder: 'Search…',
        emptyState: 'No engagement.',
        emailLabel: 'Email:',
        listLabel: 'List:',
        showMore: 'Show more',
        showLess: 'Show less'
    }
};

export default class SeFrEngagementHistory extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:activations';
    @api showSearch = false;
    @api searchPlaceholder;
    @api eventTypes = '';
    @api eventEmails = '';
    @api eventLists = '';
    @api eventAges = '';

    @track searchTerm = '';
    @track expanded = false;
    @track searchOpen = false;

    get dict() { return DICT[this.language] || DICT.fr; }

    get resolvedCardTitle() { return this.cardTitle || this.dict.cardTitle; }
    get resolvedSearchPlaceholder() { return this.searchPlaceholder || this.dict.searchPlaceholder; }
    get resolvedEmptyState() { return this.dict.emptyState; }
    get resolvedEmailLabel() { return this.dict.emailLabel; }
    get resolvedListLabel() { return this.dict.listLabel; }

    get searchButtonClass() {
        return this.searchOpen ? 'search-btn-active' : '';
    }

    get allRows() {
        const types  = this._split(this.eventTypes);
        const emails = this._split(this.eventEmails);
        const lists  = this._split(this.eventLists);
        const ages   = this._split(this.eventAges);
        const term   = (this.searchTerm || '').toLowerCase();
        return types.map((type, i) => {
            const meta = TYPE_META[type] || DEFAULT_META;
            return {
                key: `${i}-${type}`,
                type,
                icon: meta.icon,
                iconStyle: `background:${meta.color}`,
                email: emails[i] || '',
                list: lists[i] || '',
                age: ages[i] || ''
            };
        }).filter((r) => {
            if (!term) return true;
            return [r.type, r.email, r.list, r.age].some((v) => (v || '').toLowerCase().includes(term));
        });
    }

    get rows() {
        if (this.expanded || this.searchTerm) return this.allRows;
        return this.allRows.slice(0, INITIAL_VISIBLE);
    }

    get totalCount() { return this.allRows.length; }
    get countLabel() { return `(${this.totalCount})`; }
    get hasRows() { return this.rows.length > 0; }

    get showToggleButton() {
        return !this.searchTerm && this.allRows.length > INITIAL_VISIBLE;
    }
    get toggleButtonLabel() {
        return this.expanded ? this.dict.showLess : this.dict.showMore;
    }
    get toggleButtonIcon() {
        return this.expanded ? 'utility:chevronup' : 'utility:chevrondown';
    }

    handleSearchToggle() {
        this.searchOpen = !this.searchOpen;
        if (!this.searchOpen) {
            this.searchTerm = '';
        }
    }

    handleSearch(event) {
        this.searchTerm = event.target.value;
    }

    handleToggle() {
        this.expanded = !this.expanded;
    }

    _split(s) {
        return (s || '').split('|').map((x) => x.trim()).filter((x) => x.length > 0);
    }
}
