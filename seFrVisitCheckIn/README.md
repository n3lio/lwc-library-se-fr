---
tagline: Check-in / Check-out terrain en un clic sur la visite, avec chrono et récapitulatif de durée.
categories: [Geo & Field]
personas: [FieldSales]
chips: [Visit, Check-in, Check-out, Lifecycle]
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
originalAuthorEmail: lionel.braun@salesforce.com
maintainedBy: SE FR team
libraryIntegrationDate: 2026-10-23
keyProps:
  - cardTitle
  - cardIcon
  - language
seBenefit: Montrer en démo le cycle de vie d'une visite (Planned, In Progress, Completed) sans Apex ni Flow, uniquement avec updateRecord.
releaseStatus: GA
status: active
screenshots: []
---

# seFrVisitCheckIn

Check-in / Check-out pour `Visit__c`, piloté par `VisitState__c`.

## Where to drop it
- **Target:** Lightning Record Page
- **Object:** Visit__c
- **App Builder label:** `CCO FR - Visit Check-In`

## Behavior
| VisitState__c | UI | Write |
|---|---|---|
| Planned | Bouton Check-in | `CheckInDateTime__c = now`, state In Progress |
| In Progress | Bouton Check-out + temps écoulé (rafraîchi toutes les 30 s) | `CheckOutDateTime__c = now`, state Completed |
| Completed | Carte récap (durée, date de clôture) + Rouvrir | state In Progress, `CheckOutDateTime__c` vidé |
| Cancelled | Message + Replanifier | state Planned |

## Dependencies
- No Apex, no Flow: `updateRecord` from `lightning/uiRecordApi`.
- Permission set `CCO_FR_Showcase_Visitor` (Create/Edit on Visit__c + FLS).

## Properties
`language` (fr/en), `cardTitle`, `cardIcon` (default `standard:activations`).
