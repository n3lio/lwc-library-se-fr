---
tagline: Dictate a voice note via the Web Speech API and save it as a completed Task linked to the current record.
categories: [Geo & Field]
personas: [FieldSales]
chips:
  - Browser-native dictation
  - Saves as Task
  - Auto WhoId / WhatId routing
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Auto-save vs review-first
  - Transcript language
seBenefit: Speech-to-text via the browser `SpeechRecognition` API — no Einstein / external service dependency. Demoable on any org as long as Chrome is the browser.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrVoiceNoteTaker

Dictate a voice note using the browser's Web Speech API, edit it manually if needed, and save it as a completed `Task` linked to the current record. Works on Account, Contact, Lead or Opportunity — the recordId is routed to `Task.WhoId` for Contact/Lead, `Task.WhatId` otherwise.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account, Contact, Lead, Opportunity
- **App Builder label:** `CCO FR - Voice Note Taker`

## Apex dependency
- `SE_FR_VoiceNoteController.saveVoiceNoteForRecord(recordId, noteText, taskSubject)` (in `_shared_apex/`).

## Browser requirement
Voice recognition relies on `window.SpeechRecognition` / `webkitSpeechRecognition`. Works in Chrome, Edge and Safari — Firefox shows the unsupported-browser message.

## Task created
| Field | Value |
|---|---|
| `Subject` | `taskSubject` property (default `Visit notes (voice dictation)`) |
| `Description` | The note text (transcribed speech + manual edits) |
| `Status` | `Completed` |
| `ActivityDate` | Today |
| `Priority` | `Normal` |
| `WhoId` or `WhatId` | the current record, routed by object type |

The activity feed component (to be built later) will display `Task.Description` verbatim when the Task was created by this component.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Voice Note Taker` | |
| `cardIcon` | String | `standard:voice_call` | SLDS icon. |
| `speechLocale` | String | `en-US` | BCP 47 locale for speech recognition. |
| `taskSubject` | String | `Visit notes (voice dictation)` | Subject on the created Task. |
| `recordingHint` | String | `Listening… Speak now.` | Shown while recording. |
| `textareaLabel` / `textareaPlaceholder` | String × 2 | English defaults | Customize the editable area. |
| `startButtonLabel` / `stopButtonLabel` / `saveButtonLabel` | String × 3 | English defaults | Button labels. |
| `unsupportedBrowserMessage` | String | `Voice recognition is not supported by your browser. Use Google Chrome.` | Fallback message. |
| `successMessage` | String | `Note saved as a Task successfully.` | Success toast message. |

## Install
1. Deploy `_shared_apex/classes/SE_FR_VoiceNoteController.cls` first.
2. Unzip `seFrVoiceNoteTaker.zip`, deploy the LWC bundle.
3. Drop `CCO FR - Voice Note Taker` on an Account / Contact / Lead / Opportunity record page.
