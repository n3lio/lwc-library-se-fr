---
tagline: Checklist "Plan d'action" sur une visite terrain — démarre, séquence, clôture.
categories: [Retail Execution]
personas: [FieldSales]
chips: [Visit, Checklist, Lifecycle, Flow, Mock-ready]
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
seBenefit: Raconter l'ensemble d'une visite terrain en un seul composant — check-in horodaté, checklist (relevé linéaire, produits, commande), compte-rendu via Flow — avec progression visible et bouton "Terminer" bloqué tant que l'obligatoire n'est pas fait.
releaseStatus: GA
status: active
screenshots: []
---

# seFrVisitPlan

Checklist dynamique "Plan d'action" posée sur une `Visit__c`. Pilote tout le cycle de vie d'une visite terrain depuis une seule carte : démarrer, cocher les étapes au fil de l'eau, clôturer avec compte-rendu.

## Where to drop it
- **Target:** Lightning Record Page
- **Object:** `Visit__c`
- **App Builder label:** `CCO FR - Visit Plan`

## Qu'est-ce qu'il fait

- **État de la visite** affiché en pill (Planifiée / En cours / Terminée) + timer "temps écoulé depuis le check-in" quand elle est en cours.
- **Bouton principal** contextuel :
  - `Planifiée` → **Démarrer la visite** (passe `VisitState__c` à `In Progress`, horodate `CheckInDateTime__c`)
  - `En cours` → **Terminer la visite** (si tout l'obligatoire est coché : passe en `Completed` + horodate `CheckOutDateTime__c` ; sinon : ouvre le Flow `CCO_FR_End_Visit`)
  - `Terminée` → carte de résumé
- **Checklist "Plan d'action"** avec 5 étapes par défaut :
  1. Check-in magasin *(mandatory, actionable — même action que le bouton principal)*
  2. Relevé linéaire *(mandatory, toggle)*
  3. Relevé produits *(mandatory, toggle)*
  4. Commande *(optionnel, toggle)*
  5. Compte-rendu *(mandatory, actionable — ouvre le Flow `CCO_FR_End_Visit` dans un modal)*
- **Progress bar** `doneCount/totalCount` qui se remplit au fil des cochages.
- **Progression persistée** en `localStorage` sous `sefr-visit-progress::<recordId>` — d'autres LWCs peuvent cocher des étapes en écrivant dans la même clé. Un polling 2s synchronise la UI.
- **Modal confirmation** sur l'annulation d'une visite planifiée (`deleteRecord`).

## Properties

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `recordId` | Id | *(system)* | Id de la Visit__c courante |
| `language` | String | `fr` | `fr` ou `en` |
| `cardTitle` | String | — | Override du titre de la carte (défaut : Visite / Visit) |
| `cardIcon` | String | `standard:visit` | SLDS icon-name |

## Hooks

- Dépend de `Visit__c` (object custom lib) avec champs `VisitState__c` (picklist : Planned / In Progress / Completed / Cancelled), `CheckInDateTime__c`, `CheckOutDateTime__c`.
- Dépend du Flow `CCO_FR_End_Visit` (input `recordId` String) pour le compte-rendu.
- Écrit via `updateRecord` / `deleteRecord` du LDS — pas d'Apex.
- Toasts d'erreur sur échec `updateRecord`.

## Intégration avec d'autres LWCs

Le composant lit/écrit sa progression dans `window.localStorage` à la clé `sefr-visit-progress::<visitId>`. Format :

```json
{
  "checkin": { "done": true, "at": "2026-10-23T10:12:00.000Z" },
  "shelf":   { "done": true, "at": "2026-10-23T10:28:00.000Z" }
}
```

Un autre LWC (ex. `seFrVisitShelfCompliance` après submit d'un relevé) peut cocher la case `shelf` en écrivant dans cette clé — le polling 2s du composant Plan va la détecter et mettre la UI à jour. Idem pour `products` et `order`.

## Historique

- **2026-10-23** : porté dans la lib depuis la démo DBI/DIM (`dimStartVisit`), rebrandé en préfixe `seFr*`, migré du standard `Visit` d'Industries Retail Execution vers l'object custom `Visit__c` de la lib (champs `VisitState__c` / `CheckInDateTime__c` / `CheckOutDateTime__c`).
