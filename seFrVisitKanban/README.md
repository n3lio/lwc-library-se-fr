---
tagline: Kanban des visites du compte - glisser-deposer pour faire avancer une visite de Planifiee a Terminee.
categories: [Retail Execution]
personas: [FieldSales, Sales, Retail]
chips: [Account, Visit, Kanban, Lifecycle]
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
originalAuthorEmail: lionel.braun@salesforce.com
maintainedBy: SE FR team
libraryIntegrationDate: 2026-10-23
keyProps:
  - cardTitle
  - cardIcon
  - language
  - limitPerColumn
seBenefit: Montrez en un coup d'oeil le cycle de vie des visites terrain d'un compte et faites-le avancer d'un simple glisser-deposer, sans code.
releaseStatus: GA
status: active
screenshots: []
---

# CCO FR - Visit Kanban (`seFrVisitKanban`)

Kanban des `Visit__c` de l'Account courant : 4 colonnes `Planned`, `In Progress`, `Completed`, `Cancelled` (libelles FR/EN).

## Target

- `lightning__RecordPage` sur `Account`

## Fonctionnement

- Lecture : `getRelatedListRecords` (related list `Visits__r`, tri `PlannedStartDateTime__c`).
- Ecriture : `updateRecord` (LDS) sur `VisitState__c`, mise a jour optimiste, toast succes/erreur.
- Carte : nom (V-xxxx), debut planifie, lieu tronque a 30 caracteres, badge d'etat.
- Plus de 5 cartes (`limitPerColumn`) : chevron Voir plus / Show more.
- Bouton Nouvelle visite : lance le Flow `CCO_FR_Start_Visit` via `c/seFrFlowModal`. Masque si le Flow n'est pas actif (verifie par `SE_FR_VisitKanbanController.flowExists`).

## Dependances

- Schema `seFrRetailExecSchema` (`Visit__c`, lookup `Account__c`, relationship `Visits`).
- `seFrFlowModal` (lib).

## Proprietes

| Propriete | Defaut |
|---|---|
| `language` | `fr` |
| `cardTitle` | Visites / Visits |
| `cardIcon` | `standard:kanban` |
| `limitPerColumn` | `5` |
| `startVisitFlowApiName` | `CCO_FR_Start_Visit` |
