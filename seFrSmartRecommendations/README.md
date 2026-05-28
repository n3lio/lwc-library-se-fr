---
tagline: Context-aware Next Best Action panel with 1-6 recommendations, relevance score and per-card overrides.
categories: [Productivity]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - Context-aware per object
  - Relevance score badge
  - Inline title & reason override
dataMode: mock
requiresEinstein: optional
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Recommendations CSV (label + reason + icon)
  - Einstein prompt template (optional)
seBenefit: Default narratives are tuned for SDO-style sales scenarios. Plug an Einstein prompt template to flip the same UI into a real AI demo without rewiring the layout.
featured: true
featuredRank: 6
releaseStatus: stable
status: active
screenshots: []
---

# seFrSmartRecommendations

Context-aware "Next Best Action" panel that shows 1–6 recommendations depending on the object type the record page is on. Each recommendation has a title, a reason, a fake relevance score, and an action button. Admins can override any recommendation's title and reason via properties.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account, Contact, Case, Order
- **App Builder label:** `SE_FR — Smart Recommendations`

## Apex dependencies
None.

## Display modes

- **Global** *(default)*: shows the first 2 recommendations for the current object type.
- **Targeted**: shows only the recommendations configured for a specific record ID. You can configure up to 3 target records, each with a comma-separated list of recommendation indices (e.g. `1,3,4`).

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Smart Recommendations` | |
| `displayMode` | String (picklist) | `Global` | `Global` or `Targeted`. |
| `targetId1..3` | String × 3 | — | Record Id that activates the matching `targetRecos*` list. |
| `targetRecos1..3` | String × 3 | — | Comma-separated indices `1..6` to show on that record. |
| `customTitle1..6` / `customDesc1..6` | String × 12 | — | Override default title / description per recommendation. Leave empty to use the built-in text for the current object type. |

## Install
1. Unzip `seFrSmartRecommendations.zip`, deploy the LWC bundle.
2. Drop `SE_FR — Smart Recommendations` on an Account / Contact / Case / Order record page.
3. Optionally override titles / descriptions to fit the customer context.
