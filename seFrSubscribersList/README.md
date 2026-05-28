---
tagline: Configurable notification subscribers list with auto-generated colored avatars and channel badges.
categories: [Service]
personas: [Service, Marketing, Telesales, FieldSales]
chips:
  - Deterministic avatars
  - Channel badges
  - Auto footer
  - Zero Apex
dataMode: mock
mobileReady: true
originalAuthor: Thomas Plaindoux
originalAuthorEmail: REDACTED
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-05-28
keyProps:
  - Names, channels, ages, counts (pipe-separated)
  - Card title / subtitle / footer overrides
  - Show/hide footer
seBenefit: Instant subscriber panel for any context - property management, campaign audiences, case watchers. Zero dependency, ready in seconds on any org.
releaseStatus: stable
status: active
screenshots: []
---

# CCO FR - Subscribers List

Configurable list of notification subscribers with auto-generated colored avatars (deterministic color from name hash), channel badges (Email, SMS, WhatsApp, Push), relative subscription age, and notification counter per contact. Footer auto-computes total notifications.

## Key features

- **Deterministic avatars** — color derived from FNV-like hash of the name, same person = same color everywhere
- **Auto initials** — first + last initial (or first 2 chars for single names)
- **Channel badges** — Email (grey), SMS (navy), WhatsApp (green), Push (indigo)
- **Zero Apex / zero SOQL** — all data from App Builder properties (pipe-separated)
- **Bilingual** FR / EN via `language` prop
- **Auto-computed subtitle and footer** (overridable)

## Data enrichment prerequisites

None — this component operates in mock/configuration mode. All displayed data is injected via App Builder properties. No org data is queried.

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `'fr'` or `'en'` |
| `cardTitle` | String | *(dict)* | Override card title |
| `cardSubtitle` | String | *(auto)* | Override subtitle (auto = "N subscribers") |
| `cardIcon` | String | `standard:groups` | SLDS icon |
| `contactNames` | String | *(sample)* | Pipe-separated names |
| `channels` | String | *(sample)* | Pipe-separated channels (aligned by index) |
| `subscribedAtRelative` | String | *(sample)* | Pipe-separated relative ages |
| `notificationCounts` | String | *(sample)* | Pipe-separated integers |
| `footerLabel` | String | *(auto)* | Override footer (auto = total notifs) |
| `showFooter` | Boolean | `true` | Show/hide footer |
