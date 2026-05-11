import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import Id from '@salesforce/user/Id';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import FIRSTNAME_FIELD from '@salesforce/schema/User.FirstName';

import getIncomingCases from '@salesforce/apex/SE_FR_TelesalesController.getIncomingCases';
import getOrdersToValidate from '@salesforce/apex/SE_FR_TelesalesController.getOrdersToValidate';
import getCallsToMake from '@salesforce/apex/SE_FR_TelesalesController.getCallsToMake';

const DEFAULT_CALLS_EN = JSON.stringify([
    { id: 'c1', time: '10:00', accountId: '', account: 'Account A', contactId: '', contact: 'Contact 1', phone: '+1 555 0100', subject: 'Monthly follow-up' },
    { id: 'c2', time: '11:15', accountId: '', account: 'Account C', contactId: '', contact: 'Contact 2', phone: '+1 555 0101', subject: 'Stock shortage follow-up' },
    { id: 'c3', time: '14:30', accountId: '', account: 'Account B', contactId: '', contact: 'Contact 3', phone: '+1 555 0102', subject: 'Quote review' }
]);
const DEFAULT_CALLS_FR = JSON.stringify([
    { id: 'c1', time: '10:00', accountId: '', account: 'Compte A', contactId: '', contact: 'Contact 1', phone: '+33 1 00 00 01', subject: 'Suivi mensuel' },
    { id: 'c2', time: '11:15', accountId: '', account: 'Compte C', contactId: '', contact: 'Contact 2', phone: '+33 1 00 00 02', subject: 'Suivi rupture de stock' },
    { id: 'c3', time: '14:30', accountId: '', account: 'Compte B', contactId: '', contact: 'Contact 3', phone: '+33 1 00 00 03', subject: 'Revue de devis' }
]);

const DEFAULT_NEWS_EN = JSON.stringify([
    { id: 'n1', accent: 'success', title: 'New catalog available', desc: 'A new product catalog is live. Review it before your next calls.', btnLabel: 'Open catalog', url: '' },
    { id: 'n2', accent: 'info', title: 'Policy update', desc: 'Internal process updates for delivery and billing handling.', btnLabel: 'Read article', url: '' },
    { id: 'n3', accent: 'warning', title: 'Webinar: Upsell techniques', desc: 'Practical tips to suggest premium offers during order entry.', btnLabel: 'Register', url: '' }
]);
const DEFAULT_NEWS_FR = JSON.stringify([
    { id: 'n1', accent: 'success', title: 'Nouveau catalogue disponible', desc: 'Un nouveau catalogue produit est en ligne. Consultez-le avant vos prochains appels.', btnLabel: 'Ouvrir le catalogue', url: '' },
    { id: 'n2', accent: 'info', title: 'Mise à jour des procédures', desc: 'Mises à jour internes concernant la livraison et la facturation.', btnLabel: "Lire l'article", url: '' },
    { id: 'n3', accent: 'warning', title: "Webinaire : Techniques d'upsell", desc: "Conseils pratiques pour proposer des offres premium à la prise de commande.", btnLabel: "S'inscrire", url: '' }
]);

const DEFAULT_CHANNEL_VOLUME_EN = JSON.stringify([
    { label: 'Phone', percent: 68.4 },
    { label: 'WhatsApp', percent: 16.2 },
    { label: 'E-commerce', percent: 9.1 },
    { label: 'Email', percent: 6.3 }
]);
const DEFAULT_CHANNEL_VOLUME_FR = JSON.stringify([
    { label: 'Téléphone', percent: 68.4 },
    { label: 'WhatsApp', percent: 16.2 },
    { label: 'E-commerce', percent: 9.1 },
    { label: 'E-mail', percent: 6.3 }
]);

