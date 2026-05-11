import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

const LABELS = {
    en: {
        cardTitle: 'Smart Recommendations',
        subtitle: 'Based on historical data and predictive analysis.',
        empty: 'No recommended actions at this time.',
        dismiss: 'Dismiss',
        defaultButton: 'Take action',
        relevance: 'Relevance',
        toastTitle: 'Action triggered',
        toastMessage: 'Automation is running…',
        defaults: {
            Case: [
                { title: 'Offer a goodwill gesture', desc: 'Recent service incident detected — propose a credit or commercial gesture to preserve the relationship.', btn: 'Offer gesture' },
                { title: 'Follow up on the issue', desc: 'Open items reported. A priority follow-up is recommended.', btn: 'Schedule follow-up' },
                { title: 'Quality follow-up call', desc: 'Multiple complaints logged this quarter. A courtesy call will reduce churn risk.', btn: 'Schedule call' }
            ],
            Account: [
                { title: 'Propose a product demo', desc: 'This customer buys only one product line. Cross-sell potential detected on complementary offerings.', btn: 'Schedule demo' },
                { title: 'Volume drop alert', desc: 'Order volume is down vs. the previous period. Competitive risk detected.', btn: 'Create task' },
                { title: 'Logistics optimization', desc: 'Consolidating deliveries could reduce cost. Review recommended.', btn: 'Analyze' }
            ],
            Order: [
                { title: 'Upsell opportunity', desc: 'Customer has not yet ordered a trending item. Worth suggesting on this order.', btn: 'Add to cart' },
                { title: 'Price increase advisory', desc: 'Items in this cart will see a price increase soon. Recommend an annual commitment offer.', btn: 'Send offer' },
                { title: 'Stock shortage alert', desc: 'A requested item is at risk of running out. Propose a substitute SKU.', btn: 'Substitute' }
            ],
            Contact: [
                { title: 'Marketing consent update', desc: 'Promotional email opt-in is missing. Request consent on the next call.', btn: 'Update' },
                { title: 'Customer event invitation', desc: 'This contact is a key decision-maker. Invite them to the next customer event.', btn: 'Send invitation' }
            ],
            other: [
                { title: 'Review the record', desc: 'Some information appears to be stale (>6 months).', btn: 'Review' }
            ]
        }
    },
    fr: {
        cardTitle: 'Recommandations intelligentes',
        subtitle: "Basées sur les données historiques et l'analyse prédictive.",
        empty: 'Aucune action recommandée pour le moment.',
        dismiss: 'Ignorer',
        defaultButton: 'Agir',
        relevance: 'Pertinence',
        toastTitle: 'Action déclenchée',
        toastMessage: "L'automatisation est en cours…",
        defaults: {
            Case: [
                { title: 'Proposer un geste commercial', desc: 'Incident de service récent détecté — proposer un avoir ou un geste commercial pour préserver la relation.', btn: 'Proposer un geste' },
                { title: 'Relancer sur le litige', desc: 'Éléments ouverts signalés. Une relance prioritaire est recommandée.', btn: 'Planifier une relance' },
                { title: 'Appel de suivi qualité', desc: 'Plusieurs réclamations ce trimestre. Un appel de courtoisie réduira le risque de churn.', btn: 'Planifier un appel' }
            ],
            Account: [
                { title: 'Proposer une démo produit', desc: "Ce client n'achète qu'une gamme. Potentiel de cross-sell identifié sur les offres complémentaires.", btn: 'Planifier la démo' },
                { title: 'Alerte baisse de volume', desc: 'Le volume de commandes a baissé vs. la période précédente. Risque concurrentiel détecté.', btn: 'Créer une tâche' },
                { title: 'Optimisation logistique', desc: 'Consolider les livraisons pourrait réduire les coûts. Revue recommandée.', btn: 'Analyser' }
            ],
            Order: [
                { title: "Opportunité d'upsell", desc: "Le client n'a pas encore commandé un article tendance. À suggérer sur cette commande.", btn: 'Ajouter au panier' },
                { title: 'Alerte hausse de prix', desc: 'Des articles de ce panier vont bientôt augmenter. Proposer un engagement annuel.', btn: "Envoyer l'offre" },
                { title: 'Alerte rupture de stock', desc: 'Un article demandé risque la rupture. Proposer un SKU de substitution.', btn: 'Substituer' }
            ],
            Contact: [
                { title: 'Mise à jour consentement marketing', desc: "L'opt-in e-mail promotionnel manque. Demander le consentement lors du prochain échange.", btn: 'Mettre à jour' },
                { title: 'Invitation événement client', desc: "Ce contact est un décideur clé. L'inviter au prochain événement client.", btn: "Envoyer l'invitation" }
            ],
            other: [
                { title: "Vérifier l'enregistrement", desc: 'Certaines informations semblent anciennes (>6 mois).', btn: 'Vérifier' }
            ]
        }
    }
};

