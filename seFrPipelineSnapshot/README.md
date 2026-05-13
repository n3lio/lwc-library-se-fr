---
tagline: Account-level pipeline visualization with summary tiles and one column per Opportunity stage.
categories: [Account 360°]
personas: [Sales]
chips:
  - Column per stage
  - Weighted total tile
  - Auto-derives from Opp
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Max opportunities, status filter
  - Show / hide total
  - Currency display
seBenefit: "Sidebar-friendly width — fits the narrow right column without breaking. No setup needed: reads any open Opportunity on the Account."
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrPipelineSnapshot (Pipeline Snapshot)

**B2B** — Account-level pipeline visualisation. Three summary tiles at the top (total pipeline, weighted total, opportunity count) and one column per `Opportunity.StageName` with the list of deals in each stage. Bilingual EN / FR.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account, Opportunity (on Opportunity, resolves the parent AccountId)
- **App Builder label:** `CCO FR - Pipeline Snapshot`

## Apex dependency
`SE_FR_PipelineSnapshotController.getPipeline(recordId, objectApiName, limitCount, includeClosed)`.

## Properties
| Name | Default | Description |
|---|---|---|
| `language` | `en` | `en` or `fr`. Translates the tile labels and the Stage column names (Prospecting → Prospection, etc.). |
| `cardTitle` | — | Override the default ("Pipeline Snapshot" / "Aperçu du pipeline"). |
| `currencyCode` | `USD` | |
| `localeTag` | `en-US` | |
| `limitCount` | 40 | 1–200. |
| `includeClosed` | `false` | Include Closed Won / Closed Lost columns. |
| `hideNewOppButton` | `false` | |

## Install
1. Deploy `classes/SE_FR_PipelineSnapshotController.cls`.
2. Unzip `seFrPipelineSnapshot.zip`, deploy the LWC bundle.
3. Drop `CCO FR - Pipeline Snapshot` on an Account or Opportunity record page.

## Data enrichment prerequisites
The component is most impactful on an Account that owns **several Opportunities at different stages**. A fresh SDO often has:
- few Opps on a typical Account, or
- all Opps on the same Stage ("Closed Won" by default on Omega Inc., for example).

