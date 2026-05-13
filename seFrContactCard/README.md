---
tagline: Visual contact card with animated waves, avatar, address, configurable gauges and optional Einstein prompt summary.
categories: [Account 360°, Agentforce & AI]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - Wow-effect animated waves
  - Optional Einstein summary
  - Up to 3 gauges
  - Inline avatar upload
dataMode: hybrid
mobileReady: true
originalAuthor: Charly Ansel
originalAuthorEmail: REDACTED
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-05-05
keyProps:
  - Up to 3 gauges (label, field, icon, lower/higher-better semantics)
  - Image · URL field OR click-to-upload File
  - Customer ID line (toggle + field)
  - Animated wave colors / theme accent
  - Einstein prompt summary · default `einstein_gpt__summarizeContact` (the SDO-shipped template, not a true Salesforce standard)
seBenefit: Built-in "Summarize" button using the SDO-shipped contact-summary prompt — drop on a Contact / Case / Account page and you get an AI inline summary out of the box. Click the avatar to upload a contact photo (no schema work required).
featured: true
featuredRank: 0
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Contact Card

**Original author:** Charly Ansel <REDACTED>
**Maintained in library by:** Lionel Braun
**Genericized / library-integrated:** 2026-05-05

Visual contact card with an animated-waves background, avatar, name / email / phone, mailing address and up to 3 configurable gauges. Auto-resolves the Contact Id from the current record page (Contact → self, Account → Person/primary Contact, Case/Opportunity/Order → `ContactId`, Lead / custom objects → `Contact__c`).

## Why SEs love it

- **Portrait-style card** — signature animated waves background (toggleable) makes the card stand out on a record page.
- **Works out-of-box** — schema-safe Apex: every optional field (image URL, customer ID, gauges) is skipped silently if absent.
- **Same upload pattern as Record Highlights** — `imageMode=file` stores the avatar as a standard File on the Contact, click to replace. No custom schema required.
- **Up to 3 gauges** configurable at will (label + field API name + icon).
- **Optional Einstein prompt summary** — off by default; when enabled, a "Summarize" button runs a chosen Prompt Template inline.

## Properties (highlights)

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `fr` or `en`. |
| `cardTitle` | "Contact" | Override only if needed. |
| `imageMode` | `field` | `field` (URL in a field on Contact) or `file` (click to upload, same logic as Record Highlights). |
| `imageFieldApiName` | `SDO_Cust360_Contact_Picture_URL__c` | Image URL field when `imageMode=field`. Schema-safe. |
| `showCustomerId` / `customerIdFieldApiName` | false / `SDO_Cust360_Id__c` | Extra "ID" line. |
| `gauge1Label` / `gauge1FieldApiName` / `gauge1Icon` | `Churn risk` / `SDO_Cust360_ChurnRisk__c` / `utility:warning` | Primary gauge. |
| `gauge2*` / `gauge3*` | *(empty)* | Up to 2 additional gauges, all optional. |
| `showWaves` | false | Animated wave shapes in the background. |
| `isDarkBackground` / `backgroundColor` / `backgroundImageUrl` | false / — / — | Look & feel. |
| `waveColorOne` / `waveColorTwo` | greys | Colors of the two waves. |
| `enablePromptSummary` | false | Turn on to show a "Summarize" button. |
| `promptTemplateApiName` / `promptInputApiName` / `autoPromptOnLoad` | — / `Input:Contact` / false | Einstein Prompt Template settings when the summary is enabled. |

## Data enrichment prerequisites

- Out-of-box works on any Contact with the standard fields (FirstName, LastName, Email, Phone, MailingAddress).
- For the image to show via `imageMode=field`, the Contact must have the SDO Cust360 picture field populated (SDO-specific) OR the SE can switch to `imageMode=file` and upload an image manually.
- For the churn gauge to show, the Contact must have a value in `SDO_Cust360_ChurnRisk__c` (0-100). Otherwise the gauge is silently hidden.
- The Einstein prompt summary requires an existing Prompt Template in the org with the right input name.

## Apex dependencies

- `SE_FR_ContactCardController` — Contact Id resolver, schema-safe Contact fetch, Einstein prompt wrapper.
- `SE_FR_RecordHighlightsController` — shared with Record Highlights for the File-based image pattern (only used when `imageMode=file`).

## Credit

The original design (animated waves, avatar layout, gauge + Einstein prompt) comes from Charly Ansel's `canContactCard` bundle. This library version is a genericized, bilingual, schema-safe rewrite that merges the parent/child pair into a single component and aligns naming + conventions with the SE_FR library. The prompt logic is preserved but gated off by default.
