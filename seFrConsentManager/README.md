---
tagline: Per-channel GDPR consent toggle panel binding each channel to a boolean field on the current record.
categories: [Marketing]
personas: [Marketing, Service]
chips:
  - Per-channel toggles
  - LDS persistence
  - Inverted opt-out fields
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Channels CSV (override) · format `label|fieldApiName|inverted`
  - Toggle / success / error label overrides
  - Card title / icon override
seBenefit: "Default channels map onto Salesforce standard fields: `HasOptedOutOfEmail`, `DoNotCall`, `HasOptedOutOfFax` (used as a stand-in for WhatsApp opt-out). Drop on Contact / Lead / Account → it just works, no custom field required."
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrConsentManager (Consent Manager)

Toggle panel to manage per-channel consent / GDPR opt-in on a record. Each channel binds to a boolean field on the current object; the component loads the current value, flips it on toggle, and saves back via `lightning/uiRecordApi` — no Apex required.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Contact (default), Lead, Account — works on any object that has the fields configured in `channelsCsv`.
- **App Builder label:** `CCO FR - Consent Manager`

## Apex dependencies
None.

## Default channels (zero custom field)
| Channel | Field | Inverted? |
|---|---|---|
| Email | `HasOptedOutOfEmail` | ✅ (stored as opt-out) |
| Phone | `DoNotCall` | ✅ |
| WhatsApp | `HasOptedOutOfFax` | ✅ (field repurposed — lets the demo run on a vanilla org) |

With these defaults the component deploys on any Contact record page without creating a single custom field.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Contact Preferences & GDPR` | Card header title. |
| `cardIcon` | String | `standard:task2` | Card header icon. |
| `channelsCsv` | String | `Email|HasOptedOutOfEmail|true,Phone|DoNotCall|true,WhatsApp|HasOptedOutOfFax|true` | One channel per comma-separated item. Format: `label|fieldApiName|inverted`. |
| `toggleActiveLabel` | String | `Allowed` | Shown when a toggle is on. |
| `toggleInactiveLabel` | String | `Refused` | Shown when a toggle is off. |
| `successMessage` | String | `Contact preferences updated.` | Success toast text. |
| `errorMessage` | String | `Update failed.` | Error toast text. |

### `channelsCsv` format

Each channel is three pipe-separated parts, channels separated by commas:

```
<label>|<fieldApiName>|<inverted>
```

- `label` — toggle label shown in the UI.
- `fieldApiName` — the boolean field on the current object.
- `inverted` — `true` when the field stores **opt-out** semantics (e.g. `HasOptedOutOfEmail`, `DoNotCall`). The toggle shows the inverse so that "on" always means "consent given".

Examples:
- Custom opt-in fields: `Email|Email_OptIn__c|false,SMS|SMS_OptIn__c|false`
- Mix of standard and custom: `Email|HasOptedOutOfEmail|true,SMS|SMS_OptIn__c|false,Mail|HasOptedOutOfMail|true`

## Install
1. Unzip `seFrConsentManager.zip`, deploy the LWC bundle.
2. If you use custom opt-in/opt-out fields, make sure they exist on the object and the running user has edit access.
3. Drop `CCO FR - Consent Manager` on a Contact / Lead / Account record page and set `channelsCsv` to match the customer's data model.

## Known caveats
- **`HasOptedOutOfFax` re-purposed for WhatsApp** in the defaults — purely a demo convenience to avoid requiring a custom field. Replace with a real `WhatsApp_OptIn__c` in production demos if the customer has one.
- The component needs the running user to have **edit** access to each backing field; otherwise `updateRecord` fails and the toggle reverts.

## Origin
Genericized from the `krysConsentManager` Krys demo component.
