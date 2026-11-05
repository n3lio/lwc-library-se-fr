---
tagline: Lead "First Touch Capture" mock — drop notes, paste a transcript, get simulated AI meeting notes, then simulated follow-up Tasks and Events.
categories: [Sales]
personas: [Sales, FieldSales, Telesales]
chips:
  - Simulated file dropzone + transcript
  - Simulated AI meeting notes
  - Simulated Task / Event creation
  - Bilingual FR/EN
  - Zero schema, zero Apex
dataMode: mock
requiresEinstein: optional
mobileReady: true
originalAuthor: Yann Jourdain
originalAuthorEmail: null
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-10-23
keyProps:
  - "`language` · fr (default) or en"
  - "`cardTitle` · optional override · `cardIcon` · default `standard:lead_insights`"
  - "`mockTranscript` · optional initial transcript text"
  - "`simulatedDelayMs` · default 1500 (activity creation uses 2/3 of it)"
seBenefit: Shows the full "capture at the booth, AI writes the notes, follow-ups are created" story on any dev org in seconds, with no custom field, Apex class or Agentforce setup.
featured: false
featuredRank: null
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Lead First Touch (`seFrLeadFirstTouch`)

**Original source:** Yann Jourdain, `LeadFirstTouch` (`leadftFileUpload`)
**Ported to library by:** Lionel Braun
**Library-integrated:** 2026-10-23

## What it does

Two-column card for Lead pages (stacked on narrow screens):

- **Contexte humain** — a styled dropzone (click adds a fake file chip, nothing is uploaded) and a transcript textarea.
- **Assistant Agentforce** — "Générer les notes IA" waits `simulatedDelayMs` with a spinner, then renders canned markdown-style notes inline. "Créer les activités" stays disabled until notes exist, then after ~2/3 of the delay shows a toast and 3 fake Task/Event records that "would be created".

## Targets

`lightning__RecordPage` (object Lead), `lightning__AppPage`, `lightning__HomePage`.

## Properties

| Property | Default | Notes |
|---|---|---|
| `language` | `fr` | `fr` or `en`. |
| `cardTitle` | — | Default `First Touch Capture`. |
| `cardIcon` | `standard:lead_insights` | |
| `mockTranscript` | — | Pre-fills the transcript box. |
| `simulatedDelayMs` | `1500` | Fake AI latency. |

## Live mode wiring (not included)

This is a mock. To make it real, as in Yann's original:

1. Add Lead fields `First_Touch_Transcript__c` and `First_Touch_Notes__c`.
2. Apex `FirstTouchNotesGenerator.generateNotes(Id leadId)` (`@AuraEnabled`) calling a GenAI prompt template that turns the transcript into notes stored in `First_Touch_Notes__c`.
3. Apex `LeadActivityCreator.createActivitiesFromLWC(Id leadId)` (`@AuraEnabled`) calling a second prompt template that returns JSON, then inserting Tasks and Events.
4. Replace `lightning-file-upload` for the dropzone, `lightning-record-edit-form` for the transcript, and the two `setTimeout` handlers with the imperative Apex calls.

## Lineage notes

- Custom "agentforce-card" chrome replaced by `lightning-card` with SLDS classes; emojis replaced by `lightning-icon`.
- All strings moved to a FR/EN `LABELS` dictionary.
- Markdown is rendered by a tiny block parser into template elements (no `innerHTML`).
