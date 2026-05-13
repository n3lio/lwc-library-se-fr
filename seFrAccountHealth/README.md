---
tagline: Quantitative account health score (0-100) with verdict level and weighted positive / negative signals.
categories: [Account 360°]
personas: [Sales]
chips:
  - SVG donut gauge
  - Weighted +/- signals
  - Drill-down explainability
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Score field, signal fields (CSV)
  - Color thresholds
  - Card title override
seBenefit: Reads Cust360 SDO standard fields by default (e.g. churn risk, sentiment, NPS). On orgs without those fields, falls back to mocked signals — never crashes, always demo-ready.
featured: true
featuredRank: 7
releaseStatus: stable
status: active
screenshots: []
---

# seFrAccountHealth (Account Account Health)

**B2B** — SVG donut gauge (0-100) + verdict level (Excellent / Healthy / Watch / At risk / Critical) + list of positive / negative signals used in the computation. Complementary to `seFrAccountWeather` (qualitative verdict) — this one is quantitative. Bilingual EN / FR.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account
- **App Builder label:** `CCO FR - Account Health`

## Apex dependency
`SE_FR_AccountHealthController.getSnapshot(accountId)`. Schema-safe on optional custom fields (`NPS__c`, `SDO_MAPS_Days_Since_Last_Visit__c`).

## Scoring logic
Starts at 50 (neutral). Each signal adds / subtracts weighted points:
- Revenue ≥ threshold → +10 ; below → −5
- Recent activity → +10 ; stale → −10
- Recent visit → +5 ; stale → −5
- Open Opportunities → +10 per signal
- Open Cases (≥3) → −15 ; any open → −5
- Recent Orders (90d) → +10 ; none → −5
- NPS ≥ 9 → +10 ; ≤ 6 → −10
- ≥3 Contacts mapped → +3

Clamped to [0, 100]. Level thresholds: ≥85 Excellent, ≥65 Healthy, ≥45 Watch, ≥25 At risk, <25 Critical.

## Properties
| Name | Default | Description |
|---|---|---|
| `language` | `en` | `en` or `fr`. |
| `cardTitle` | — | Override the default ("Account Health" / "Santé du compte"). |
| `revenueThreshold` | 500000 | AnnualRevenue below this is a negative signal. |
| `inactivityThresholdDays` | 45 | |
| `staleVisitThresholdDays` | 60 | Uses `SDO_MAPS_Days_Since_Last_Visit__c` — skipped if absent. |

## Install
1. Deploy `classes/SE_FR_AccountHealthController.cls`.
2. Unzip `seFrAccountHealth.zip`, deploy the LWC bundle.
3. Drop `CCO FR - Account Health` on an Account record page.

## Data enrichment prerequisites
The score is only as rich as the data. On a fresh SDO, many Accounts will score 50 (neutral — no signal fires). To get a varied demo:
- Set **`AnnualRevenue`** on the showcase Account (above or below the threshold depending on the story).
- Ensure **`LastActivityDate`** is recent. This field is derived from Tasks / Events — create at least one recent Task if needed.
- Have **at least 1 open Opportunity** and **1 recent Order (≤90 days)**.
- Optional: if `NPS__c` exists on the org, populate it with 9+ or ≤6 to trigger the NPS signal.