export default class SeFrSmartRecommendations extends LightningElement {
    @api recordId;
    @api objectApiName;

    @api language = 'fr';
    @api cardTitle;
    @api displayMode;
    @api targetId1; @api targetRecos1;
    @api targetId2; @api targetRecos2;
    @api targetId3; @api targetRecos3;

    @api customTitle1; @api customDesc1;
    @api customTitle2; @api customDesc2;
    @api customTitle3; @api customDesc3;
    @api customTitle4; @api customDesc4;
    @api customTitle5; @api customDesc5;
    @api customTitle6; @api customDesc6;

    @api globalTitle1; @api globalDesc1; @api globalBtn1;
    @api globalTitle2; @api globalDesc2; @api globalBtn2;
    @api globalTitle3; @api globalDesc3; @api globalBtn3;
    @api globalTitle4; @api globalDesc4; @api globalBtn4;
    @api globalTitle5; @api globalDesc5; @api globalBtn5;
    @api globalTitle6; @api globalDesc6; @api globalBtn6;

    @track recosToDisplay = [];
    _lastLang;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get subtitle() { return this.labels.subtitle; }
    get emptyMessage() { return this.labels.empty; }
    get dismissLabel() { return this.labels.dismiss; }

    connectedCallback() { this.buildRecommendations(); this._lastLang = this.language; }
    renderedCallback() {
        if (this._lastLang !== this.language) {
            this.buildRecommendations();
            this._lastLang = this.language;
        }
    }

    get hasRecommendations() { return this.recosToDisplay.length > 0; }

    buildRecommendations() {
        const allRecos = this.getStandardizedRecommendations();

        if (this.displayMode === 'Targeted') {
            let activeIndices = [];
            if (this.recordId === this.targetId1 && this.targetRecos1) activeIndices = this.targetRecos1.split(',');
            else if (this.recordId === this.targetId2 && this.targetRecos2) activeIndices = this.targetRecos2.split(',');
            else if (this.recordId === this.targetId3 && this.targetRecos3) activeIndices = this.targetRecos3.split(',');

            this.recosToDisplay = activeIndices.length > 0
                ? allRecos.filter(r => activeIndices.map(i => i.trim()).includes(r.id.toString()))
                : [];
        } else {
            this.recosToDisplay = allRecos.slice(0, 2);
        }
    }

    getStandardizedRecommendations() {
        const objectDefaults = this.labels.defaults[this.objectApiName] || this.labels.defaults.other;
        const l = this.labels;
        const builtRecos = [];
        for (let i = 1; i <= 6; i++) {
            const customTitle = this[`customTitle${i}`];
            const customDesc = this[`customDesc${i}`];
            const globalTitle = this[`globalTitle${i}`];
            const globalDesc = this[`globalDesc${i}`];
            const globalBtn = this[`globalBtn${i}`];
            const fallback = objectDefaults[i - 1] || { title: `Action ${i}`, desc: `Insight ${i}` };

            builtRecos.push({
                id: i,
                title: customTitle || globalTitle || fallback.title,
                description: customDesc || globalDesc || fallback.desc,
                scoreLabel: `${l.relevance} ${Math.floor(Math.random() * 11) + 85}%`,
                buttonLabel: globalBtn || fallback.btn || l.defaultButton
            });
        }
        return builtRecos;
    }

    handleAccept(event) {
        const idToDismiss = event.target.dataset.id;
        this.dispatchEvent(new ShowToastEvent({
            title: this.labels.toastTitle,
            message: this.labels.toastMessage,
            variant: 'success',
            mode: 'pester'
        }));
        this.removeRecoFromView(idToDismiss);
    }

    handleReject(event) {
        const idToDismiss = event.target.dataset.id;
        this.removeRecoFromView(idToDismiss);
    }

    removeRecoFromView(id) {
        this.recosToDisplay = this.recosToDisplay.filter(reco => reco.id.toString() !== id.toString());
    }
}
