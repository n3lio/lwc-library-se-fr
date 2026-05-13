---
tagline: Horizontal multi-phase timeline with date axis, 'Today' marker and done / pending state per phase.
categories: [Sales Productivity]
personas: [Sales]
chips:
  - Date-axis layout
  - 'Today' marker
  - Done / pending state
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Up to 6 phases (label, date, status)
  - Color theme
seBenefit: Visualizes a journey or process state without needing custom objects or flows — type the phases directly in App Builder.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# CCO FR - Timeline Phases (`seFrTimelinePhases`)

Horizontal multi-phase timeline. Visualizes a journey, project, or sales-cycle with phases positioned on a date axis, a "Today" marker, and a done / pending state per phase.

## Targets

- `lightning__RecordPage`
- `lightning__AppPage`
- `lightning__HomePage`

## Quick start

Drop on an Account record page — defaults to a 5-phase sales cycle (Prospection → Découverte → Démo → Proposition → Closing). The vertical "Today" line auto-positions.

## Customizing phases

Set `phasesJson` to a JSON array:

```json
[
    { "label": "Onboarding",  "date": "2026-01-15", "done": true  },
    { "label": "Discovery",   "date": "2026-02-08", "done": true  },
    { "label": "Demo",        "date": "2026-03-12", "done": true  },
    { "label": "Proposal",    "date": "2026-04-22", "done": false },
    { "label": "Closing",     "date": "2026-05-30", "done": false }
]
```

Each phase: `label` (string), `date` (`YYYY-MM-DD`), `done` (boolean).

## Default phase sets (when `phasesJson` is empty)

| `scope` | Default phases |
|---|---|
| `record` (default) | Sales cycle — Prospection → Découverte → Démo → Proposition → Closing |
| `home` | Fiscal milestones — Q1 kick-off → Q2 ramp-up → Q3 expansion → Q4 year-end |

## Properties

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `fr` / `en` (drives default labels) |
| `scope` | `record` | `record` / `home` (drives default phases) |
| `cardTitle` | – | Override |
| `cardIcon` | `standard:timesheet` | SLDS icon |
| `phasesJson` | – | JSON array (overrides defaults) |
| `localeTag` | `fr-FR` | Locale used to format phase dates |
| `hideTodayMarker` | `false` | Hide the vertical "Today" line |

## SE benefits

- **Visualizes a journey or process state** without needing custom objects, flows, or path components.
- **Type the phases directly in App Builder** — paste a JSON array, see it render. Useful for "this customer is at step 3 of onboarding" demo moments.
- **"Today" marker auto-positioned** on the date axis — gives an instant sense of progress vs. plan.
- **Two default sets** (sales cycle for Account pages, fiscal milestones for Home pages) keep the component demo-ready out of the box.
