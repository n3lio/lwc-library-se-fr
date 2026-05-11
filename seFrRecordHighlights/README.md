---
tagline: Custom highlights panel with round image, key fields and action buttons, working on 8 standard objects.
categories: [Account 360°]
personas: [All]
chips:
  - Inline image upload
  - Works on 8 objects
  - Configurable field strip
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - "`language` · en / fr"
  - "`recordSource` · current / parent"
  - "`accountFieldsList`, `contactFieldsList`"
  - "`imageFieldApiName` · URL field on the record"
  - "`maxQuickActions` · loaded from layout"
seBenefit: Click the avatar to upload / replace the image instantly — no static resource, no public URL hosting, no custom field. The image is saved as a File on the record.
featured: true
featuredRank: 1
releaseStatus: stable
status: active
screenshots: []
---

# seFrRecordHighlights (Record Highlights)

Custom highlights panel for an **Account** or a **Contact** record page. Shows a round image, the record name, a configurable field strip and two action buttons.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account, Contact, Opportunity, Case, Lead, Order, Contract, Quote
- **App Builder label:** `SE FR - Record Highlights`

## Record source — which record gets displayed

| `recordSource` | What is displayed |
|---|---|
| `current` *(default)* | The record on the current page. Example: drop on Contact → shows the Contact. |
| `parent` | The parent Account linked to the current record. On an **Account** page, this resolves to the **Parent Account** via `ParentId`. Supported lookups: Contact→AccountId, Opportunity→AccountId, Case→AccountId, Lead→ConvertedAccountId, Order→AccountId, Contract→AccountId, Quote→AccountId. |

**Classic examples:**
- Show the **Contact** on a Contact page → drop on Contact, `recordSource = current` (default).
- Show the **Account** on a Contact page → drop on Contact, `recordSource = parent`.
- Show the **parent Account** on an Account page (the hierarchy parent) → drop on Account, `recordSource = parent`.
- Show the **Account** on an Opportunity, Case, Order, Contract or Quote page → drop on that object, `recordSource = parent`.

When `parent` is selected but the lookup is empty, an inline message is shown ("This Contact is not linked to an Account.") — no card noise.

*(Folder and technical component name stay `seFrRecordHighlights` for v1 compat — drop it from the palette under the master label above.)*

## Apex dependencies
None.

## Behavior
- If `customImageUrl` is set, that URL is used.
- Otherwise the component reads `imageFieldApiName` on the current record (default `ImageURL__c`). Schema-safe: if the field doesn't exist, the image falls back silently.
- When no image is available, a large SLDS icon is shown in the circle — `standard:account` or `standard:contact` based on the current object.
- Buttons adapt to the object:
  - Account: **Edit** + **View Account Hierarchy** (opens `/lightning/r/Account/<id>/hierarchy`).
  - Contact: **Edit** + **Email** (triggers the standard `Contact.SendEmail` quick action).
- Toggle `disableRealButtons` to hide the real actions and show `fakeButtonLabels` (CSV) as demo buttons.
- Field strip is driven by one of two properties depending on the object: `accountFieldsList` or `contactFieldsList`.
- Image size (diameter in px) configurable via `imageSize` (default 90).

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `recordSource` | String | `current` | `current` or `parent`. See the table above. |
| `accountFieldsList` | String | `AccountNumber, Industry, Type, Phone` | Comma-separated field API names shown on Account. |
| `contactFieldsList` | String | `Title, Email, Phone, Department` | Comma-separated field API names shown on Contact. |
| `customImageUrl` | String | — | Direct image URL (overrides the record field). |
| `imageFieldApiName` | String | `ImageURL__c` | Field holding the record's image URL. |
| `imageSize` | Integer | `90` | Diameter of the round image, in pixels. |
| `disableRealButtons` | Boolean | `false` | When on, hide Edit/secondary action and show fake demo buttons. |
| `fakeButtonLabels` | String | `Create Quote, Schedule Visit` | Comma-separated labels for the demo buttons. |

Legacy `fieldsList` property is preserved (for v1 pages) but marked deprecated — use `accountFieldsList` instead.

## Install
1. Unzip `seFrRecordHighlights.zip`, deploy the LWC bundle.
2. Drop `SE FR - Record Highlights` on an Account or Contact record page.
