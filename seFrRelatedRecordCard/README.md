---
tagline: Vertical sidebar card showing the counterpart record (Contact / Account) with key fields and avatar.
categories: [Account 360°]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - Auto picks counterpart
  - Person Account aware
  - Empty-state fallback
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - "`target` · auto / account / contact"
  - "`fieldsCsv` per target"
  - Per-target image field (Contact + Account)
seBenefit: Click the avatar to upload an image for the related record — handy for setting an Account logo or a Contact picture without leaving the page. Default Contact image field `SDO_Cust360_Contact_Picture_URL__c` works out-of-box on SDO.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# SE FR - Related Record Card

Vertical card (Contact / Account avatar + key fields) showing the counterpart of the current record. Designed for a narrow sidebar column on Account, Contact, Case, Opportunity or Order record pages.

## Pick behaviour

| Current record | `target=auto` displays | Data source |
|---|---|---|
| Account | Primary / first Contact | `Account.PersonContactId` (Person Account) → first child Contact |
| Contact | Account | `Contact.AccountId` |
| Case | Account | `Case.AccountId` |
| Opportunity | Account | `Opportunity.AccountId` |
| Order | Account | `Order.AccountId` |

Force a specific target with `target=account` or `target=contact` (e.g. show the Contact behind a Case via `Case.ContactId` — set `target=contact` on a Case page).

## Properties

| Property | Default | Description |
|---|---|---|
| `language` | `fr` | `en` or `fr`. Controls titles, buttons, empty state. |
| `target` | `auto` | `auto` / `account` / `contact`. |
| `cardTitle` | *(language default)* | Override only if you want a custom title. |
| `cardIcon` | *(auto)* | SLDS icon name. Defaults to `standard:account` or `standard:contact`. |
| `fieldsCsv` | *(target-specific)* | Comma-separated API names. Contact: `Title,Department,Email,Phone,MobilePhone`. Account: `Industry,Type,Phone,Website,AnnualRevenue,NumberOfEmployees`. Unknown fields are silently skipped. |
| `imageFieldApiName` | `PhotoURL` | Works out-of-box for Contact. For Account, point to a custom image URL field (or leave; the card shows initials). |

## Visual behaviour

- Avatar: image if available, otherwise gradient circle with initials.
- Click on the header → opens the related record.
- Phone / email / url fields render as clickable links (`tel:`, `mailto:`, external URL).
- Empty state when the source record has no counterpart (e.g. a Case without `AccountId`).

## Apex dependency

`SE_FR_RelatedRecordCardController` — deploy once per org.
