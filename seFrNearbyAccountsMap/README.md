---
tagline: Interactive map of nearby accounts using the browser's geolocation with Haversine distance sort.
categories: [Geo & Field]
personas: [FieldSales]
chips:
  - Browser geolocation
  - Haversine distance sort
  - Custom pin styling
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Origin mode · auto geolocation / manual lat-lng
  - Max accounts displayed, RecordType filter
  - Highlight first account as priority
seBenefit: Browser geolocation prompt for a "wow" moment in field demos. Falls back to a fixed origin (Place de la Bastille) when permission is denied — never breaks the demo.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrNearbyAccountsMap

Interactive map showing nearby accounts from a configurable origin point. Uses the standard `lightning-map` with custom pin styling. By default, the component **uses the browser's geolocation** so the map centers on wherever the SE currently is, and silently falls back to a configurable lat/lng if the browser denies the permission or is on HTTP.

## Where to drop it
- **Target:** Lightning Home Page / App Page
- **App Builder label:** `SE FR - Nearby Accounts Map`

## Apex dependency
- `SE_FR_NearbyAccountsController.getNearbyAccounts(limitCount, recordTypeName)` — located in `_shared_apex/`.
- Behavior: first tries accounts owned by the running user; if that set is empty, falls back to accounts of any owner so the component still shows data on a fresh demo org.

## Origin — auto vs manual

| `originMode` | Behavior |
|---|---|
| `auto` (default) | Calls `navigator.geolocation.getCurrentPosition()` in `connectedCallback`. Browser prompts the user once per origin. Cached position up to 5 min old is reused. **Requires HTTPS** (Salesforce is HTTPS). On denial / timeout / unsupported browser, falls back silently to `originLatitude` / `originLongitude`. |
| `manual` | Always uses the provided `originLatitude` / `originLongitude`. |

This means the default deployment works out of the box for any SE: the first time they open the page, they approve the browser prompt, and the map centers on them.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Nearby Accounts` | |
| `listSubtitle` | String | `Accounts and prospects nearby` | Shown in the map's list view. |
| `limitCount` | Integer | `10` | Max accounts queried from Apex. |
| `recordTypeName` | String | — | Optional. RecordType `DeveloperName` on Account (leave empty for all). |
| `originMode` | String | `auto` | `auto` (browser geolocation, fallback to lat/lng) or `manual`. |
| `originLatitude` | String | `48.859215` | Fallback / manual latitude (decimal degrees). Defaults to central Paris (11e). |
| `originLongitude` | String | `2.379175` | Fallback / manual longitude. |
| `originLabel` | String | `My location` | Title of the origin marker. |
| `priorityFirstMarker` | Boolean | `false` | If true, the first account pin is shown in red. |
| `zoomLevel` | Integer | `13` | Initial map zoom. |

## Install
1. Deploy `_shared_apex/classes/SE_FR_NearbyAccountsController.cls` first (if not already present in the org).
2. Unzip `seFrNearbyAccountsMap.zip`, deploy the LWC bundle.
3. Drop `SE FR - Nearby Accounts Map` on a Home or App page.
4. First load: accept the browser geolocation prompt. The map re-centers on you. If you prefer a fixed origin, set `originMode = 'manual'` and tune the lat/lng.

## Data enrichment prerequisites
- The Apex query returns Accounts where `BillingStreet != null`. Accounts without a billing address are invisible on the map.
- **Geocoding precedence**: the component prefers `BillingLatitude` / `BillingLongitude` (set by Salesforce's data.com geocoding service or manually) and falls back to `Street + City + PostalCode + Country` only when lat/lng are missing. On a fresh SDO without data.com geocoding, server-side geocoding via Bing Maps is slow and can silently fail — **pre-seeding `BillingLatitude` / `BillingLongitude` on the target Accounts is the most reliable way to guarantee pins appear**.
- For a Paris-based demo, point the Accounts at Paris addresses and set `BillingLatitude` / `BillingLongitude` in the 48.85 / 2.37 neighbourhood. The `SE_FR_SDO` org has 12 Accounts pre-seeded in the 11th arrondissement — use those to validate.
- The distance label under each pin title is computed client-side via haversine from the origin point, so it's only accurate when lat/lng are present.
