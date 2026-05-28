import { LightningElement, api } from 'lwc';

const CHANNEL_COLOR = {
    SMS: '#1b5297',
    Email: '#5a5a5a',
    WhatsApp: '#16a34a',
    Push: '#6366f1'
};
const PALETTE = ['#1abc9c', '#3498db', '#9b59b6', '#e67e22', '#16a085', '#2980b9', '#8e44ad'];

const DICT = {
    fr: {
        cardTitle: 'Abonnés aux notifications',
        emptyState: 'Aucun abonné.',
        subscribedPrefix: 'Abonné',
        notifSuffix: 'notification(s)',
        footerNone: 'Aucune notification envoyée',
        footerOne: '1 notification envoyée',
        footerMany: 'notifications envoyées',
        subtitleNone: 'Aucun abonné',
        subtitleOne: '1 abonné',
        subtitleMany: 'abonnés'
    },
    en: {
        cardTitle: 'Notification Subscribers',
        emptyState: 'No subscribers.',
        subscribedPrefix: 'Subscribed',
        notifSuffix: 'notification(s)',
        footerNone: 'No notifications sent',
        footerOne: '1 notification sent',
        footerMany: 'notifications sent',
        subtitleNone: 'No subscribers',
        subtitleOne: '1 subscriber',
        subtitleMany: 'subscribers'
    }
};

export default class SeFrSubscribersList extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardSubtitle = '';
    @api cardIcon = 'standard:groups';
    @api contactNames = '';
    @api channels = '';
    @api subscribedAtRelative = '';
    @api notificationCounts = '';
    @api footerLabel = '';
    @api showFooter = false;

    get dict() { return DICT[this.language] || DICT.fr; }

    get resolvedCardTitle() { return this.cardTitle || this.dict.cardTitle; }

    get rows() {
        const names    = this._split(this.contactNames);
        const channels = this._split(this.channels);
        const ages     = this._split(this.subscribedAtRelative);
        const notifs   = this._split(this.notificationCounts);
        return names.map((name, i) => {
            const channel = channels[i] || 'Email';
            return {
                key: `${i}-${name}`,
                name,
                initials: this._initials(name),
                avatarStyle: `background:${this._color(name)}`,
                channel,
                channelStyle: `color:${CHANNEL_COLOR[channel] || '#5a5a5a'}`,
                ageLabel: ages[i] || '',
                notif: parseInt(notifs[i] || '0', 10) || 0
            };
        });
    }

    get hasRows() { return this.rows.length > 0; }
    get count() { return this.rows.length; }

    get computedSubtitle() {
        if (this.cardSubtitle) return this.cardSubtitle;
        const n = this.count;
        if (n === 0) return this.dict.subtitleNone;
        if (n === 1) return this.dict.subtitleOne;
        return `${n} ${this.dict.subtitleMany}`;
    }

    get computedFooter() {
        if (this.footerLabel) return this.footerLabel;
        const total = this.rows.reduce((s, r) => s + r.notif, 0);
        if (total === 0) return this.dict.footerNone;
        if (total === 1) return this.dict.footerOne;
        return `${total} ${this.dict.footerMany}`;
    }

    get resolvedSubscribedPrefix() { return this.dict.subscribedPrefix; }
    get resolvedNotifSuffix() { return this.dict.notifSuffix; }
    get resolvedEmptyState() { return this.dict.emptyState; }

    _split(s) {
        return (s || '').split('|').map((x) => x.trim()).filter((x) => x.length > 0);
    }

    _initials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }

    _color(name) {
        let h = 0;
        const n = name || '';
        for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
        return PALETTE[h % PALETTE.length];
    }
}
