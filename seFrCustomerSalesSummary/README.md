---
tagline: B2C-leaning sales summary with KPI tiles and breakdowns by Category, Brand and Store.
categories: [Account 360°]
personas: [Retail, Marketing]
chips:
  - 3 KPI + 3 breakdown charts
  - Category / Brand / Store
  - Person Account compatible
dataMode: mock
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Time window
  - Categories shown
seBenefit: Same component covers B2B and B2C scenarios — auto-detects Person Account vs. business Account and adapts the layout.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrCustomerSalesSummary (Customer Sales Summary)

**B2C-leaning** customer-level sales summary for a **Contact / Person Account / Account** record page. Three KPI tiles + three bar-chart columns (by **Category / Brand / Store**).

This complements `seFrRevenueDashboard` (which is B2B, Account-centric, 3-year revenue chart). Here the angle is *"what did this shopper buy and where"* — useful on retail demos with store networks and multi-brand portfolios.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Contact, Account (works with Person Account since Person Account pages use the Account record page)
- **App Builder label:** `SE FR - Customer Sales Summary`

## Apex dependency
None — demo data provided via App Builder properties.

## Properties
Same CSV-driven shape as before — see the meta.xml for the full list. Formats:
- `categoriesCsv` / `brandsCsv` — `label|percent|color`
- `storesCsv` — `label|visits|barWidthPercent|color`

## Origin
Renamed from `seFrRetailSalesDashboard` (v2.3 → v2.4). The old component is kept in the library as deprecated for backwards compat.