const DEFAULT_SUBJECT_VOLUME_EN = JSON.stringify([
    { label: 'Order entry', percent: 58.7 },
    { label: 'Delivery / damage', percent: 24.1 },
    { label: 'Product info', percent: 11.5 },
    { label: 'Administrative', percent: 5.7 }
]);
const DEFAULT_SUBJECT_VOLUME_FR = JSON.stringify([
    { label: 'Prise de commande', percent: 58.7 },
    { label: 'Livraison / casse', percent: 24.1 },
    { label: 'Info produit', percent: 11.5 },
    { label: 'Administratif', percent: 5.7 }
]);

const DEFAULT_MONTHLY_CLOSED_EN = JSON.stringify([
    { month: 'Jan', value: 284, heightPct: 34, highlight: false },
    { month: 'Feb', value: 312, heightPct: 37, highlight: false },
    { month: 'Mar', value: 421, heightPct: 50, highlight: false },
    { month: 'Apr', value: 590, heightPct: 70, highlight: true }
]);
const DEFAULT_MONTHLY_CLOSED_FR = JSON.stringify([
    { month: 'Janv.', value: 284, heightPct: 34, highlight: false },
    { month: 'Févr.', value: 312, heightPct: 37, highlight: false },
    { month: 'Mars', value: 421, heightPct: 50, highlight: false },
    { month: 'Avr.', value: 590, heightPct: 70, highlight: true }
]);

const LABELS = {
    en: {
        greetingTemplate: 'Hello **{name}**, here is your activity for today.',
        defaultUserName: 'Rep',
        kpi1Label: 'Outbound calls',
        kpi1Footer: '72% of target',
        kpi2Label: 'Urgent to handle',
        kpi2Footer: 'Orders / Cases',
        kpi3Label: 'Revenue this month',
        kpi3Footer: 'Target: 45.0k',
        kpi4Label: 'Avg. handling time',
        kpi4Footer: '-12s vs last month',
        incomingCases: 'Incoming cases to handle',
        ordersToValidate: 'Orders to validate',
        activityAnalysis: 'Activity analysis',
        volumeByChannel: 'Volume by channel',
        volumeBySubject: 'Volume by subject',
        casesClosed: 'Cases closed',
        callsToMake: 'Calls to make',
        trainingNews: 'News',
        newsEmpty: "You're all caught up.",
        viewAll: 'View all',
        close: 'Close',
        col_caseNumber: 'Case #',
        col_date: 'Date',
        col_account: 'Account',
        col_channel: 'Channel',
        col_subject: 'Subject',
        col_status: 'Status',
        col_orderNumber: 'Order #',
        col_amount: 'Amount',
        defaultCallsJson: DEFAULT_CALLS_EN,
        defaultNewsJson: DEFAULT_NEWS_EN,
        defaultChannelVolumeJson: DEFAULT_CHANNEL_VOLUME_EN,
        defaultSubjectVolumeJson: DEFAULT_SUBJECT_VOLUME_EN,
        defaultMonthlyClosedJson: DEFAULT_MONTHLY_CLOSED_EN
    },
    fr: {
        greetingTemplate: "Bonjour **{name}**, voici votre activité pour aujourd'hui.",
        defaultUserName: 'Commercial',
        kpi1Label: 'Appels sortants',
        kpi1Footer: "72 % de l'objectif",
        kpi2Label: 'Urgents à traiter',
        kpi2Footer: 'Commandes / Cas',
        kpi3Label: 'CA du mois',
        kpi3Footer: 'Objectif : 45,0 k',
        kpi4Label: 'Temps de traitement moyen',
        kpi4Footer: '-12 s vs mois dernier',
        incomingCases: 'Cas entrants à traiter',
        ordersToValidate: 'Commandes à valider',
        activityAnalysis: "Analyse d'activité",
        volumeByChannel: 'Volume par canal',
        volumeBySubject: 'Volume par sujet',
        casesClosed: 'Cas clôturés',
        callsToMake: 'Appels à passer',
        trainingNews: 'Actualités',
        newsEmpty: 'Vous êtes à jour.',
        viewAll: 'Voir tout',
        close: 'Fermer',
        col_caseNumber: 'N° Cas',
        col_date: 'Date',
        col_account: 'Compte',
        col_channel: 'Canal',
        col_subject: 'Sujet',
        col_status: 'Statut',
        col_orderNumber: 'N° Commande',
        col_amount: 'Montant',
        defaultCallsJson: DEFAULT_CALLS_FR,
        defaultNewsJson: DEFAULT_NEWS_FR,
        defaultChannelVolumeJson: DEFAULT_CHANNEL_VOLUME_FR,
        defaultSubjectVolumeJson: DEFAULT_SUBJECT_VOLUME_FR,
        defaultMonthlyClosedJson: DEFAULT_MONTHLY_CLOSED_FR
    }
};

