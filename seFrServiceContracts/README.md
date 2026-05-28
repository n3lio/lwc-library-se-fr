---
tagline: Active service contracts per Account with deadline countdown, trade badge, SLA and open work order counter.
categories: [Service]
personas: [Service, FieldSales]
chips:
  - Live Apex wire
  - Deadline countdown
  - Category badges
  - Open WO counter
dataMode: live
mobileReady: true
originalAuthor: Thomas Plaindoux
originalAuthorEmail: REDACTED
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-05-28
keyProps:
  - Language (FR/EN)
  - Card title override
  - Card icon override
seBenefit: Shows the full contractor landscape for an account in one glance - deadlines, SLAs, open interventions, contact emails. Ideal for Field Service, property management and B2B service demos.
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Service Contracts

Lists active service contracts linked to an Account with a deadline countdown, open work order counter, navigation to the record, and optional enriched columns (category badge, SLA, contractor email, scope). Click any row to navigate to the ServiceContract record.

## Two modes — works out of the box, upgradable

### Standard mode (zero custom fields — works on any SDO)

The component queries **only standard fields** (`Name`, `ContractNumber`, `StartDate`, `EndDate`, `Description`) and counts open WorkOrders using the standard `Status` field (anything not Completed / Closed / Canceled).

You get: contract list with name, number, **deadline countdown** (color-coded: green >30d, orange ≤30d, red = expired), description as scope, and open WO counter. Ready to use immediately.

### Full mode (5 optional custom fields — original Thomas Plaindoux design)

When the custom fields below are detected on the org, the component **automatically** upgrades its display: colored category badges, SLA formatting, contractor email link, and custom intervention status counting.

#### Custom fields to create for Full mode:

**On `ServiceContract`:**

| Field API Name | Type | Values / Description |
|---|---|---|
| `Metier__c` | Picklist (restricted) | Trade/category labels. Example values: Plomberie, Electricite, Ascenseur, Chauffage, Espaces verts, Serrurerie, Peinture, Multi-services (adapt to your demo context) |
| `SLA_Heures__c` | Number (0 decimals) | SLA commitment in hours (e.g. 4, 24, 48, 72) |
| `Email_Prestataire__c` | Email | Contractor contact email |
| `Perimetre_Couvert__c` | TextArea (255) | Scope / perimeter description |

**On `WorkOrder`:**

| Field API Name | Type | Values / Description |
|---|---|---|
| `Statut_Intervention__c` | Picklist | Intervention lifecycle. Open statuses (counted as red): Signalee, Mandatee, Planifiee, Reportee, Bloquee. Closed statuses (not counted): Realisee, Cloturee, Annulee |

#### Data seeding for Full mode demo:

1. Create 3-5 `ServiceContract` records on an Account, each with a different `Metier__c` value, realistic `SLA_Heures__c` (4h for urgent, 48h for standard), an email, and a scope description.
2. Create 1-3 `WorkOrder` records per contract with `Statut_Intervention__c` set to open values (Signalee, Mandatee, Planifiee) to see the red counter.

## Key features

- **Hybrid Apex** — dynamic SOQL detects available fields at runtime, never crashes on missing custom schema
- **Deadline countdown** — computed from `EndDate`, color-coded: green (>30 days), orange (≤30 days), red (expired)
- **Colored category badges** (Full mode) — deterministic palette rotation based on distinct `Metier__c` values
- **SLA formatting** (Full mode) — hours < 24 shown as `Xh`, otherwise `Xj Yh`
- **Open work orders** — red warning counter (standard Status or custom Statut_Intervention__c)
- **Scope / perimeter** — shows `Perimetre_Couvert__c` if present, falls back to standard `Description`
- **Navigation** — click on contract name navigates to ServiceContract record page
- **Bilingual** FR / EN via `language` prop

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `'fr'` or `'en'` |
| `cardTitle` | String | *(dict)* | Override card title |
| `cardIcon` | String | `standard:service_contract` | SLDS icon |

## Apex

- `SE_FR_ServiceContractsController` — cacheable wire, dynamic SOQL, returns `ContractDTO[]` with open work order counts and EndDate for deadline computation. Uses `Schema.SObjectType.*.fields.getMap()` to detect custom fields at runtime.
