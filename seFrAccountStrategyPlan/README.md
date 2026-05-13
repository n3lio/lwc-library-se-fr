---
tagline: Narrative account plan with editable KPIs, target gauge, SWOT 2x2 and quarterly action plan.
categories: [Account 360°]
personas: [Sales]
chips:
  - Inline edit every block
  - Narrative SWOT 2x2
  - Quarterly action plan
dataMode: mock
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Section labels & default content
  - Owner avatar override
seBenefit: Inline editable from the page — no record write. Great visual for "strategic-account" demo moments, even on bare orgs.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrAccountStrategyPlan

Narrative account plan for the Account record page. Four blocks:
1. **Performance snapshot** — 4 KPI tiles + annual-target progress bar.
2. **Strategic positioning** — SWOT in a 2×2 grid (Strengths / Weaknesses / Opportunities / Threats), each card with bullets.
3. **Action plan** — rows with a quarter chip, action + owner, and a color-coded status pill.
4. **Strategic notes** — free text.

All values are **pre-filled from App Builder defaults** and **editable on the page** via the "Edit" button in the card header — SEs can tune the content live during a demo.

## Where to drop it
- **Target:** Lightning Record Page
- **Object:** Account
- **App Builder label:** `CCO FR - Account Strategy Plan`

## Apex dependencies
None.

## How editing works
- Click the pencil icon in the header → enters edit mode.
- All fields (KPIs/target values, SWOT bullets, action rows, notes) become editable inline.
- "Reset" restores the App Builder defaults. "Done editing" returns to the narrative view.
- The footer "Save plan" / "Submit to manager" fire toasts (demo-only; no persistence).

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` / `cardIcon` | String | `Account Strategy & Action Plan` / `standard:goals` | Card header. |
| `currencyCode` / `localeTag` | String / String | `USD` / `en-US` | Currency & locale for formatting. |
| `kpiPreviousYearLabel` / `Value` | String / Int | `Revenue (Y-1)` / `45000` | KPI 1 (primary — accent color). |
| `kpiRunRateLabel` / `Value` | String / Int | `Run rate` / `3800` | KPI 2 (rendered as `X / mo`). |
| `kpiPotentialLabel` / `Value` | String / Int | `Portfolio potential` / `80000` | KPI 3. |
| `kpiShareLabel` / `Value` | String / String | `Share of wallet` / `56%` | KPI 4 (raw text). |
| `annualTargetLabel` / `Default` | String / Int | `Annual target` / `55000` | Target for the progress bar. |
| `ytdRevenueLabel` / `Default` | String / Int | `YTD revenue` / `38000` | Current-year progress value. |
| `strengthsCsv` | String | see meta.xml | SWOT — Strengths bullets (comma- or newline-separated). |
| `weaknessesCsv` | String | see meta.xml | SWOT — Weaknesses bullets. |
| `opportunitiesCsv` | String | see meta.xml | SWOT — Opportunities bullets. |
| `threatsCsv` | String | see meta.xml | SWOT — Threats bullets. |
| `actionPlanCsv` | String | see meta.xml | Rows as `Quarter\|Action\|Owner\|Status`, comma-separated. Status: `Not started`, `In progress`, `On track`, `At risk`, `Done`. |
| `strategyNotesDefault` | String | see meta.xml | Strategic notes — default text. |

## Install
1. Unzip `seFrAccountStrategyPlan.zip`, deploy the LWC bundle.
2. Drop `CCO FR - Account Strategy Plan` on an Account record page.
3. Configure the defaults to match the account you're showing.

## Legacy
Props `logisticOptionsCsv`, `competitorOptionsCsv`, `riskOptionsCsv`, `leversOptionsCsv` are kept for backwards compatibility with v1 pages but are no longer used by the new UI.
