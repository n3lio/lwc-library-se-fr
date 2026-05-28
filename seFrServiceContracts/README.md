---
tagline: Active service contracts per Account with trade badge, SLA, email and open work order counter.
categories: [Service]
personas: [Service, FieldSales]
chips:
  - Live Apex wire
  - Category badges
  - SLA formatting
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
seBenefit: Shows the full contractor landscape for an account in one glance - SLAs, open interventions, contact emails. Ideal for Field Service, property management and B2B service demos.
releaseStatus: stable
status: active
screenshots: []
---

# CCO FR - Service Contracts

Lists active service contracts linked to an Account with a colored trade/category badge, SLA commitment, contractor email, scope description, and a red counter of open work orders per contract. Click any row to navigate to the ServiceContract record.

## Key features

- **Colored category badges** — deterministic palette rotation based on distinct `Metier__c` values
- **SLA formatting** — hours < 24 shown as `Xh`, otherwise `Xd Yh`
- **Open work orders** — red warning counter from live AggregateResult on WorkOrder
- **Navigation** — click on contract name navigates to ServiceContract record page
- **Bilingual** FR / EN via `language` prop

## Data enrichment prerequisites

This component requires **5 custom fields** to be deployed on the target org:

### On `ServiceContract`:
| Field API Name | Type | Description |
|---|---|---|
| `Metier__c` | Picklist | Trade/category (e.g. Plumbing, Electrical, HVAC, Elevator, Landscaping…) |
| `SLA_Heures__c` | Number | SLA commitment in hours |
| `Email_Prestataire__c` | Email | Contractor contact email |
| `Perimetre_Couvert__c` | TextArea | Scope/perimeter description |

### On `WorkOrder`:
| Field API Name | Type | Description |
|---|---|---|
| `Statut_Intervention__c` | Picklist | Intervention status. Open statuses counted: Signalée, Mandatée, Planifiée, Reportée, Bloquée |

Additionally, the Account must have at least 1-2 `ServiceContract` records with `Metier__c` populated, and optionally `WorkOrder` records linked to those contracts.

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `'fr'` or `'en'` |
| `cardTitle` | String | *(dict)* | Override card title |
| `cardIcon` | String | `standard:service_contract` | SLDS icon |

## Apex

- `SE_FR_ServiceContractsController` — cacheable wire returning `ContractDTO[]` with open work order counts
