---
tagline: 3-year revenue mini-dashboard with KPI tiles and a side-by-side monthly bar chart.
categories: [Account 360°, Dashboards & KPIs]
personas: [Sales, FieldSales, Telesales]
chips:
  - 3 years side-by-side
  - 3 KPI tiles
  - Currency & scale options
dataMode: mock
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Months back, comparison year
  - Bucket source field, currency code
seBenefit: Built-in YoY overlay — gives the "story" of growth or decline visually, without configuring a real Salesforce dashboard.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrRevenueDashboard

3-year revenue mini-dashboard with 3 KPI tiles and a monthly bar chart comparing three years side by side. Fully configurable — you can change labels, years, max scale, and provide a custom monthly dataset via JSON.

## Where to drop it
- **Target:** Lightning Record Page
- **Object:** Account
- **App Builder label:** `SE_FR — Revenue Dashboard`

## Apex dependencies
None.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Delivered Revenue (3 years)` | |
| `cardIcon` | String | `standard:performance` | |
| `currencyCode` | String | `USD` | |
| `localeTag` | String | `en-US` | |
| `year1Label` / `year2Label` / `year3Label` | String × 3 | `2024` / `2025` / `2026` | Chart legend + bar tooltips. |
| `kpi1Label` / `Value` | String / Integer | `YTD Revenue` / `38550` | Currency-formatted. |
| `kpi2Label` / `Value` | String / String | `YoY Trend` / `+14.2%` | Raw text. |
| `kpi3Label` / `Value` | String / Integer | `Previous Year Total` / `114200` | Currency-formatted. |
| `chartMaxScale` | Integer | `15000` | Y-axis maximum. Y-axis labels are auto-computed at 1/3 intervals. |
| `chartDataJson` | String (rich) | 12-month sample | JSON array `[{"month":"Jan","y1":8200,"y2":8900,"y3":9500}, …]`. |

## Install
1. Unzip `seFrRevenueDashboard.zip`, deploy the LWC bundle.
2. Drop `SE_FR — Revenue Dashboard` on an Account record page.
3. Replace `chartDataJson` with your dataset.

## Data enrichment prerequisites
The component is **purely driven by the `chartDataJson` property** — it does **not** query Orders or Opportunities automatically. Two paths:
- **Demo mode (recommended for pitches)**: leave the default sample data, or override `chartDataJson` in App Builder with a hand-crafted narrative (e.g. show a growth curve that matches the customer story you're telling).
- **Data-backed mode**: populate `chartDataJson` from real org data via an Apex invocable or a pre-processing Flow. Requires the SE to write the bridging logic.

If you want an automatic "derived from real Orders" variant, pair this component with `seFrMetricTile` instead, which can be fed from an Apex wire. `seFrRevenueDashboard` stays intentionally static for demo flexibility.
