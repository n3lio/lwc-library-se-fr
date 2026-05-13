---
tagline: Compact panel showing the marketing / Data Cloud segments the record belongs to, as colored badges.
categories: [Marketing & Data]
personas: [Marketing]
chips:
  - Segment count in title
  - Color-coded badges
  - Record / App / Home page
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Up to 6 segment slots (label, audience size, last-updated)
seBenefit: Sets a marketing-aware tone on a Contact page without requiring a Data Cloud connection — props-driven storytelling.
featured: true
featuredRank: 3
releaseStatus: stable
status: active
screenshots: []
---

# seFrActiveSegments (Active Segments)

Displays a short, configurable list of marketing / Data Cloud segments as badges inside a `lightning-card`. The card title automatically shows the segment count: `Active Segments (4)`.

## Where to drop it
- **Targets:** Lightning Record Page, App Page, Home Page
- **App Builder label:** `CCO FR - Active Segments`

## Apex dependencies
None.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Active Segments` | Title prefix — shown as `<title> (N)`. |
| `cardIcon` | String | `standard:groups` | SLDS icon identifier for the card header. |
| `segmentsCsv` | String | `Back-to-School Parents, Sport Sun-wear Affinity, Progressive Lens Switchers, Web-to-Store Frequent` | Comma-separated segment names. Each becomes a badge. |

## Install
1. Unzip `seFrActiveSegments.zip`, deploy the LWC bundle.
2. Drop `CCO FR - Active Segments` on any page and set `segmentsCsv` to the customer's segments.

## Origin
Genericized from the `krysActiveSegments` Krys demo component.
