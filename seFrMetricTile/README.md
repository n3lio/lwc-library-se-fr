---
tagline: Single-metric tile with 4 chart styles (line / area / bar / mini-donut), comparison series, target line and currency formatting.
categories: [Dashboards & KPIs, Marketing & Data]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - 4 chart styles
  - Forecast-vs-actual dashed
  - Target line + goal donut
  - Pure SVG ~3 KB
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - "`chartStyle` · line / area / bar / mini-donut"
  - "`seriesJson`, `secondarySeriesJson` (forecast vs actual)"
  - "`targetValue` + dashed target line + chip"
  - "`currentValue` + `currencyCode` · auto Intl format"
  - "`scalingMode` · auto / from-zero / fixed"
seBenefit: Compact tile, dashboard-ready — set `hideCardTitle = true` to stack 4 tiles in a row aligned. Mini-donut variant is the striking "85% to target" demo moment without configuring a real Performance Goal.
featured: false
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Metric Tile (`seFrMetricTile`)

Single-metric tile with a configurable inline trend chart. **4 chart styles** (line / area / bar / mini-donut), optional **comparison series**, **target line**, and **currency formatting** via `Intl.NumberFormat`.

Designed to stack horizontally on a Home Page or App Page (3-4 tiles per row), or to sit standalone on a Record Page sidebar.

## Targets

- `lightning__HomePage`
- `lightning__AppPage`
- `lightning__RecordPage`

## The 4 chart styles

| `chartStyle` | Visual | Use case |
|---|---|---|
| `line` (default) | Smooth line + last-point dot | Trend curve, no surface emphasis |
| `area` | Same as line + filled area below | Volume / surface emphasis |
| `bar` | Vertical bars with rounded tops | Discrete monthly values |
| `mini-donut` | Radial gauge filling currentValue / targetValue | Goal completion / quota / health % |

## Quick start

Drop on a Home Page, no config — you get a sample 12-month revenue curve with a green `+14,2%` trend badge.

For a real metric:

```
metricLabel        = "Pipeline"
currentValue       = 1250000
currencyCode       = "EUR"
seriesJson         = [820000, 880000, 950000, 1020000, 1080000, 1130000, 1180000, 1250000]
chartStyle         = "area"
trendDisplay       = "+12,8%"
```

For a goal-completion donut:

```
metricLabel        = "Quarterly target"
currentValue       = 850000
targetValue        = 1000000
currencyCode       = "EUR"
chartStyle         = "mini-donut"
showTargetLabel    = true
```

For a forecast vs. actual line:

```
seriesJson           = [...actual]
secondarySeriesJson  = [...forecast]
secondarySeriesColor = "#747474"
chartStyle           = "line"
```

## Properties

### Headline

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `fr` / `en` |
| `cardTitle` | – | Override |
| `cardIcon` | `standard:metrics` | SLDS icon |
| `hideCardTitle` | `false` | Render bare tile (no card chrome) — useful when stacking |
| `metricLabel` | dictionary default | Small label above the headline |
| `currentValueDisplay` | – | Manual text override (wins over numeric) |
| `currentValue` | – | Numeric value, auto-formatted via `Intl.NumberFormat` |
| `currencyCode` | `EUR` | ISO 4217 |

### Chart

| Property | Default | Description |
|---|---|---|
| `chartStyle` | `line` | `line` / `area` / `bar` / `mini-donut` |
| `seriesJson` | sample 12-month curve | JSON array of numbers |
| `secondarySeriesJson` | – | Optional comparison series (dashed line) |
| `secondarySeriesColor` | `#747474` | Secondary series color |
| `targetValue` | – | Horizontal target line on line/area/bar; denominator on mini-donut |
| `targetLineColor` | `#FE9339` | Target line color |
| `showTargetLabel` | `false` | Show "Target XX €" chip next to the metric label |

### Y-axis scaling

| Property | Default | Description |
|---|---|---|
| `scalingMode` | `auto` | `auto` (data min/max) / `from-zero` / `fixed` |
| `yMin` | – | Used when `scalingMode = fixed` |
| `yMax` | – | Used when `scalingMode = fixed` |

### Visual

| Property | Default | Description |
|---|---|---|
| `accentColor` | `#0176d3` | Primary chart color |
| `donutTrack` | `#E5E5E5` | Mini-donut background ring |
| `height` | `70` | Chart inner height (px) |
| `width` | `0` (auto) | Override viewBox width |
| `trendDisplay` | `+14,2%` | Sign drives badge color |

## SE benefits

- **No Apex required** — pure props-driven, configured entirely in App Builder.
- **Compact + dense-dashboard ready** — set `hideCardTitle = true` and stack 4 tiles in a row of a Home Page, all aligned.
- **AI/forecast demos** — a secondary dashed line is the simplest way to overlay "actuals vs. forecast" without building a real chart component.
- **Goal-completion mini-donut** — visually striking for "we're 85% to target" demo moments without needing a real Performance Goal in the org.

## Design rationale

Pure SVG, no chart library — keeps the bundle ~3 KB and avoids Locker / CSP issues. All animations are CSS-driven (path-fade, bar-grow, donut stroke-dashoffset transition).
