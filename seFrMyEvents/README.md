---
tagline: Today's calendar as a compact vertical timeline that fits a sidebar column, with Google-Calendar-style overlap.
categories: [Productivity]
personas: [All]
chips:
  - Side-by-side overlap
  - Auto-trims empty hours
  - Compact today view
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Days forward
  - Show / hide attendees, location
  - Card title override
seBenefit: Useful in both Field Sales (today's appointments) and as a transversal "agenda" widget on any persona's Home Page.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrMyEvents (My Day — Events timeline)

Today's calendar for the running user, as a **vertical timeline** sized to fit a sidebar column. Kept compact on purpose: auto-trims empty hours, shows only 3 upcoming items, and lays overlapping events side-by-side (Google Calendar style) instead of stacking them on top of each other.

## Where to drop it
- **Targets:** Home Page, App Page, Record Page
- **App Builder label:** `CCO FR - My Events`

## Apex dependency
`SE_FR_AgendaController.getMyEvents(daysAhead, maxRows)` — shared Apex class, standard fields only.

## Features
- **Today timeline** — each non-all-day event positioned proportionally on a configurable hour axis (default 08:00→20:00). Clicking an event opens its record.
- **Auto-trim** (default ON) — the timeline starts `autoTrimPaddingMin` minutes before the first event and ends the same padding after the last event (clamped between `startHour` and `endHour`, default padding 30min). Short days feel short, long days still fit. Disable via `disableAutoTrim` to render the full `[startHour, endHour]` range. When the day has no non-all-day events, the timeline block is not rendered at all.
- **Overlap handling** — overlapping events are placed side-by-side into columns (1/N width each) so nothing is hidden behind another event.
- **Short events** — < 30 min visible duration renders in a compact layout (title only, no footer) so they don't spill out of their block.
- **Now line** — a red horizontal line + `HH:MM • now` label, refreshed every 60 seconds. Auto-trim always keeps the now-line in the visible range when today's time falls between startHour and endHour.
- **"in N min" badge** — shown on events starting within 30 minutes, or "now" on events currently running.
- **All-day band** — compact pill band above the timeline for all-day events.
- **Colour-coded types** — each event gets a left border + tint derived from `Event.Type` via a CSV map (fallback to "Other").
- **Join button** — if `Location` or `Description` contains a Zoom / Teams / Meet / WebEx URL, a Join button opens it in a new tab. Toggle via `hideJoinButton`.
- **Upcoming list** — next **3** future-day events (default `daysAhead = 2`) in a compact list under the timeline, grouped by day label.
- **Refresh / New event** icons in the header.

## Properties
| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `My Day` | Card title. |
| `cardIcon` | String | `standard:event` | Card icon. |
| `startHour` | Integer | `8` | Earliest hour shown when auto-trim is off or can't narrow further. |
| `endHour` | Integer | `20` | Latest hour shown (same rule). |
| `disableAutoTrim` | Boolean | `false` | Auto-trim is ON by default. Turn on to always render the full `startHour → endHour` window. |
| `autoTrimPaddingMin` | Integer | `30` | Empty-hour margin kept before the first event and after the last event when auto-trim is on. Set to 0 to crop exactly to the events. |
| `daysAhead` | Integer | `2` | Days to fetch (today = 1). |
| `maxEvents` | Integer | `10` | Server-side LIMIT. |
| `localeTag` | String | `en-US` | Time formatting. |
| `typeColorsCsv` | String | see meta.xml | `Type|#hex` entries, comma-separated. |
| `hideNowLine` | Boolean | `false` | Hide the red "now" line. |
| `hideJoinButton` | Boolean | `false` | Hide the Join button even when a meeting URL is detected. |
| `emptyStateMessage` | String | `Nothing scheduled today.` | Shown when no event falls in the window. |

## Install
1. Deploy `SE_FR_AgendaController` (bundled in `classes/` here; also lives in `_shared_apex/`).
2. Unzip `seFrMyEvents.zip`, deploy the LWC bundle.
3. Drop `CCO FR - My Events` on the right column of a Home / App / Record page.

## Prerequisites — user timezone

`Date.today()` in Apex and `TODAY` / `THIS_WEEK` SOQL filters resolve against the **running user's timezone**, not the org timezone. Most Salesforce SDOs ship with the org set to `America/Los_Angeles` — if your user also inherits that timezone, a 09:00 Paris meeting stored as `07:00Z` will appear as `00:00` and today's events may be picked up under yesterday or tomorrow.

Before using the component, make sure **your user's timezone matches your local time**:
- Setup → **Personal Information** → *Time Zone* → pick your local value (e.g. `(GMT+01:00) Central European Time (Europe/Paris)` in winter / `(GMT+02:00) Central European Summer Time (Europe/Paris)` in summer).
- Save, refresh the tab.

You don't need to change the **org** timezone (Setup → Company Information) — that has much broader side-effects (Business Hours, Reports, audit trails). Changing only the user timezone is the standard SE practice on a shared SDO.

## Type toggles (in-UI "calendars")
When events carry an `Event.Type` value (Call / Meeting / Demo / Training / Other in the default palette), the component shows one coloured chip per distinct type present today. **Click a chip to mute / unmute that type** in the timeline — handy when too many auto-created events clutter the day. Muted chips remain visible (greyed + struck-through) so you can re-enable them.

Use `typesFilterCsv` on the meta.xml to hard-scope the component to a subset of types (e.g. `Meeting,Demo`) before the in-UI toggles apply — great to hide a type globally on a shared page.

## Known caveats — external calendars (Gmail / Outlook)
Salesforce surfaces Gmail / Outlook events in the **standard calendar** via **Einstein Activity Capture (EAC)**, which stores them in a private dataset that's **not queryable via SOQL** (`Event` only contains records created inside Salesforce). This means the component cannot show EAC-synced meetings — no LWC on the platform can. To still have external meetings visible here, either:
- manually create the meeting as a Salesforce `Event`, or
- use the Lightning for Outlook / Gmail "log email / event" action which creates a real Event record.

## Other caveats
- Events longer than the visible timeline are clipped to the effective bounds (the block fills from the visible portion only).
- Join-URL detection is a regex over `Location` + `Description`; custom URLs won't be detected.
- The "now" line refreshes every 60 seconds. If the component sits hidden in a tab for a long time, it picks up the next minute on re-render.
