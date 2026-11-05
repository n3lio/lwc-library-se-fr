---
tagline: Relevé produits terrain depuis le Standard Pricebook — Présent / Rupture / prix constaté par produit.
categories: [Retail Execution]
personas: [FieldSales]
chips: [Visit, Products, Pricebook, Audit, Field-sales]
dataMode: standard
mobileReady: true
originalAuthor: Lionel Braun
originalAuthorEmail: lionel.braun@salesforce.com
maintainedBy: SE FR team
libraryIntegrationDate: 2026-10-23
keyProps:
  - cardTitle
  - cardIcon
  - language
  - maxCount
seBenefit: Permet au commercial terrain de pointer en quelques secondes la présence rayon et le prix constaté de ses références catalogue, et coche automatiquement l'étape « Relevé produits » du plan de visite.
releaseStatus: GA
status: active
screenshots: []
---

# seFrVisitProductCheck (Visit Product Check)

Visit__c record page. Liste de produits actifs depuis le **Standard Pricebook** (fallback : tous les `Product2` actifs), avec pour chaque produit :

- Deux pills **Présent / Rupture** (toggle, mutuellement exclusifs)
- Un champ **prix constaté** (texte libre)
- Un champ **note** (facultatif)

Les saisies sont persistées en `localStorage` sous `sefr-product-check::<recordId>` (démo — pas de DML sur l'org). Dès la **première interaction** utilisateur, le composant publie `products:done` dans la clé partagée `sefr-visit-progress::<recordId>` → `seFrVisitPlan` coche automatiquement l'étape « Relevé produits ».

- App Builder label : `CCO FR - Visit Product Check`
- Apex (read-only) : `SE_FR_ProductCheckController.getProducts(recordId, maxCount)` — `WITH USER_MODE`, pas de DML.
- Objets utilisés : `Pricebook2` (lecture `IsStandard`), `PricebookEntry` (lecture `UnitPrice` + relation `Product2`), fallback direct sur `Product2`.
- Dépend de : étape « products » de `seFrVisitPlan` (synchro checklist via `sefr-visit-progress::<recordId>`).

## Props App Builder

| Prop | Type | Défaut | Description |
|---|---|---|---|
| `language` | String | `fr` | `fr` ou `en`. |
| `cardTitle` | String | — | Override du titre (sinon : `Relevé produits` / `Product audit`). |
| `cardIcon` | String | — | Override de l'icône SLDS (sinon : `standard:product_item`). |
| `maxCount` | Integer | `12` | Nombre max de produits listés (clampé à 50). |

## Design choices

- **Standard Pricebook by default** : les orgs CPG démo ont rarement un Pricebook custom lié à chaque compte. Partir du Standard Pricebook est le fallback le plus universel et évite la dépendance à un champ custom sur `Account`.
- **Pas de DML** : la démo privilégie la rapidité et la fluidité ; la persistance locale rend le réglage trivial entre sessions sans polluer l'org.
- **Progression autopublic** : dès la première interaction (clic pill OU saisie prix/note), le composant publie une seule fois `products:done`. Pas de toast au moindre click, un seul au premier.
