---
tagline: Field Sales rep home page with greeting, KPIs, priority accounts, hot leads, product penetration and campaign calendar.
categories: [Dashboards & KPIs]
personas: [FieldSales]
chips:
  - Dynamic priority accounts
  - Hot leads table
  - Product-penetration bars
  - Campaign calendar
dataMode: hybrid
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Number of tasks / events shown
  - KPI tiles (label, value, target)
  - Quick action links
seBenefit: One Home page with all the field-sales context preloaded — no need to assemble 5 components on a custom App Page.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrFieldRepHome (Field Sales — Rep Home)

**B2B** — Home / App page for a **field sales rep**. Greeting, 4 KPI tiles, priority accounts (dynamic), hot leads (dynamic), product-penetration bars and campaign calendar.

## Where to drop it
- **Target:** Lightning Home Page, App Page (**not Record**)
- **App Builder label:** `SE FR - Field Sales — Rep Home`

## Apex dependency
`SE_FR_FieldSalesController` — now exposes full filter arguments:
- `getPriorityAccounts(recordTypeName, ownerScope, orderBy, limitCount)`
- `getMyLeads(rating, ownerScope, limitCount)`

## Filters (App Builder)
| Property | Default | Notes |
|---|---|---|
| `accountRecordType` | `SDO_Account_Simple` | Standard Salesforce SDO B2B record type. Leave empty for all types. |
| `accountOwnerScope` | `mine` | `'mine'` = running user's accounts; `'all'` = any owner. Use `'all'` on fresh demo orgs. |
| `accountOrderBy` | `Name` | Whitelisted: `Name` \| `LastActivityDate DESC NULLS LAST` \| `AnnualRevenue DESC NULLS LAST` \| `CreatedDate DESC`. |
| `accountLimit` | 6 | Up to 50. |
| `leadRating` | `Hot` | `Hot` \| `Warm` \| `Cool` \| `Any`. |
| `leadOwnerScope` | `mine` | |
| `leadLimit` | 6 | |

## Styling
Shares the SE_FR palette declared at the top of the CSS (brand blue, SLDS success green, warning orange, error red). KPI tile top border and value color map 1:1 to the palette for a homogeneous look across the Home page.

## Origin
Renamed from `seFrFieldSalesDashboard` (v2.3 → v2.4). The old bundle is kept in the library as deprecated.
