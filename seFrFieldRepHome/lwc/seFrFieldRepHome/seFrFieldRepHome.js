import { LightningElement, api, wire, track } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import Id from '@salesforce/user/Id';
import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import FIRSTNAME_FIELD from '@salesforce/schema/User.FirstName';

import getPriorityAccounts from '@salesforce/apex/SE_FR_FieldSalesController.getPriorityAccounts';
import getMyLeads from '@salesforce/apex/SE_FR_FieldSalesController.getMyLeads';

const LABELS = {
    en: {
        greetingTemplate: 'Hello **{name}**, here is your action plan for today.',
        defaultUserName: 'Rep',
        kpi1Label: "Today's visits",
        kpi1Footer: 'Behind target',
        kpi2Label: 'Prospects to contact',
        kpi2Footer: 'New leads (Score > 20)',
        kpi3Label: 'Signed Revenue (Month)',
        kpi3Footer: 'Target: 20.0k',
        kpi4Label: 'Visits completed (Month)',
        kpi4Footer: '105% of target (80)',
        priorityAccounts: 'Priority accounts to visit',
        priorityEmpty: 'No priority accounts found.',
        newLeads: 'New leads to convert',
        leadsEmpty: 'No leads found.',
        productPenetration: 'Product penetration',
        penetrationTip: 'Tip: Focus upsell efforts on the lowest-penetrated categories.',
        campaignCalendar: 'Campaign calendar',
        viewAll: 'View all',
        prepareVisit: 'Prepare visit',
        call: 'Call',
        learnMore: 'Learn more',
        locationNotSet: 'Location not set',
        visitMotivesCsv: 'Introduce new lineup|slds-text-color_success,High churn risk|slds-text-color_error,Issue with last order|slds-text-color_error,Quarterly review|slds-text-color_default,Monthly recurring visit|slds-text-color_default,Product demo|slds-text-color_success',
        penetrationRowsCsv: 'Category A|85,Category B|45,Category C|12',
        eventsCsv: 'Quarterly promotion|Discount offer running this month.,Product launch|New catalog available. Contact your KAM for details.,Partner event invitation|Invite your priority accounts.'
    },
    fr: {
        greetingTemplate: "Bonjour **{name}**, voici votre plan d'action pour aujourd'hui.",
        defaultUserName: 'Commercial',
        kpi1Label: "Visites du jour",
        kpi1Footer: "En retard sur l'objectif",
        kpi2Label: 'Prospects à contacter',
        kpi2Footer: 'Nouveaux leads (Score > 20)',
        kpi3Label: 'CA signé (mois)',
        kpi3Footer: 'Objectif : 20,0 k',
        kpi4Label: 'Visites réalisées (mois)',
        kpi4Footer: "105 % de l'objectif (80)",
        priorityAccounts: 'Comptes prioritaires à visiter',
        priorityEmpty: 'Aucun compte prioritaire trouvé.',
        newLeads: 'Nouveaux leads à convertir',
        leadsEmpty: 'Aucun lead trouvé.',
        productPenetration: 'Pénétration produit',
        penetrationTip: "Astuce : concentrer les efforts d'upsell sur les catégories les moins pénétrées.",
        campaignCalendar: 'Calendrier des campagnes',
        viewAll: 'Voir tout',
        prepareVisit: 'Préparer la visite',
        call: 'Appeler',
        learnMore: 'En savoir plus',
        locationNotSet: 'Localisation non renseignée',
        visitMotivesCsv: 'Présenter la nouvelle gamme|slds-text-color_success,Risque de churn élevé|slds-text-color_error,Problème sur la dernière commande|slds-text-color_error,Revue trimestrielle|slds-text-color_default,Visite mensuelle récurrente|slds-text-color_default,Démo produit|slds-text-color_success',
        penetrationRowsCsv: 'Catégorie A|85,Catégorie B|45,Catégorie C|12',
        eventsCsv: 'Promotion trimestrielle|Offre en cours ce mois-ci.,Lancement produit|Nouveau catalogue disponible. Contactez votre KAM.,Invitation événement partenaire|Invitez vos comptes prioritaires.'
    }
};

export default class SeFrFieldRepHome extends NavigationMixin(LightningElement) {
    userId = Id;

    @api language = 'fr';
    @api greetingTemplate;
    @api defaultUserName;
    @api highlightColor = '#0176d3';

    // Account filters
    @api accountRecordType = 'SDO_Account_Simple';
    @api accountOwnerScope = 'mine';
    @api accountOrderBy = 'Name';
    @api accountLimit = 6;

    // Lead filters
    @api leadRating = 'Hot';
    @api leadOwnerScope = 'mine';
    @api leadLimit = 6;