const PALETTE = ['#0176d3', '#2e844a', '#fe9339', '#c13975', '#7f8ceb', '#747474'];

function formatDate(iso, localeTag) {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString(localeTag, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) { return ''; }
}

export default class SeFrTelesalesRepHome extends NavigationMixin(LightningElement) {
    userId = Id;

    @api language = 'fr';
    @api greetingTemplate;
    @api defaultUserName;
    @api highlightColor = '#0176d3';

    // Case filters
    @api caseStatusesCsv = 'New,Working,Waiting on Customer,Escalated';
    @api caseOwnerScope = 'all';
    @api caseLimit = 6;
    @api caseListView = 'Recent';

    // Order filters
    @api orderStatusesCsv = 'Draft';
    @api orderOwnerScope = 'all';
    @api orderLimit = 6;
    @api orderListView = 'Recent';

    // Calls to make — dynamic (real Contacts with a phone, prioritised by Account signals)
    @api callsRecordType = '';
    @api callsOwnerScope = 'all';
    @api callsLimit = 5;

    // KPI tiles
    @api kpi1Label;
    @api kpi1Value = '18 / 25';
    @api kpi1Footer;
    @api kpi1FooterClass = 'slds-text-color_success';
    @api kpi2Label;
    @api kpi2Value = '8';
    @api kpi2Footer;
    @api kpi2FooterClass = 'slds-text-color_weak';
    @api kpi3Label;
    @api kpi3Value = '38.4k';
    @api kpi3Footer;
    @api kpi3FooterClass = 'slds-text-color_weak';
    @api kpi4Label;
    @api kpi4Value = '3m 15s';
    @api kpi4Footer;
    @api kpi4FooterClass = 'slds-text-color_success';

    @api currencyCode = 'EUR';
    @api localeTag = 'fr-FR';

    // JSON overrides — if empty, the language dictionary is used.
    @api callsJson;
    @api newsJson;
    @api channelVolumeJson;
    @api subjectVolumeJson;
    @api monthlyClosedJson;

    @track caseRows = [];
    @track orderRows = [];
    @track liveCalls = [];

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedGreetingTemplate() { return this.greetingTemplate || this.labels.greetingTemplate; }
    get resolvedDefaultUserName() { return this.defaultUserName || this.labels.defaultUserName; }
    get resolvedKpi1Label() { return this.kpi1Label || this.labels.kpi1Label; }
    get resolvedKpi1Footer() { return this.kpi1Footer || this.labels.kpi1Footer; }
    get resolvedKpi2Label() { return this.kpi2Label || this.labels.kpi2Label; }
    get resolvedKpi2Footer() { return this.kpi2Footer || this.labels.kpi2Footer; }
    get resolvedKpi3Label() { return this.kpi3Label || this.labels.kpi3Label; }
    get resolvedKpi3Footer() { return this.kpi3Footer || this.labels.kpi3Footer; }
    get resolvedKpi4Label() { return this.kpi4Label || this.labels.kpi4Label; }
    get resolvedKpi4Footer() { return this.kpi4Footer || this.labels.kpi4Footer; }

    @wire(getRecord, { recordId: '$userId', fields: [FIRSTNAME_FIELD] })
    userRecord;

