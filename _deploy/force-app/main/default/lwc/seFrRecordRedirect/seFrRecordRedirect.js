import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

/**
 * SE FR — Record Redirect
 * -----------------------
 * Composant utilitaire pour construire des tabs "quick-access" qui pointent
 * directement sur un record page. On le pose sur une AppPage avec
 * (recordId, objectApiName) en design properties, puis on crée une Lightning
 * Page Tab vers cette AppPage. Au premier mount, le composant navigue via
 * NavigationMixin vers la fiche cible (standard__recordPage).
 *
 * Pas d'Apex, pas de wire adapter, pas de dépendance externe.
 */
export default class SeFrRecordRedirect extends NavigationMixin(LightningElement) {
    @api recordId;
    @api objectApiName;
    @api cardTitle = 'Ouverture de la fiche…';

    _navigated = false;

    connectedCallback() {
        if (this._navigated) return;
        if (!this.recordId || !this.objectApiName) return;
        this._navigated = true;

        // requestAnimationFrame : laisse le DOM peindre le spinner avant la
        // navigation, pour éviter un flash blanc.
        requestAnimationFrame(() => {
            this[NavigationMixin.Navigate]({
                type: 'standard__recordPage',
                attributes: {
                    recordId: this.recordId,
                    objectApiName: this.objectApiName,
                    actionName: 'view'
                }
            });
        });
    }

    get missingConfig() {
        return !this.recordId || !this.objectApiName;
    }
}
