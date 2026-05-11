---
tagline: Compact 'My Tasks' sidebar panel grouped by due date with one-click completion.
categories: [Sales Productivity]
personas: [All]
chips:
  - Grouped by due date
  - One-click complete
  - Overdue highlighting
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Days back / forward
  - Show / hide priority chip
  - Card title override
seBenefit: Same controller as My Events (single Apex class for both) — guarantees consistent date logic and shared maintenance.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrMyTasks (My Tasks)

Compact "My Tasks" panel designed for a **sidebar column** on a Home / App / Record page. Reads the running user's tasks, auto-groups them by due date, lets the user complete a task with a click.

## Where to drop it
- **Targets:** Home Page, App Page, Record Page
- **App Builder label:** `SE FR - My Tasks`

## Apex dependency
`SE_FR_AgendaController.getMyTasks(filter, maxRows)` — shared Apex class, standard fields only.

## Features
- **Filter dropdown** in the header — Today / Mine / Overdue / Upcoming / Completed. Label shows the current filter.
- **Auto-grouping** — rows are bucketed client-side into Overdue / Today / Tomorrow / This week / Later / No date / Completed. Empty buckets are hidden.
- **Interactive checkbox** — clicking the checkbox flips `Task.Status` between `Completed` and `In Progress` via `updateRecord`, then refreshes the list (so the task moves groups). Fixes the v2.x bug where the checkbox was always disabled.
- **Urgent flag** — High-priority or overdue tasks show a red flag icon and red date.
- **"+ New Task"** button in the header opens the standard new-task page.
- **"View all"** button navigates to the Task home list.
- **Optional quick actions** (off by default) — on hover, shows Email and Log-a-Call buttons. Turn on with `showQuickActions`.

## Properties
| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `My Tasks` | Card title. |
| `cardIcon` | String | `standard:task` | Card icon. |
| `defaultFilter` | String | `Upcoming` | Initial filter. One of the `filterOptionsCsv` values. |
| `filterOptionsCsv` | String | `Today,Mine,Overdue,Upcoming,Completed` | Filter dropdown entries. |
| `maxTasks` | Integer | `10` | Server-side row LIMIT (1–50). |
| `localeTag` | String | `en-US` | Used to format the due date. |
| `showQuickActions` | Boolean | `false` | Reveals Email / Log-a-Call icons on row hover. |
| `emptyStateMessage` | String | `No tasks for this filter.` | Shown when the filter returns no row. |

## Install
1. Deploy `SE_FR_AgendaController` (bundled in `classes/` here; also lives in `_shared_apex/` if you need it for other components).
2. Unzip `seFrMyTasks.zip`, deploy the LWC bundle.
3. Drop `SE FR - My Tasks` on the right column of a Home / App / Record page.

## Prerequisites — user timezone

The `Today` / `Overdue` / `Upcoming` filters use SOQL date literals (`TODAY`, `<`, `>=`) that resolve against the **running user's timezone**. Most Salesforce SDOs ship with the org set to `America/Los_Angeles` — if your user also inherits that timezone, tasks due today in Paris may be bucketed as yesterday or tomorrow.

Before using the component, set **your user's timezone to your local value**:
- Setup → **Personal Information** → *Time Zone* → pick your local value (e.g. `(GMT+01:00) Central European Time (Europe/Paris)` in winter / `(GMT+02:00) Central European Summer Time (Europe/Paris)` in summer).
- Save, refresh the tab.

You don't need to change the **org** timezone — only the user timezone.

## Known caveats
- "Reopen" sets `Status = 'In Progress'`. If your org's Task status picklist doesn't include that value, change it in `handleToggleComplete`.
- Quick actions rely on `Contact.SendEmail` (Who) and `Global.LogACall` — both are present out of the box on standard orgs.
