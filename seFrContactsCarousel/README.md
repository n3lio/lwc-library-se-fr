---
tagline: Horizontal carousel of an Account's Contacts with avatars, role badges and quick Email / Call actions.
categories: [Account 360°]
personas: [Sales, FieldSales, Telesales, Service, Marketing]
chips:
  - Champion / DMU role badges
  - Initials avatar fallback
  - Email & Call shortcuts
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Visible contact count
  - Card field list
  - Quick actions
seBenefit: Visual replacement for the standard Contacts related list — much more demo-friendly than a flat table.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrContactsCarousel (Contacts Carousel)

**B2B** — Horizontal carousel of the Contacts linked to the current Account. Each card shows an avatar (photo or initials fallback), name, title, an optional **role badge** (Champion / Detractor / DMU) and Email / Call quick actions. Bilingual EN / FR.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account
- **App Builder label:** `SE FR - Contacts Carousel`

## Apex dependency
`SE_FR_ContactsCarouselController.getContacts(accountId, limitCount, orderBy)`.

## Properties
| Name | Default | Description |
|---|---|---|
| `language` | `en` | `en` or `fr`. |
| `cardTitle` | — | Override the default. |
| `limitCount` | 24 | Max Contacts fetched (1–100). |
| `orderBy` | `LastActivityDate DESC NULLS LAST` | Whitelisted: `LastActivityDate DESC NULLS LAST` / `Name ASC` / `CreatedDate DESC` / `Title ASC NULLS LAST`. |
| `visibleCount` | 4 | Cards shown per page. Arrows paginate by this amount. |
| `badgesCsv` | — | Per-contact badge overlay. Format: `Eliott Mercier=Champion|#2e844a,Mathieu Bernard=Detractor|#ba0517`. Match is case-insensitive on `Contact.Name`. |
| `hideNewContactButton` | `false` | |

## Install
1. Deploy `classes/SE_FR_ContactsCarouselController.cls`.
2. Unzip `seFrContactsCarousel.zip`, deploy the LWC bundle.
3. Drop `SE FR - Contacts Carousel` on an Account record page.

## Data enrichment prerequisites
- Contacts should have **Title** and **Department** filled in for the card to look complete. Blank fields display an empty line.
- `Contact.PhotoURL` is a **read-only standard field** populated automatically from the Contact's Chatter profile photo. It cannot be set via DML. Contacts without a Chatter photo will show **initials on a colored background** — the component is designed for that and it looks clean.
- For the **role badges** to appear, populate the `badgesCsv` property with the names exactly as they appear in `Contact.Name`. Mismatches are silently ignored.
- Best demos have at least **4-6 Contacts on the Account** with distinct titles (C-level, manager, user champion, IT…).
