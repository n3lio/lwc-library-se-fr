import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

const LIB_URL = 'https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com/components.html';

// tab = API name of the custom tab (standard__navItemPage)
const SECTIONS = [
    {
        key: 'personas',
        fr: 'Parcours par persona', en: 'Journeys by persona',
        subFr: 'Une home taillée pour chaque métier', subEn: 'A tailored home for each role',
        tiles: [
            { tab: 'CCO_FR_FieldSales_Home', icon: 'standard:location', color: '#0B827C',
              fr: 'Field Sales', en: 'Field Sales',
              dFr: 'Tournée du jour, carte des comptes, visites à venir.', dEn: 'Day route, account map, upcoming visits.' },
            { tab: 'CCO_FR_RetailExec_Home', icon: 'standard:merchandising', color: '#0176D3',
              fr: 'Retail Execution', en: 'Retail Execution',
              dFr: 'Exécution en magasin : planogramme, relevé, commande.', dEn: 'In-store execution: planogram, shelf check, order.' },
            { tab: 'CCO_FR_Telesales_Home', icon: 'standard:call', color: '#7F5AB6',
              fr: 'Telesales', en: 'Telesales',
              dFr: 'File d’appels, scripts, relances et prises de commande.', dEn: 'Call queue, scripts, follow-ups and order entry.' },
            { tab: 'CCO_FR_Territory_Pipeline', icon: 'standard:opportunity', color: '#C23934',
              fr: 'Territoire & Pipeline', en: 'Territory & Pipeline',
              dFr: 'Pipeline, carte du territoire et indicateurs de performance.', dEn: 'Pipeline, territory map and performance indicators.' },
            { tab: 'CCO_FR_Marketing', icon: 'standard:lead_insights', color: '#E0771A',
              fr: 'Marketing', en: 'Marketing',
              dFr: 'Segments, engagement et consentements.', dEn: 'Segments, engagement and consent.' }
        ]
    },
    {
        key: 'records',
        fr: 'Fiches enrichies', en: 'Enriched record pages',
        subFr: 'Les pages objet, onglet par onglet', subEn: 'Object pages, tab by tab',
        tiles: [
            { tab: 'CCO_FR_Visit_Flagship', icon: 'standard:log_a_call', color: '#0B827C',
              fr: 'Visite', en: 'Visit',
              dFr: 'Check-in, linéaire, relevé produits, commande, synthèse IA.', dEn: 'Check-in, shelf, product check, order, AI summary.' },
            { tab: 'CCO_FR_Account_Flagship', icon: 'standard:account', color: '#0176D3',
              fr: 'Compte', en: 'Account',
              dFr: 'Vision 360 en 5 onglets : pilotage, pipeline, relation, terrain, service.', dEn: '360 view in 5 tabs: steering, pipeline, relationship, field, service.' },
            { tab: 'CCO_FR_Contact_Flagship', icon: 'standard:contact', color: '#7F5AB6',
              fr: 'Contact', en: 'Contact',
              dFr: 'Fiche relationnelle, engagement et préférences de contact.', dEn: 'Relationship card, engagement and contact preferences.' },
            { tab: 'CCO_FR_Opportunity_Flagship', icon: 'standard:opportunity', color: '#C23934',
              fr: 'Opportunité', en: 'Opportunity',
              dFr: 'Avancement, kanban, étapes clés et prochaines actions.', dEn: 'Progress, kanban, key stages and next actions.' },
            { tab: 'CCO_FR_Case_Flagship', icon: 'standard:case', color: '#E0771A',
              fr: 'Requête', en: 'Case',
              dFr: 'SLA, historique et recommandations de résolution.', dEn: 'SLA, history and resolution recommendations.' },
            { tab: 'CCO_FR_Lead_Flagship', icon: 'standard:lead', color: '#2E844A',
              fr: 'Lead', en: 'Lead',
              dFr: 'Premier contact, qualification et scan de carte de visite.', dEn: 'First touch, qualification and business card scan.' },
            { tab: 'CCO_FR_Order_Flagship', icon: 'standard:orders', color: '#5B6B7F',
              fr: 'Commande', en: 'Order',
              dFr: 'Lignes, totaux et suivi de la commande.', dEn: 'Lines, totals and order tracking.' }
        ]
    },
    {
        key: 'lib',
        fr: 'Aller plus loin', en: 'Go further',
        subFr: '', subEn: '',
        tiles: [
            { url: LIB_URL, icon: 'standard:product', color: '#032D60',
              fr: 'Catalogue des composants', en: 'Component catalog',
              dFr: 'Tous les composants de la librairie, avec filtres et installation.', dEn: 'Every library component, with filters and install.' }
        ]
    }
];

export default class CcoShowcaseLaunchpad extends NavigationMixin(LightningElement) {
    @api language = 'fr';
    @api cardTitle;

    get isFr() { return this.language !== 'en'; }
    get title() { return this.cardTitle || (this.isFr ? 'Où voulez-vous aller ?' : 'Where would you like to go?'); }
    get intro() {
        return this.isFr
            ? 'Choisissez un parcours : chaque tuile ouvre une page complète de l’application.'
            : 'Pick a journey: each tile opens a full page of the app.';
    }
    get openLabel() { return this.isFr ? 'Ouvrir' : 'Open'; }

    get sections() {
        const fr = this.isFr;
        return SECTIONS.map((s) => ({
            key: s.key,
            title: fr ? s.fr : s.en,
            subtitle: fr ? s.subFr : s.subEn,
            tiles: s.tiles.map((t, i) => ({
                key: `${s.key}${i}`,
                tab: t.tab || '',
                url: t.url || '',
                icon: t.icon,
                title: fr ? t.fr : t.en,
                description: fr ? t.dFr : t.dEn,
                style: `--tile-accent:${t.color};`
            }))
        }));
    }

    handleOpen(event) {
        const { tab, url } = event.currentTarget.dataset;
        if (tab) {
            this[NavigationMixin.Navigate]({
                type: 'standard__navItemPage',
                attributes: { apiName: tab }
            });
        } else if (url) {
            this[NavigationMixin.Navigate]({ type: 'standard__webPage', attributes: { url } });
        }
    }
}
