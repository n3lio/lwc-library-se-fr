---
tagline: Configurable marketing engagement timeline with colored typed icons and live search.
categories: [Marketing & Data]
personas: [Marketing, Sales]
chips:
  - Timeline UI
  - 8 event types
  - Live search
  - Zero Apex
dataMode: mock
mobileReady: true
originalAuthor: Thomas Plaindoux
originalAuthorEmail: REDACTED
maintainedBy: Lionel Braun
libraryIntegrationDate: 2026-05-28
keyProps:
  - Event types, emails, lists, ages (pipe-separated)
  - Show/hide search
  - Card title override
seBenefit: Demonstrates a Marketing Cloud-style engagement history without needing MCAE installed. Perfect for demos on scratch orgs or SDOs without Marketing Cloud connectivity.
releaseStatus: stable
status: active
screenshots: []
---

# CCO FR - Engagement History

Configurable marketing engagement timeline showing Email Opens/Sends/Clicks/Bounces, SMS, Form Submits, and Page Views. Each event type gets a colored icon badge. Includes a live search bar that filters across all columns.

## Key features

- **8 recognized event types** with distinct icons and colors (Email Open/Sent/Click/Bounce, SMS Sent/Click, Form Submit, Page View)
- **Live search** filtering across type, email, list and age columns
- **Zero Apex / zero SOQL** — all data comes from App Builder properties (pipe-separated values)
- **Bilingual** FR / EN via `language` prop
- **Responsive** — works on mobile and desktop

## Data enrichment prerequisites

None — this component operates in mock/configuration mode. All displayed data is injected via App Builder properties. No org data is queried.

## Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `'fr'` or `'en'` — controls card title, search placeholder, empty state |
| `cardTitle` | String | *(dict)* | Override the card title |
| `cardIcon` | String | `standard:share` | SLDS icon |
| `showSearch` | Boolean | `true` | Show/hide the search bar |
| `searchPlaceholder` | String | *(dict)* | Override search placeholder |
| `eventTypes` | String | *(sample)* | Pipe-separated event types |
| `eventEmails` | String | *(sample)* | Pipe-separated email subjects (aligned by index) |
| `eventLists` | String | *(sample)* | Pipe-separated lists/campaigns (aligned by index) |
| `eventAges` | String | *(sample)* | Pipe-separated relative ages (aligned by index) |
