import { LightningElement, api } from 'lwc';

// Same reference numbers as seFrRevenueDashboard / seFrAccountStrategyPlan / seFrMetricTile so
// all four revenue-aware components tell a coherent story on the same Account.
// YTD revenue = 38,550 / panier = 285 / interactions = 18.
const LABELS = {
    en: {
        cardTitle: 'Sales Performance Dashboard (YTD)',
        kpi1Value: '$38,550',
        kpi1Label: 'Total Customer Revenue',
        kpi2Value: '$285',
        kpi2Label: 'Average Basket',
        kpi3Value: '18',
        kpi3Label: 'Interactions',
        categoriesTitle: 'By Category',
        brandsTitle: 'By Brand',
        storesTitle: 'Top Locations',
        storeVisitsSuffix: 'vis.',
        categoriesCsv: 'Category A|55|#005fb2,Category B|25|#f2a900,Category C|12|#00a1e0,Category D|8|#4caf50',
        brandsCsv: 'Brand A|55|#005fb2,Brand B|25|#4a4a4a,Brand C|12|#e63946,Brand D|8|#4caf50',
        storesCsv: 'Paris|12|100|#005fb2,Lyon|4|33|#89b3e0,Bordeaux|2|16|#89b3e0'
    },
    fr: {
        cardTitle: 'Tableau de bord des ventes (cumul annuel)',
        kpi1Value: '38 550 €',
        kpi1Label: 'CA client total',
        kpi2Value: '285 €',
        kpi2Label: 'Panier moyen',
        kpi3Value: '18',
        kpi3Label: 'Interactions',
        categoriesTitle: 'Par catégorie',
        brandsTitle: 'Par marque',
        storesTitle: 'Top sites',
        storeVisitsSuffix: 'vis.',
        categoriesCsv: 'Catégorie A|55|#005fb2,Catégorie B|25|#f2a900,Catégorie C|12|#00a1e0,Catégorie D|8|#4caf50',
        brandsCsv: 'Marque A|55|#005fb2,Marque B|25|#4a4a4a,Marque C|12|#e63946,Marque D|8|#4caf50',
        storesCsv: 'Paris|12|100|#005fb2,Lyon|4|33|#89b3e0,Bordeaux|2|16|#89b3e0'
    }
};

function parseBarCsv(csv, valueKey) {
    if (!csv) return [];
    return csv.split(',').map((row, i) => {
        const parts = row.split('|').map(p => p.trim());
        const label = parts[0] || '';
        const value = Number(parts[1]) || 0;
        const color = parts[2] || '#005fb2';
        return {
            id: `${i}`,
            label,
            [valueKey]: value,
            color,
            style: `width: ${value}%; background-color: ${color};`
        };
    }).filter(r => r.label);
}

function parseStoresCsv(csv) {
    if (!csv) return [];
    return csv.split(',').map((row, i) => {
        const parts = row.split('|').map(p => p.trim());
        const label = parts[0] || '';
        const visits = Number(parts[1]) || 0;
        const width = Number(parts[2]) || 0;
        const color = parts[3] || '#005fb2';
        return {
            id: `${i}`,
            label,
            visits,
            width,
            color,
            style: `width: ${width}%; background-color: ${color};`
        };
    }).filter(r => r.label);
}

export default class SeFrCustomerSalesSummary extends LightningElement {
    @api language = 'fr';
    @api cardTitle;
    @api cardIcon = 'standard:performance';

    @api kpi1Label;
    @api kpi1Value;
    @api kpi2Label;
    @api kpi2Value;
    @api kpi3Label;
    @api kpi3Value;

    @api categoriesTitle;
    @api categoriesIcon = 'standard:product';
    @api categoriesCsv;

    @api brandsTitle;
    @api brandsIcon = 'standard:brand';
    @api brandsCsv;

    @api storesTitle;
    @api storesIcon = 'standard:store';
    @api storesCsv;

    @api storeVisitsSuffix;

    get labels() { return LABELS[this.language] || LABELS.en; }
    get resolvedCardTitle() { return this.cardTitle || this.labels.cardTitle; }
    get resolvedKpi1Label() { return this.kpi1Label || this.labels.kpi1Label; }
    get resolvedKpi2Label() { return this.kpi2Label || this.labels.kpi2Label; }
    get resolvedKpi3Label() { return this.kpi3Label || this.labels.kpi3Label; }
    get resolvedKpi1Value() { return this.kpi1Value || this.labels.kpi1Value; }
    get resolvedKpi2Value() { return this.kpi2Value || this.labels.kpi2Value; }
    get resolvedKpi3Value() { return this.kpi3Value || this.labels.kpi3Value; }
    get resolvedCategoriesTitle() { return this.categoriesTitle || this.labels.categoriesTitle; }
    get resolvedBrandsTitle() { return this.brandsTitle || this.labels.brandsTitle; }
    get resolvedStoresTitle() { return this.storesTitle || this.labels.storesTitle; }
    get resolvedStoreVisitsSuffix() { return this.storeVisitsSuffix || this.labels.storeVisitsSuffix; }

    get formattedCategories() { return parseBarCsv(this.categoriesCsv || this.labels.categoriesCsv, 'value'); }
    get formattedBrands() { return parseBarCsv(this.brandsCsv || this.labels.brandsCsv, 'value'); }
    get formattedStores() { return parseStoresCsv(this.storesCsv || this.labels.storesCsv); }
}
