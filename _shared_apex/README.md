# _shared_apex

Apex classes that are **not** tied to any specific LWC in this library, but are useful as building blocks for additional components you may want to build on top of the SE_FR kit. Deploy them once per org.

## Classes

| Class | What it does |
|---|---|
| `SE_FR_AccountMapController.getNearbyAccounts()` | Returns up to 15 accounts with a billing address (globally). Schema-safe: reads `Account.SDO_MAPS_Days_Since_Last_Visit__c` when present. Use `getNearbyAccountsWithField(fieldApiName)` to point at a different field. |
| `SE_FR_NearbyAccountsController.getNearbyAccounts(limit, recordTypeName)` | Same as above but scoped to the current user (`OwnerId = :userId`). Use `getNearbyAccountsWithField(limit, recordTypeName, fieldApiName)` to override the last-visit field. |
| `SE_FR_VoiceNoteController.saveVoiceNoteAsTask(accountId, text)` | Creates a closed Task on the given Account with the dictated text. `saveVoiceNoteAsTaskWithSubject(...)` lets you override the Task subject. |
| `SE_FR_RecommendationController.getRecommendations(...)` | Wraps the Commerce AI recommendations endpoint (`/services/data/vX/commerce/webstores/{id}/ai/recommendations`). The `WithLocale` overload exposes `languageTag` and `apiVersion`. Requires a `WebStoreNetwork`. |
| `SE_FR_AgendaController.getMyTasks(filter, maxRows)` / `.getMyEvents(daysAhead, maxRows)` | Used by `seFrMyTasks` and `seFrMyEvents`. Returns open/closed Tasks owned by the running user filtered by Today/Upcoming/Overdue/Mine/Completed; returns Events overlapping the next N days. Standard fields only. |

## Install
Deploy each `.cls` + its `.cls-meta.xml` sibling. All classes are `public with sharing` and have `@AuraEnabled` methods.