    // KPI tiles — text only; footer CSS classes stay English class names (SLDS)
    @api kpi1Label;
    @api kpi1Value = '4 / 10';
    @api kpi1Footer;
    @api kpi1FooterClass = 'slds-text-color_error';

    @api kpi2Label;
    @api kpi2Value = '10';
    @api kpi2Footer;
    @api kpi2FooterClass = 'slds-text-color_weak';

    @api kpi3Label;
    @api kpi3Value = '22.4k';
    @api kpi3Footer;
    @api kpi3FooterClass = 'slds-text-color_success';

    @api kpi4Label;
    @api kpi4Value = '84';
    @api kpi4Footer;
    @api kpi4FooterClass = 'slds-text-color_success';

    // CSV defaults — overridable per demo
    @api visitMotivesCsv;
    @api penetrationRowsCsv;
    @api penetrationTip;
    @api eventsCsv;

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
    get resolvedPenetrationTip() { return this.penetrationTip || this.labels.penetrationTip; }

    @wire(getRecord, { recordId: '$userId', fields: [FIRSTNAME_FIELD] })
    userRecord;

    get userName() {
        return (this.userRecord && this.userRecord.data && getFieldValue(this.userRecord.data, FIRSTNAME_FIELD)) || this.resolvedDefaultUserName;
    }
    get greeting() {
        return (this.resolvedGreetingTemplate || '').replace('{name}', this.userName);
    }
    // Splits the greeting around **…** segments so the {name} (or any other highlighted word) renders
    // in the highlight color while the rest stays on the default text color.
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

    @track accounts = [];
    @track leads = [];

    get resolvedVisitMotivesCsv() { return this.visitMotivesCsv || this.labels.visitMotivesCsv; }
    get resolvedPenetrationRowsCsv() { return this.penetrationRowsCsv || this.labels.penetrationRowsCsv; }
    get resolvedEventsCsv() { return this.eventsCsv || this.labels.eventsCsv; }

    get visitMotives() {
        return (this.resolvedVisitMotivesCsv || '').split(',').map(entry => {
            const [text, cssClass] = entry.split('|').map(s => (s || '').trim());
            return { text, cssClass: cssClass || 'slds-text-color_default' };
        }).filter(m => m.text);
    }

    get penetrationRows() {
        const palette = ['#0176d3', '#2e844a', '#fe9339', '#c13975', '#7f8ceb', '#747474'];
        return (this.resolvedPenetrationRowsCsv || '').split(',').map((entry, index) => {
            const [label, percent] = entry.split('|').map(s => (s || '').trim());
            const pct = Number(percent) || 0;
            const color = palette[index % palette.length];
            return {
                id: index + 1,
                label,
                percentDisplay: `${pct}%`,
                fillStyle: `width: ${pct}%; background-color: ${color};`
            };
        }).filter(r => r.label);
    }

    get events() {
        const palette = ['#0176d3', '#2e844a', '#fe9339', '#c13975'];
        return (this.resolvedEventsCsv || '').split(',').map((entry, index) => {
            const [title, description] = entry.split('|').map(s => (s || '').trim());
            const color = palette[index % palette.length];
            return {
                id: index + 1,
                title,
                description,
                borderStyle: `border-left-color: ${color};`
            };
        }).filter(e => e.title);
    }

    @wire(getPriorityAccounts, {
        recordTypeName: '$accountRecordType',
        ownerScope: '$accountOwnerScope',
        orderBy: '$accountOrderBy',
        limitCount: '$accountLimit'
    })
    wiredAccounts({ data }) {
        if (data) {
            const motives = this.visitMotives;
            this.accounts = data.map((acc, index) => {
                const motive = motives.length > 0 ? motives[index % motives.length] : { text: '', cssClass: '' };
                return {
                    ...acc,
                    city: acc.BillingCity || acc.BillingCountry || this.labels.locationNotSet,
                    visitMotive: motive.text,
                    motiveClass: motive.cssClass
                };
            });
        }
    }

    @wire(getMyLeads, {
        rating: '$leadRating',
        ownerScope: '$leadOwnerScope',
        limitCount: '$leadLimit'
    })
    wiredLeads({ data }) {
        if (data) {
            this.leads = data.map(lead => ({ ...lead }));
        }
    }

    get hasAccounts() { return this.accounts && this.accounts.length > 0; }
    get hasLeads() { return this.leads && this.leads.length > 0; }

    navigateToRecord(event) {
        if (event.currentTarget.dataset.id) {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: { recordId: event.currentTarget.dataset.id, actionName: 'view' }
            });
        }
    }

    navigateToAccounts() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Account', actionName: 'list' },
            state: { filterName: 'Recent' }
        });
    }

    navigateToLeads() {
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: { objectApiName: 'Lead', actionName: 'list' },
            state: { filterName: 'Recent' }
        });
    }
}
