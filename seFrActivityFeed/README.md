---
tagline: Unified activity timeline aggregating 16+ Salesforce record types in a single feed with rich filtering.
categories: [Account 360°]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - 16+ record types unified
  - Rich filters + expand
  - Per-source error isolation
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Days back / forward window
  - Include related contacts
  - Object types displayed
seBenefit: Pulls from `Task`, `Event`, `EmailMessage`, `VoiceCall`, `MessagingSession`, `LiveChatTranscript`, `Order`, `Case`, `Opportunity`, `Quote`, `Contract`, `Visit`, `ContentDocumentLink`, `FeedItem`, `SurveyResponse` — and uses business-meaningful dates (CloseDate, EffectiveDate, StartDate) instead of CreatedDate.
featured: true
featuredRank: 8
releaseStatus: stable
status: active
screenshots: []
---

# seFrActivityFeed

Aggregated activity timeline for an Account or Contact. Shows **16+ record types** in a unified feed: Tasks, Events, EmailMessages, VoiceCalls, MessagingSessions, LiveChatTranscripts, Orders, Cases, Opportunities, Quotes, Contracts, Visits, Files (ContentDocument), Chatter posts (FeedItem), Survey Responses.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account, Contact
- **App Builder label:** `SE FR - Activity Feed`

## Apex dependency
- `SE_FR_ActivityFeedController.getActivityFeed(recordId, includeRelatedContacts, daysBack, daysForward)` — returns a unified `List<FeedEntry>`. Schema-safe: each object is queried only if present and accessible; any failure is caught per-source so a missing object never breaks the whole feed.

## Feed sources

| Source | Activity date | Link route |
|---|---|---|
| `Task` | `ActivityDate` (fallback `CreatedDate`) | `WhatId` / `WhoId` |
| `Event` | `StartDateTime` | `WhatId` / `WhoId` |
| `EmailMessage` | `MessageDate` | `RelatedToId = recordId` |
| `VoiceCall` | `CallStartDateTime` | `AccountId` / `RelatedRecordId` |
| `MessagingSession` | `StartTime` | `AccountId` / `ContactId` |
| `LiveChatTranscript` | `StartTime` | `AccountId` / `ContactId` |
| `Order` | `CreatedDate` | `AccountId` |
| `Case` | `CreatedDate` | `AccountId` / `ContactId` |
| `Opportunity` | `CreatedDate` | `AccountId` |
| `Quote` | `CreatedDate` | `Opportunity.AccountId` |
| `Contract` | `CreatedDate` | `AccountId` |
| `Visit` | `ActualVisitEndTime` if completed, else `PlannedVisitStartTime` | `AccountId` |
| `ContentDocumentLink` | `SystemModstamp` | `LinkedEntityId = recordId` |
| `FeedItem` | `CreatedDate` | `ParentId = recordId` |
| `SurveyResponse` | `SystemModstamp` | `SurveySubjectId = recordId` |

On an **Account**, enabling `includeRelatedContacts` (default) also pulls activities of the account's related Contacts. On a **Contact**, the feed always includes the contact's own activities + Orders/Cases/Opportunities of its Account.

## UI behavior
- Top toolbar: **Log a Call / Email / New Task / New Event / Schedule Visit** — each triggers the standard quick action of the object (via `standard__quickAction`). The exact button set is configurable.
- Filter panel (toggle with the funnel icon): date range (all / next 7d / past 7d / past 30d), activity types (checkbox grid), sort asc/desc.
- Items are grouped: **Upcoming & pending** section at the top (anything `isFuture = true`), then one group per month for past items.
- Items are collapsed by default — click a row to expand and see the description (with formatting preserved).
- `Task.Description` is rendered verbatim on expand — so notes saved by `seFrVoiceNoteTaker` are fully visible.
- Refresh button re-invokes the wired Apex.
- "Expand all" / "Collapse all" toggles every item at once.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Activity Feed` | |
| `cardIcon` | String | `standard:activations` | |
| `includeRelatedContacts` | Boolean | `true` | On Account pages, also pull activities of the account's Contacts. |
| `defaultDaysBack` | Integer | `365` | History window. |
| `defaultDaysForward` | Integer | `90` | Future window (events, pending tasks, planned visits). |
| `defaultSortDesc` | Boolean | `true` | Newest first. |
| `expandedByDefault` | Boolean | `false` | Expand all items on load. |
| `enabledActionsCsv` | String | `LogACall,Email,NewTask,NewEvent,NewVisit` | Comma-separated list of toolbar quick-action buttons. API names must match quick actions available on the object's page layout. |

## Install
1. Deploy `classes/SE_FR_ActivityFeedController.cls`.
2. Unzip `seFrActivityFeed.zip`, deploy the LWC bundle.
3. Drop `SE FR - Activity Feed` on an Account or Contact record page.
4. Verify that the Account/Contact page layout exposes the quick actions you listed in `enabledActionsCsv` — the toolbar buttons launch the standard quick actions of the object.

## Prerequisites — user timezone

The `defaultDaysBack` / `defaultDaysForward` filters compute date windows using the **running user's timezone**, and the grouping by month ("April 2026", etc.) displays each activity's date in the user timezone. Most Salesforce SDOs ship with the org set to `America/Los_Angeles` — if your user also inherits that timezone, activities may appear under unexpected months (or the wrong side of "Upcoming").

Before using the component, set **your user's timezone to your local value**:
- Setup → **Personal Information** → *Time Zone* → pick your local value (e.g. `(GMT+01:00) Central European Time (Europe/Paris)` / `(GMT+02:00)` in summer).
- Save, refresh the tab.

You don't need to change the **org** timezone — only the user timezone.

## Known limitations
- Quick action names (`LogACall`, `Email`, `NewTask`, `NewEvent`, `NewVisit`) are the **global** API names. Some orgs may use different action names (e.g. custom quick actions) — adjust `enabledActionsCsv` accordingly.
- The component does not deduplicate activities that exist on both the account and a related contact (could appear twice if linked to both via `WhatId` and `WhoId` on the same Task). That's Salesforce's own standard behavior.
- `ListEmail` and `SMS` don't have dedicated SObjects — they show up as Tasks with `TaskSubtype = 'ListEmail'` / `'Call'` / custom subtypes.