    get userName() {
        return (this.userRecord && this.userRecord.data && getFieldValue(this.userRecord.data, FIRSTNAME_FIELD)) || this.resolvedDefaultUserName;
    }
    get greeting() {
        return (this.resolvedGreetingTemplate || '').replace('{name}', this.userName);
    }
    get greetingSegments() {
        const raw = (this.resolvedGreetingTemplate || '').replace('{name}', this.userName);
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

    @wire(getIncomingCases, {
        statusesCsv: '$caseStatusesCsv',
        ownerScope: '$caseOwnerScope',
        limitCount: '$caseLimit'
    })
    wiredCases({ data }) {
        if (data) {
            this.caseRows = data.map(c => ({
                id: c.Id,
                caseNumber: c.CaseNumber,
                caseNumberUrl: `/lightning/r/Case/${c.Id}/view`,
                createdDate: formatDate(c.CreatedDate, this.localeTag),
                account: c.Account ? c.Account.Name : '',
                accountUrl: c.AccountId ? `/lightning/r/Account/${c.AccountId}/view` : '',
                origin: c.Origin || '',
                subject: c.Subject || '',
                status: c.Status || ''
            }));
        }
    }

    @wire(getOrdersToValidate, {
        statusesCsv: '$orderStatusesCsv',
        ownerScope: '$orderOwnerScope',
        limitCount: '$orderLimit'
    })
    wiredOrders({ data }) {
        if (data) {
            this.orderRows = data.map(o => ({
                id: o.Id,
                orderNumber: o.OrderNumber,
                orderNumberUrl: `/lightning/r/Order/${o.Id}/view`,
                createdDate: formatDate(o.CreatedDate, this.localeTag),
                account: o.Account ? o.Account.Name : '',
                accountUrl: o.AccountId ? `/lightning/r/Account/${o.AccountId}/view` : '',
                channel: (o.SalesChannel && o.SalesChannel.SalesChannelName) || '—',
                status: o.Status || '',
                amount: o.TotalAmount
            }));
        }
    }

    get caseColumns() {
        const l = this.labels;
        return [
            { label: l.col_caseNumber, fieldName: 'caseNumberUrl', type: 'url', initialWidth: 120, typeAttributes: { label: { fieldName: 'caseNumber' }, target: '_self' } },
            { label: l.col_date, fieldName: 'createdDate', type: 'text', initialWidth: 100 },
            { label: l.col_account, fieldName: 'accountUrl', type: 'url', typeAttributes: { label: { fieldName: 'account' }, target: '_self' } },
            { label: l.col_channel, fieldName: 'origin', type: 'text', initialWidth: 120 },
            { label: l.col_subject, fieldName: 'subject', type: 'text' },
            { label: l.col_status, fieldName: 'status', type: 'text', initialWidth: 160 }
        ];
    }

    get orderColumns() {
        const l = this.labels;
        return [
            { label: l.col_orderNumber, fieldName: 'orderNumberUrl', type: 'url', initialWidth: 120, typeAttributes: { label: { fieldName: 'orderNumber' }, target: '_self' } },
            { label: l.col_date, fieldName: 'createdDate', type: 'text', initialWidth: 100 },
            { label: l.col_account, fieldName: 'accountUrl', type: 'url', typeAttributes: { label: { fieldName: 'account' }, target: '_self' } },
            { label: l.col_channel, fieldName: 'channel', type: 'text', initialWidth: 130 },
            { label: l.col_status, fieldName: 'status', type: 'text', initialWidth: 120 },
            { label: l.col_amount, fieldName: 'amount', type: 'currency', typeAttributes: { currencyCode: this.currencyCode }, initialWidth: 130 }
        ];
    }

    parseJson(json, fallback) {
        try { return JSON.parse(json); } catch (e) { return fallback; }
    }

    get effectiveCallsJson() { return this.callsJson || this.labels.defaultCallsJson; }
    get effectiveNewsJson() { return this.newsJson || this.labels.defaultNewsJson; }
    get effectiveChannelVolumeJson() { return this.channelVolumeJson || this.labels.defaultChannelVolumeJson; }
    get effectiveSubjectVolumeJson() { return this.subjectVolumeJson || this.labels.defaultSubjectVolumeJson; }
    get effectiveMonthlyClosedJson() { return this.monthlyClosedJson || this.labels.defaultMonthlyClosedJson; }

    // Default time-slots for the call list — 5 slots, matches callsLimit default.
    _callTimeSlots = ['09:00', '10:30', '11:45', '14:15', '16:00'];

    @wire(getCallsToMake, {
        recordTypeName: '$callsRecordType',
        ownerScope: '$callsOwnerScope',
        limitCount: '$callsLimit'
    })
    wiredCalls({ data }) {
        if (data) {
            this.liveCalls = data.map((c, i) => ({
                id: c.Id,
                time: this._callTimeSlots[i % this._callTimeSlots.length],
                accountId: c.AccountId || '',
                account: (c.Account && c.Account.Name) || '',
                contactId: c.Id,
                contact: c.Name || '',
                phone: c.MobilePhone || c.Phone || '',
                subject: c.Title || ''
            }));
        }
    }

    // Explicit JSON override wins; otherwise the live wired Contacts are used.
    get mockCalls() {
        if (this.callsJson) return this.parseJson(this.effectiveCallsJson, []);
        return this.liveCalls || [];
    }

    _buildBarRow(row, index, prefix) {
        const color = PALETTE[index % PALETTE.length];
        return {
            id: `${prefix}-${index}`,
            label: row.label,
            percentDisplay: `${row.percent}%`,
            fillStyle: `width: ${row.percent}%; background-color: ${color};`
        };
    }
    get channelVolume() {
        return this.parseJson(this.effectiveChannelVolumeJson, []).map((r, i) => this._buildBarRow(r, i, 'ch'));
    }
    get subjectVolume() {
        return this.parseJson(this.effectiveSubjectVolumeJson, []).map((r, i) => this._buildBarRow(r, i, 'sj'));
    }
    get monthlyClosed() {
        return this.parseJson(this.effectiveMonthlyClosedJson, []).map((r, i) => {
            const isHighlight = !!r.highlight;
            return {
                id: `mc-${i}`,
                month: r.month,
                value: r.value,
                valueClass: isHighlight ? 'col-val col-val_highlight' : 'col-val',
                labelClass: isHighlight ? 'col-label col-label_highlight' : 'col-label',
                barClass: isHighlight ? 'col-bar col-bar_highlight' : 'col-bar',
                barStyle: `height: ${r.heightPct}%;`
            };
        });
    }

    @track mockNews = [];
    _newsLang;
    connectedCallback() { this._rebuildNews(); }
    renderedCallback() {
        // Re-derive news when language changes at runtime (App Builder save).
        if (this._newsLang !== this.language) this._rebuildNews();
    }
    _rebuildNews() {
        this.mockNews = this.parseJson(this.effectiveNewsJson, []).map(n => ({
            ...n,
            cssClass: `news-card news-${n.accent || 'info'}`
        }));
        this._newsLang = this.language;
    }
    get hasNews() { return this.mockNews && this.mockNews.length > 0; }

    handleCloseNews(event) {
        const newsId = event.currentTarget.dataset.id;
        this.mockNews = this.mockNews.filter(news => news.id !== newsId);
    }

    navigateToOrdersList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Order', actionName: 'list' },
            state: { filterName: this.orderListView }
        });
    }
    navigateToCasesList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Case', actionName: 'list' },
            state: { filterName: this.caseListView }
        });
    }
    navigateToVoiceCallsList() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'VoiceCall', actionName: 'list' }
        });
    }
    navigateToUrl(event) {
        const url = event.currentTarget.dataset.url;
        if (url) window.open(url, '_blank');
    }
    navigateToRecord(event) {
        const recordId = event.currentTarget.dataset.id;
        if (recordId) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId, actionName: 'view' }
            });
        }
    }
}
