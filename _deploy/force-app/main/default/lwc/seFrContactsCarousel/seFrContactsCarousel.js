import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getContacts from '@salesforce/apex/SE_FR_ContactsCarouselController.getContacts';

const LABELS = {
    en: {
        cardTitle: 'Contacts',
        empty: 'No contact linked to this account.',
        email: 'Email',
        call: 'Call',
        newContact: 'New contact',
        prev: 'Previous',
        next: 'Next'
    },
    fr: {
        cardTitle: 'Contacts',
        empty: 'Aucun contact lié à ce compte.',
        email: 'E-mail',
        call: 'Appeler',
        newContact: 'Nouveau contact',
        prev: 'Précédent',
        next: 'Suivant'
    }
};

// Parses "Contact Name=Badge Label|color" entries.
// E.g. "Eliott Mercier=Champion|#2e844a,Mathieu Bernard=Detractor|#ba0517"
function parseBadges(csv) {
    const map = {};
    if (!csv) return map;
    for (const entry of csv.split(',')) {
        const [left, right] = entry.split('=');
        if (!left || !right) continue;
        const [label, color] = right.split('|');
        map[left.trim().toLowerCase()] = {
            label: (label || '').trim(),
            color: (color || '#747474').trim()
        };
    }
    return map;
}

export default class SeFrContactsCarousel extends NavigationMixin(LightningElement) {
    @api recordId;

    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:contact';
    @api limitCount = 24;
    @api orderBy = 'LastActivityDate DESC NULLS LAST';
    @api visibleCount = 4;
    @api badgesCsv = '';
    @api hideNewContactButton = false;

    @track allContacts = [];
    @track startIndex = 0;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() {
        const base = this.cardTitle || this.labels.cardTitle;
        const n = (this.allContacts || []).length;
        return n > 0 ? `${base} (${n})` : base;
    }

    @wire(getContacts, { accountId: '$recordId', limitCount: '$limitCount', orderBy: '$orderBy' })
    wiredContacts({ data }) {
        if (data) this.allContacts = data;
    }

    get badges() { return parseBadges(this.badgesCsv); }

    // Cards rendered in the current window
    get visibleContacts() {
        const win = Number(this.visibleCount) || 4;
        const slice = (this.allContacts || []).slice(this.startIndex, this.startIndex + win);
        const badgeMap = this.badges;
        return slice.map(c => {
            // Apex returns a ContactRow wrapper (camelCase fields).
            const name = c.name || '';
            const photo = c.photoUrl;
            const key = name.toLowerCase();
            const badge = badgeMap[key];
            const initials = name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map(w => w[0].toUpperCase())
                .join('');
            return {
                id: c.id,
                name,
                title: c.title || '',
                department: c.department || '',
                email: c.email,
                phone: c.phone,
                photoUrl: photo,
                hasPhoto: !!photo,
                initials,
                badgeLabel: badge ? badge.label : null,
                badgeStyle: badge ? `background-color: ${badge.color}20; color: ${badge.color}; border: 1px solid ${badge.color};` : ''
            };
        });
    }

    get hasContacts() { return (this.allContacts || []).length > 0; }
    get canPrev() { return this.startIndex > 0; }
    get canNext() {
        const win = Number(this.visibleCount) || 4;
        return this.startIndex + win < (this.allContacts || []).length;
    }
    get prevDisabled() { return !this.canPrev; }
    get nextDisabled() { return !this.canNext; }

    handlePrev() {
        const win = Number(this.visibleCount) || 4;
        this.startIndex = Math.max(0, this.startIndex - win);
    }
    handleNext() {
        const win = Number(this.visibleCount) || 4;
        const max = Math.max(0, (this.allContacts || []).length - win);
        this.startIndex = Math.min(max, this.startIndex + win);
    }

    handleCardClick(event) {
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: 'Contact', actionName: 'view' }
        });
    }

    handleEmail(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__quickAction',
            attributes: { apiName: 'Contact.SendEmail' },
            state: { recordId: id }
        });
    }

    handleCall(event) {
        event.stopPropagation();
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__quickAction',
            attributes: { apiName: 'Global.LogACall' },
            state: { recordId: id }
        });
    }

    handleNewContact() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Contact', actionName: 'new' },
            state: { nooverride: '1', defaultFieldValues: `AccountId=${this.recordId}` }
        });
    }
}
