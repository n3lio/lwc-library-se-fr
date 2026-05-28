import { LightningElement, api, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import getContracts from '@salesforce/apex/SE_FR_ServiceContractsController.getContracts';

// Rotating palette for the trade/category badge — deterministic by index in the list.
const BADGE_PALETTE = [
    '#0ea5e9', '#f59e0b', '#6366f1', '#dc2626',
    '#ea580c', '#16a34a', '#a855f7', '#64748b'
];

const DICT = {
    fr: {
        cardTitle: 'Contrats de service',
        loading: 'Chargement',
        emptyState: 'Aucun contrat de service rattaché à ce compte.',
        slaPrefix: 'SLA',
        openWorkOrders: 'intervention(s) ouverte(s)',
        contractCount: 'contrat(s) actif(s)'
    },
    en: {
        cardTitle: 'Service Contracts',
        loading: 'Loading',
        emptyState: 'No service contracts linked to this account.',
        slaPrefix: 'SLA',
        openWorkOrders: 'open work order(s)',
        contractCount: 'active contract(s)'
    }
};

export default class SeFrServiceContracts extends NavigationMixin(LightningElement) {
    @api recordId;
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:service_contract';

    contracts = [];
    error;
    loading = true;

    get dict() { return DICT[this.language] || DICT.fr; }
    get resolvedCardTitle() { return this.cardTitle || this.dict.cardTitle; }

    @wire(getContracts, { accountId: '$recordId' })
    wired({ data, error }) {
        this.loading = false;
        if (data) {
            const metierSet = [...new Set(data.map(c => c.metier))];
            this.contracts = data.map((c) => {
                const colorIdx = metierSet.indexOf(c.metier) % BADGE_PALETTE.length;
                return {
                    ...c,
                    slaLabel: this._sla(c.slaHeures),
                    metierStyle: `background:${BADGE_PALETTE[colorIdx]}`,
                    emailHref: c.email ? `mailto:${c.email}` : null
                };
            });
            this.error = undefined;
        } else if (error) {
            this.error = error.body?.message || 'Error';
            this.contracts = [];
        }
    }

    get hasContracts() { return this.contracts.length > 0; }
    get countLabel() {
        const n = this.contracts.length;
        if (n === 0) return '';
        return `${n} ${this.dict.contractCount}`;
    }
    get resolvedLoading() { return this.dict.loading; }
    get resolvedEmptyState() { return this.dict.emptyState; }
    get resolvedSlaPrefix() { return this.dict.slaPrefix; }
    get resolvedOpenWorkOrders() { return this.dict.openWorkOrders; }

    handleOpenContract(event) {
        event.preventDefault();
        const id = event.currentTarget.dataset.id;
        if (!id) return;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: { recordId: id, objectApiName: 'ServiceContract', actionName: 'view' }
        });
    }

    _sla(h) {
        if (h == null) return '—';
        if (h < 24) return `${h} h`;
        const days = Math.floor(h / 24);
        const rest = h % 24;
        return rest === 0 ? `${days} d` : `${days} d ${rest} h`;
    }
}
