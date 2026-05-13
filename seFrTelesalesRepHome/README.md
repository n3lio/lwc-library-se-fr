---
tagline: Telesales rep home page with KPIs, live cases and orders tables, calls to make and 3 mini charts.
categories: [Dashboards & KPIs]
personas: [Telesales]
chips:
  - Live cases & orders
  - Calls-to-make queue
  - 3 mini analytical charts
dataMode: hybrid
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Number of calls shown
  - KPI tiles
  - Quick action links
seBenefit: One template for Inside Sales Home — pre-composed, no need to wire 5 components manually in App Builder.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrTelesalesRepHome (Telesales — Rep Home)

**B2B** — Home / App page for a **telesales / inside-sales rep**. Greeting, 4 KPI tiles, **live cases table**, **live orders table**, calls to make (mock), 3 mini charts (channel / subject / monthly closed), training & news cards.

> **Tasks panel** lives in the dedicated sidebar component `seFrMyTasks` — drop it on the right column of the page to get the task list.

## Where to drop it
- **Target:** Lightning Home Page, App Page (**not Record**)
- **App Builder label:** `CCO FR - Telesales — Rep Home`

## Apex dependency
`SE_FR_TelesalesController` (bundled in `classes/`):
- `getIncomingCases(statusesCsv, ownerScope, limitCount)` — open Case records.
- `getOrdersToValidate(statusesCsv, ownerScope, limitCount)` — Order records by status.

Everything else on this dashboard (calls, news, mini-charts) stays mock JSON configurable via App Builder because there is no standard source of truth.

## Dynamic data filters (App Builder)
| Property | Default | Notes |
|---|---|---|
| `caseStatusesCsv` | `New,Working,Waiting on Customer,Escalated` | Any Case.Status value on your org. |
| `caseOwnerScope` | `all` | `'mine'` filters on the running user — use `'all'` in a fresh SDO where demo cases aren't owned by the running user. |
| `caseLimit` | 6 | Up to 50. |
| `caseListView` | `Recent` | Used by the "View all" button. |
| `orderStatusesCsv` | `Draft` | Default matches "orders to validate". |
| `orderOwnerScope` | `all` | |
| `orderLimit` | 6 | |
| `orderListView` | `Recent` | |

Columns on both datatables are now real Salesforce data: case/order number linked to the record, account linked to its record, date, channel (Case.Origin / Order.SalesChannel.SalesChannelName), status, amount for orders.

## Styling
Shares the SE_FR palette declared at the top of the CSS (SLDS-aligned brand/success/warning/error colors). KPI tiles, bar charts and news cards all use the same palette.

## Origin
Renamed from `seFrTelesalesDashboard` (v2.3 → v2.4). The old bundle is kept in the library as deprecated.
