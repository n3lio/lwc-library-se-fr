---
tagline: Résumé IA (Agentforce / Einstein) d'une visite terrain — synthèse, points clés et actions recommandées.
categories: [Retail Execution]
personas: [FieldSales, Retail]
chips: [Visit, Agentforce, Summary, Debrief]
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
originalAuthorEmail: lionel.braun@salesforce.com
maintainedBy: SE FR team
libraryIntegrationDate: 2026-11-05
keyProps:
  - language
  - cardTitle
  - cardIcon
  - promptTemplateName
seBenefit: Transforme les données captées pendant la visite (linéaire, ruptures, commande, notes) en compte-rendu structuré prêt à partager, avec un fallback déterministe si aucun Prompt Template n'est configuré.
releaseStatus: beta
status: active
screenshots: []
---

# CCO FR — Visit Summary AI (`seFrVisitSummaryAI`)

Résumé **Agentforce / Einstein** d'une visite terrain, à poser sur la page record d'un **`Visit__c`** (sObject shipped par `seFrRetailExecSchema`). Zero managed package.

## Dépendance

- ⚠️ Requiert le bundle **`seFrRetailExecSchema`** déployé (sObject `Visit__c` + fields + permset `CCO_FR_Retail_Exec`).
- Si l'org utilise le managed package Retail Execution (sObject `Visit` standard), cloner ce composant et remplacer `Visit__c` → `Visit` dans le controller Apex + le target du `.js-meta.xml`.

## Ce que fait le composant

- Bouton "Générer le résumé" sur la page d'un `Visit__c`.
- Appelle un Prompt Template Einstein configuré par l'admin (optionnel), ou un **fallback déterministe** côté Apex (État + Account + durée + check-in/out + lieu + notes + propriétaire) si aucun template n'est fourni.
- Rendu structuré : Synthèse + Points clés + Actions recommandées.
- Bouton "Régénérer" + "Envoyer au manager" (stub UX — à câbler côté admin via un Flow / Task).

## Props App Builder

| Prop | Type | Default | Rôle |
|---|---|---|---|
| `language` | String | `fr` | `fr` ou `en`. |
| `promptTemplateApiName` | String | *(vide)* | DeveloperName d'un **Flex Prompt Template** qui prend un `Input:Visit__c` et retourne un JSON `{ summary, keyPoints[], actions[] }`. Vide → fallback côté Apex. |

## Prompt Template attendu

Si vous câblez un template, il doit :
- avoir un paramètre `Input:Visit__c` typé sObject Visit__c
- renvoyer **du JSON pur** avec ce schéma :

```json
{
  "summary": "Visite productive chez l'Acme, lifecycle avancé.",
  "keyPoints": ["Check-in à 09h12", "Objection prix levée", "3 produits commandés"],
  "actions": ["Envoyer la proposition sous 48h", "Planifier démo tech"]
}
```

Si le template renvoie du texte brut, le composant affiche le texte dans la section Synthèse (soft-fail avec un avertissement).

## Fichiers

```
seFrVisitSummaryAI/
├── README.md
├── classes/
│   ├── SE_FR_VisitSummaryController.cls          — ConnectApi wrapper + fallback summary on Visit__c
│   └── SE_FR_VisitSummaryController.cls-meta.xml
└── lwc/
    └── seFrVisitSummaryAI/
        ├── seFrVisitSummaryAI.html
        ├── seFrVisitSummaryAI.js
        ├── seFrVisitSummaryAI.css
        └── seFrVisitSummaryAI.js-meta.xml       — target Visit__c
```

## Compliance

- ✅ Depend uniquement de `Visit__c` shipped par la lib (via `seFrRetailExecSchema`)
- ✅ `isExposed=true`, 3 cibles (RecordPage/AppPage/HomePage)
- ✅ Bilingue FR/EN via `@api language`
- ✅ `WITH USER_MODE` dans la SOQL fallback (sécurité)
- ✅ Soft-fail si Einstein indisponible (toast warning + fallback)

## Origine

Portage libéré de `dimVisitSummaryAI` (archive `dbi-cg-demo-2026-10-21`). Toute la plomberie DIM-specific (localStorage `dim-visit-*`, Apex `DIM_VisitSummary`, structure KPI retail-spé) a été retirée au profit d'un contrat universel Visit__c-based.
