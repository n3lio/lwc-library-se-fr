---
tagline: Live account team panel with profile photos, roles and record navigation.
categories: [Service]
personas: [Service, FieldSales, Sales]
chips:
  - Live Apex wire
  - Profile photos
  - Role badges
  - Multi-object
dataMode: live
mobileReady: true
originalAuthor: Thomas Plaindoux
originalAuthorEmail: null
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-05-28
keyProps:
  - Language (FR/EN)
  - Source mode (live/mock)
  - Card title override
seBenefit: Displays the team working on a record (Account owner, Opp team members) in one click - with photos, roles, and navigation to User profiles. Works out of the box on any SDO with no setup.
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Subscribers List

Displays the team of Users linked to the current record — with profile photos (when available), Salesforce role badges, and clickable names that navigate to User record pages.

## Where to drop it (and what shows)

| Surface | What you see (live mode) | Default mode |
|---|---|---|
| **Account record page** ⭐ | Account Owner + Users on OpportunityTeamMembers of all child Opps (deduplicated) | live |
| **Opportunity record page** ⭐ | Opp Owner + OpportunityTeamMembers | live |
| **Case record page** | Case Owner + Account Owner (if different) | live |
| **Lead / Contact / Order / any other record page** | Record Owner only (lean output, useful as a 1-line "owner" panel) | live |
| **App page** | Mock data (pipe-separated names/roles via App Builder props) | mock |
| **Home page** | Mock data (same as App page) | mock |

⭐ = richest scenario (recommended for demos).

## How it works

### Live mode (default — zero setup, works on any org)

The component queries Users related to the current record. The recordId-less surfaces (App / Home) automatically fall back to mock mode using the configured pipe-separated props.

Results are sorted by seniority (VP/Director first, then managers, then sales, then agents).

Profile photos are shown when the User has a custom photo uploaded; otherwise, a gradient-colored initials circle is displayed.

### Mock mode (pipe-separated props)

Set `sourceMode` to `mock` in App Builder to use custom names/roles from properties. Useful for:
- App/Home pages (no recordId)
- Demo scenarios with specific data

## Key features

- **Live Apex** — cacheable wire, multi-object compatible (Account, Opportunity, Case, any SObject)
- **Profile photos** — auto-detects custom uploaded photos vs default Salesforce avatar
- **Gradient initials** — subtle professional blue/purple palette when no photo available
- **Role badges** — shows UserRole.Name in a pill badge
- **Clickable names** — navigates to User record page
- **Smart sorting** — executives first, then by role seniority
- **Bilingual** FR / EN via `language` prop
- **Pagination** — 6 visible + expand button (round icon, library standard)

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `'fr'` or `'en'` |
| `cardTitle` | String | *(dict)* | Override card title (default: "Equipe du compte" / "Account Team") |
| `cardSubtitle` | String | *(auto)* | Override subtitle (auto = "N membres") |
| `cardIcon` | String | `standard:team_member` | SLDS icon |
| `sourceMode` | String | `live` | `'live'` (Apex query) or `'mock'` (pipe-separated props) |
| `contactNames` | String | | [Mock] Pipe-separated names |
| `roles` | String | | [Mock] Pipe-separated roles |
| `userIds` | String | | [Mock] Pipe-separated User IDs (enables clickable names + photos) |

## Apex

- `SE_FR_SubscribersListController` — cacheable wire, multi-object detection via `getSObjectType()`, queries Owner + team relationships. Returns `TeamMemberDTO[]` with userId, name, role, photoUrl, initials.
