---
tagline: Configurable grid of 3-6 clickable KPI tiles with icon, value, color and link, ready out of the box.
categories: [Dashboards & KPIs]
personas: [All]
chips:
  - 3 to 6 tiles
  - Color-invert hover
  - Internal & external links
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Up to 8 tiles (label, value, trend %, target URL)
  - Color accent per tile
  - Layout (grid / horizontal)
seBenefit: Most-tunable component in the library (40+ properties). Click-through targets let you stage navigation flows during a demo without writing a Flow or App Builder action.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrKpiLauncher (KPI Launcher)

Configurable grid of 3 to 6 clickable KPI tiles. Each tile accepts a label, value, sublabel, SLDS icon, color and link. Empty labels hide the tile — display anywhere from 3 to 6 tiles without code changes.

## Where to drop it
- **Target:** Lightning Home Page / App Page / Record Page
- **App Builder label:** `SE FR - KPI Launcher`

## Apex dependency
None (all values are static, driven by App Builder properties).

## Properties

Each of the 6 tiles exposes the same 6 properties. Leave `kpiNLabel` empty to hide the corresponding tile.

| Property suffix | Type | Description |
|---|---|---|
| `Label` | String | Main tile title. **Empty hides the tile.** |
| `Value` | String | Big number / percentage / text shown on the tile. |
| `Sublabel` | String | Small caption below the value. |
| `Icon` | String | SLDS icon reference, e.g. `standard:account`, `standard:event`, `utility:einstein`. See [SLDS Icons](https://www.lightningdesignsystem.com/icons/). |
| `Color` | String | Hex color driving the tile's accent + hover state. Defaults vary per tile. |
| `Link` | String | Destination on click. Accepts Lightning URLs (`/lightning/o/Lead/list?filterName=Recent`), nav items (`/lightning/n/maps__Maps`) or absolute URLs (`https://…`). |

Plus:
- `cardTitle` (String, optional) — when set, wraps the grid in a standard `lightning-card` matching every other SE_FR component's title style. Leave empty to render the raw grid (same look as before).
- `cardIcon` (String, default `standard:metrics`) — icon next to the card title when `cardTitle` is set.

## Tile behavior
- Tiles without a link stay visually clickable but do nothing on click.
- Tiles with `https://…` links open in a new tab; internal paths navigate via standard Lightning navigation.
- Hover effect inverts the color — background turns to the tile's `Color`, text turns white.
- Grid is responsive (`repeat(auto-fit, minmax(160px, 1fr))`) — tiles reflow on narrow containers.

## Install
1. Unzip `seFrKpiLauncher.zip`, deploy the LWC bundle.
2. Drop `SE FR - KPI Launcher` on a Home, App or Record page.
3. Configure each KPI in App Builder. Start by filling KPI 1–3; add KPI 4–6 if needed.
