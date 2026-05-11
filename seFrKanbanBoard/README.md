---
tagline: Generic kanban board with native drag & drop on any whitelisted SObject (Case, Opp, Lead, Order, Task, Account).
categories: [Sales Productivity]
personas: [Service, Telesales]
chips:
  - Drag & drop status updates
  - Auto-scope on Record Page
  - Per-status swim lanes
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Object type, status field
  - Visible columns
  - Card field list
seBenefit: Same component supports 6 SObjects — drop on a Home Page (all my open cases), an App Page (team kanban), or a Record Page (Account-scoped cases). Drag-drop instantly updates the status field.
featured: false
releaseStatus: new
status: active
screenshots: []
---

# SE FR - Kanban Board (`seFrKanbanBoard`)

Generic kanban board for **any whitelisted SObject** (Case · Opportunity · Lead · Order · Task · Account). Drag-and-drop updates the group-by field on the record. Auto-detects scoping when placed on a Record Page.

## Targets

- `lightning__HomePage`
- `lightning__AppPage`
- `lightning__RecordPage`

## Quick start

Drop on a Home Page — defaults to **Case · group by Status · display Subject**:

```
sobjectApiName  = Case
groupByField    = Status
displayField    = Subject
filterClause    = IsClosed = false
```

You get a kanban with one column per Case status, draggable cards.

## On a Record Page

Set `recordScopeField` to a lookup field on the queried object that points at the host record's Id:

| Host page | Common scope fields |
|---|---|
| Account | `AccountId` (works on Case, Opportunity, Order) |
| Contact | `ContactId` (Case), `WhoId` (Task) |
| Case | `ParentId` (sub-cases) |

Leave empty to disable scoping (kanban shows all matching records, not bound to the host).

## Properties

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `fr` / `en` |
| `cardTitle` | – | Override |
| `cardIcon` | `standard:kanban` | SLDS icon |
| `sobjectApiName` | `Case` | Whitelisted object to query |
| `groupByField` | `Status` | Picklist field used to form the columns |
| `displayField` | `Subject` | Field shown as the card title |
| `secondaryField` | `Priority` | Secondary chip / detail on the card |
| `amountField` | – | Currency field summed per column (e.g. `Amount` on Opp) |
| `filterClause` | `IsClosed = false` | Raw SOQL `WHERE` fragment (injected as-is) |
| `recordScopeField` | `AccountId` (Record Page) | Lookup field tying queried records to the host record |
| `limitCount` | `100` | Server-side `LIMIT` (1-500) |
| `maxPerColumn` | `6` | Cards shown before a "Show all (N)" link |
| `disableDragDrop` | `false` | Off by default — drag-drop updates the group-by field |
| `currencyCode` | `EUR` | Used by the column total formatter |
| `localeTag` | `en-US` | Locale used by `Intl.NumberFormat` |

## Drag & drop

By default, dropping a card in another column issues a `LightningRecordEditForm` save on the group-by field. Toggle `disableDragDrop = true` if you want the kanban to be read-only (e.g. demo videos, screenshots).

## Whitelisted SObjects

The component restricts itself to a curated set to stay schema-safe across orgs:

`Case` · `Opportunity` · `Lead` · `Order` · `Task` · `Account`

To extend the list, edit the Apex `SE_FR_KanbanBoardController` whitelist + add a `<targetConfig>` row in the meta.xml.

## SE benefits

- **One component, 6 SObjects** — same kanban for "my open cases" (Home), "team pipeline" (App Page), "Account-scoped opportunities" (Record Page).
- **Drag-drop status update** — visually striking demo moment for service / sales workflows.
- **Auto column detection** — picklist values define the columns automatically; no manual config per status.
- **Currency-aware totals** — set `amountField = Amount` on Opportunity and each column displays its sum in EUR / USD / whatever locale you configure.
