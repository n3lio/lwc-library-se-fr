---
tagline: Configurable marketing engagement timeline with colored typed icons and inline search.
categories: [Marketing]
personas: [Marketing, Sales]
chips:
  - Timeline UI
  - 8 event types
  - Inline search
  - Zero Apex
dataMode: mock
mobileReady: true
originalAuthor: Thomas Plaindoux
originalAuthorEmail: REDACTED
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-05-28
keyProps:
  - Event types, emails, lists, ages (pipe-separated)
  - Show/hide search (toggle icon)
  - Card title override
seBenefit: Demonstrates a Marketing Cloud-style engagement history without needing MCAE installed. Perfect for demos on scratch orgs or SDOs without Marketing Cloud connectivity.
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Engagement History

Configurable marketing engagement timeline showing Email Opens/Sends/Clicks/Bounces, SMS, Form Submits, and Page Views. Each event type gets a colored icon badge. Includes an inline search (toggled via a round icon button in the card header) that filters across all columns.

## Key features

- **8 recognized event types** with distinct icons and colors (Email Open/Sent/Click/Bounce, SMS Sent/Click, Form Submit, Page View)
- **Bilingual type keys** — supports both FR and EN event type names in the same component instance
- **Inline search** — toggle via round icon button (library standard), filters across type, email, list and age columns without covering the title
- **Pagination** — 6 events visible by default, expand via round chevron button (8 values pre-filled in defaults to trigger the toggle)
- **Zero Apex / zero SOQL** — all data comes from App Builder properties (pipe-separated values)
- **Bilingual** FR / EN via `language` prop
- **Responsive** — works on mobile and desktop, narrow column compatible

## Data enrichment prerequisites

None — this component operates in mock/configuration mode. All displayed data is injected via App Builder properties. No org data is queried.

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `'fr'` or `'en'` — controls card title, search placeholder, empty state |
| `cardTitle` | String | *(dict)* | Override the card title |
| `cardIcon` | String | `standard:activations` | SLDS icon |
| `showSearch` | Boolean | `true` | Show the search toggle button |
| `searchPlaceholder` | String | *(dict)* | Override search placeholder |
| `eventTypes` | String | *(sample)* | Pipe-separated event types (FR or EN keys accepted) |
| `eventEmails` | String | *(sample)* | Pipe-separated email subjects (aligned by index) |
| `eventLists` | String | *(sample)* | Pipe-separated lists/campaigns (aligned by index) |
| `eventAges` | String | *(sample)* | Pipe-separated relative ages (aligned by index) |

## Supported Event Types

| FR key | EN key | Icon | Color |
|---|---|---|---|
| Email ouvert | Email Open | `utility:email` | Blue |
| Email envoye | Email Sent | `utility:send` | Indigo |
| Email clique | Email Click | `utility:link` | Green |
| Email rejete | Email Bounce | `utility:warning` | Red |
| SMS envoye | SMS Sent | `utility:chat` | Purple |
| SMS clique | SMS Click | `utility:link` | Purple |
| Formulaire | Form Submit | `utility:edit_form` | Cyan |
| Page vue | Page View | `utility:preview` | Slate |
