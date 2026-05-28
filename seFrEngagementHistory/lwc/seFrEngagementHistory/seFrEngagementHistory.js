import { LightningElement, api } from 'lwc';

const TYPE_META = {
    'Email Open':   { icon: 'utility:email_open', color: '#3b82f6' },
    'Email Sent':   { icon: 'utility:send',       color: '#3b82f6' },
    'Email Click':  { icon: 'utility:link',       color: '#16a34a' },
    'Email Bounce': { icon: 'utility:warning',    color: '#dc2626' },
    'SMS Sent':     { icon: 'utility:chat',       color: '#7c3aed' },
    'SMS Click':    { icon: 'utility:link',       color: '#7c3aed' },
    'Form Submit':  { icon: 'utility:form',       color: '#0891b2' },
    'Page View':    { icon: 'utility:preview',    color: '#475569' }
};
const DEFAULT_META = { icon: 'utility:notification', color: '#64748b' };

const DICT = {
    fr: {
        cardTitle: 'Historique d\'engagement',
        searchPlaceholder: 'Rechercher…',
        emptyState: 'Aucun engagement.',
        emailLabel: 'Email :',
        listLabel: 'Liste :'
    },
    en: {
        cardTitle: 'Engagement History',
        searchPlaceholder: 'Search…',
        emptyState: 'No engagement.',
        emailLabel: 'Email:',
        listLabel: 'List:'
    }
};

export default class SeFrEngagementHistory extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:share';
    @api showSearch = false;
    @api searchPlaceholder;
    @api eventTypes = '';
    @api eventEmails = '';
    @api eventLists = '';
    @api eventAges = '';

    searchTerm = '';

    get dict() { return DICT[this.language] || DICT.fr; }

    get resolvedCardTitle() { return this.cardTitle || this.dict.cardTitle; }
    get resolvedSearchPlaceholder() { return this.searchPlaceholder || this.dict.searchPlaceholder; }
    get resolvedEmptyState() { return this.dict.emptyState; }
    get resolvedEmailLabel() { return this.dict.emailLabel; }
    get resolvedListLabel() { return this.dict.listLabel; }

    get rows() {
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

    get countLabel() { return `(${this.rows.length})`; }
    get hasRows() { return this.rows.length > 0; }

    handleSearch(event) {
        this.searchTerm = event.target.value;
    }

    _split(s) {
        return (s || '').split('|').map((x) => x.trim()).filter((x) => x.length > 0);
    }
}
