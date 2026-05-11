---
tagline: Interactive territory map with geocoded Accounts, pipeline color coding, sidebar filters and CSV export.
categories: [Geo & Field]
personas: [FieldSales, Sales]
chips:
  - Pipeline-tier color code
  - Sidebar filters
  - CSV export of view
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Owner / RecordType / amount range / stages / case status
  - 2 configurable picklist filters (Type, Industry by default)
  - Map height, map / list ratio, default center (France)
seBenefit: Pins are color-coded by open-pipeline tier (red top 20% / orange / green / grey) — instantly visualizes territory health. CSV export lets you pull the filtered list for follow-up reports.
featured: true
featuredRank: 9
releaseStatus: stable
status: active
screenshots: []
---

# SE FR - Territory Map (`seFrTerritoryMap`)

Carte interactive du territoire commercial : Accounts géolocalisés via leur Billing Address, code couleur par tier de pipeline ouvert, filtres latéraux (Owner / RecordType / fourchette de montant ouvert / étapes opportunité), tuiles KPI et export CSV de la sélection visible.

## Targets

- `lightning__HomePage`
- `lightning__AppPage`

> Pas de `lightning__RecordPage` : le composant est conçu pour une vue agrégée du territoire, pas pour une record page.

## Apex

- `SE_FR_TerritoryMapController.getTerritoryAccounts(limitCount, recordTypeName, ownerScope, amountMin, amountMax, stagesCsv)` — renvoie une liste de `TerritoryAccount` enrichis (sommes / counts d'opportunités, count des cases ouverts) basés sur les Accounts ayant `BillingLatitude` / `BillingLongitude` non nuls.
- `getStageNames()` — picklist `OpportunityStage`.
- `getAccountRecordTypes()` — RecordTypes Account actifs.

Schema-safe : tous les champs sont des standards. Aucune dépendance custom requise.

## Propriétés (App Builder)

| Propriété | Description |
|-----------|-------------|
| `language` | `'fr'` (défaut) / `'en'` |
| `cardTitle` | Titre du composant (override) |
| `limitCount` | Max accounts (1-200, défaut 100) |
| `defaultOwnerScope` | `mine` (défaut) / `all` |
| `defaultRecordType` | DeveloperName du RecordType Account pré-sélectionné |
| `defaultStagesCsv` | Étapes opportunité pré-sélectionnées (séparées par virgule) |
| `currencyCode` | Code ISO 4217 (défaut `EUR`) |
| `zoomLevel` | Zoom initial de la carte (défaut 6) |
| `filtersOpenByDefault` | Panneau de filtres ouvert par défaut |

## Couleurs des pins

- **Rouge** (top 20%) : pipeline ouvert élevé
- **Orange** (top 50%) : pipeline ouvert moyen
- **Vert** : pipeline ouvert faible mais > 0
- **Gris** : aucun pipeline ouvert

Les seuils sont calculés sur la liste visible (relatifs, pas absolus) — le top tier reste toujours saillant quel que soit le territoire.

## KPIs affichés

- Nombre de comptes visibles
- Pipeline ouvert total (formaté compact, ex. `12,5 M €`)
- Total opportunités ouvertes
- Total cases ouverts

## Export CSV

Le bouton `Exporter visible` génère un CSV (encodage UTF-8 BOM, séparateur virgule, guillemets pour les valeurs contenant des caractères spéciaux) téléchargé côté navigateur.

## Comportements

- Click sur un pin → ouvre la fiche Account dans Lightning.
- Le panneau de filtres reste collapsable via l'icône entonnoir (variant `brand` quand ouvert).
- Si `defaultOwnerScope = mine` ne renvoie rien, l'Apex bascule automatiquement sur "tous owners" (utile sur les SDOs vierges).
