---
tagline: Compact record-page toolbar for Account, Contact, Lead, Opportunity and Case — one primary button (Screen Flow or standard New Task / Event / Case / Opportunity form) + an inline Einstein AI summary.
categories: [Transverse]
personas: [Sales, FieldSales, Telesales, Service]
chips:
  - Primary action = Screen Flow OR standard New record form
  - Prefilled fields with {recordId} token
  - Inline Einstein summary
  - Markdown rendering
  - Bilingual FR/EN
dataMode: hybrid
requiresEinstein: optional
mobileReady: true
originalAuthor: Lionel Braun
originalAuthorEmail: null
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-10-15
keyProps:
  - Primary action launches any Screen Flow (passes recordId as input)
  - Ships with a default Flow `CCO_FR_Start_Visit` — creates a standard Event, zero managed-package dep
  - Einstein prompt summary — defaults to `einstein_gpt__summarizeAccountDefault` with `Input:Account`
  - Auto-detects HTML vs markdown Einstein output
  - Rework prompt input to work on Contact / Opportunity / Case / Lead
  - Markdown mini-parser (headers, lists, bold / italic, inline code)
  - SLDS-themed buttons (`lightning-button variant="brand"`) — picks up the theme accent
  - Standard SLDS icons (`standard:task`, `utility:*`)
seBenefit: Drop on any record page and get both a one-click AI summary (soft-fails if Einstein is off) and a configurable primary action that launches your own Screen Flow — no custom code to glue a Flow button to the record context.
featured: false
featuredRank: null
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Record Actions

**Formerly:** `seFrAccountActions` (renamed when the component became multi-object).
**Original source:** DBI retail-execution demo (`dimAccountActions`, 2026-07)
**Ported to library by:** Lionel Braun
**Library-integrated:** 2026-10-15

Compact toolbar for a record page. Two features in one card:

1. **Primary action button** — launches a Screen Flow (configurable `primaryActionFlowApiName`). The current record Id is passed as the `recordId` input variable. The Flow runs inside a modal; closes on `FINISHED` / `FINISHED_SCREEN` / `ERROR`.
2. **Einstein AI summary** — invokes an Einstein Prompt Template via `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate`. Default template is `einstein_gpt__summarizeAccountDefault` with the current record passed as `Input:Account`. Response rendered client-side with an inline markdown-to-HTML parser (headers, bullet / numbered lists, bold, italic, inline code).

## Why SEs love it

- **Zero schema setup** — works on a stock Account page immediately. Point `primaryActionFlowApiName` at any Screen Flow you already have, and the summary is useful without any custom fields.
- **Flow-driven primary action** — covers the "Start a visit", "Open a case", "Create an order" use case patterns without hardcoding any sObject. Point it at a `Start_Visit_From_Account` Flow and you get the DBI demo UX for free.
- **Soft-fails on Einstein** — if the prompt template isn't deployed or Einstein is off, the component toasts a warning but keeps rendering. The primary action keeps working.
- **Bilingual (default FR)** — labels, loading states, toasts all switch via `language = 'fr' | 'en'`.
- **Mobile-ready** — compact layout and touch-friendly buttons.

## Key configuration

| Property | Default | Notes |
|---|---|---|
| `language` | `fr` | `fr` or `en`. |
| `cardTitle` | — | Dictionary default: `Actions rapides` / `Quick actions`. |
| `accentColor` | — | Optional CSS color for the icon badge + primary button. |
| `disablePrimaryAction` | `false` | Hide the primary button entirely. |
| `primaryActionLabel` | — | Dict default: `Démarrer une visite` / `Start visit`. |
| `primaryActionIcon` | `utility:routing_offline` | SLDS icon name. |
| `primaryActionType` | `flow` | `flow` launches the Screen Flow; `newRecord` opens the standard New form of `newRecordObjectApiName` (Task, Event, Case, Opportunity…) — same targets as the standard quick actions of the org (NewTask, NewEvent, NewCase, NewOpportunity, NewContact, NewLead, NewNote, LogACall, SendEmail). |
| `newRecordObjectApiName` | — | Object created in `newRecord` mode. |
| `newRecordDefaults` | — | `Field=Value` pairs separated by `\|`; tokens `{recordId}`, `{objectApiName}`. Example on a Contact: `WhoId={recordId}\|Subject=Rendez-vous`. |
| `primaryActionFlowApiName` | `CCO_FR_Start_Visit` | Screen Flow API name launched on click. **Default Flow shipped with the component** — creates a standard `Event` rattaché au record courant (zero managed-package dep). Clone and point at your own Flow to override. |
| `disableAiSummary` | `false` | Hide the AI summary button + output area. |
| `aiSummaryLabel` | — | Dict default: `Résumé IA` / `AI summary`. |
| `promptTemplateApiName` | `einstein_gpt__summarizeAccountDefault` | Prompt template DeveloperName. |
| `promptInputApiName` | `Input:Account` | Change to `Input:Contact` / `Input:Opportunity` when placed on other objects. |
| `autoRunOnLoad` | `false` | When ON, runs the prompt automatically on mount. |

## Apex

- `SE_FR_AccountActionsController.getPromptSummary(Id, String, String)` — thin wrapper on top of `ConnectApi.EinsteinLLM`. No Named Credential needed.

> **Which mode for which object?** The shipped Flow `CCO_FR_Start_Visit` creates a retail visit on an **Account** (B2B visit context). On Contact / Lead / Opportunity / Case, use `primaryActionType = newRecord` (e.g. Event with `WhoId={recordId}`, Task with `WhatId={recordId}`).

## Shipped Flow

**`CCO_FR_Start_Visit.flow-meta.xml`** — Screen Flow lancé par défaut par le bouton primaire.

- Crée un `Event` standard rattaché au record courant via `WhatId` (fonctionne sur Account / Opportunity / Case / Lead).
- Champs saisis : Objet, Date/heure de début, Date/heure de fin, Lieu, Notes.
- Zéro dépendance au managed package Retail Execution / Field Service — utilise l'`Event` standard, universel.
- Variable input : `recordId` (String).
- Variable output : `newEventId` (String — Id de l'Event créé).
- Admin peut cloner et pointer `primaryActionFlowApiName` sur son propre Screen Flow pour créer un `Visit` custom, un `Case`, ou tout autre sObject.

Pattern conforme à la règle de compliance 10.14 ("Component ships with a default Flow"), voir `_build/LIB_COMPLIANCE_SPECS.md`.

## Lineage / library-compliance notes

Port of `dimAccountActions` (DBI retail-execution demo, 2026-07). Changes applied to make it lib-compliant (see `_build/LIB_COMPLIANCE_SPECS.md`):

- All DIM / client references stripped (CSS variables renamed `--dim-*` → `--sefraa-*`, custom palette removed in favor of `accentColor` override).
- Hardcoded `Visit` sObject creation replaced by a configurable Flow launch (compliance rule 10.9 — Visit requires Field Service / Retail Execution managed package, so we don't ship with a hard dependency). Default Flow `CCO_FR_Start_Visit` shipped with the component creates a standard `Event` instead (compliance rule 10.14).
- Apex pivoted from HTTP callout to `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate` (same pattern as `seFrContactCard`). No Named Credential setup required.
- Full FR/EN i18n via internal `LABELS` dictionary + `t()` getter.
- Markdown mini-parser kept inline — flagged as a candidate for a shared `seFrMarkdown` util when a 3rd component needs it.
