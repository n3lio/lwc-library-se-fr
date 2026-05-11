---
tagline: Most recent Order linked to a Case with products, total, delivery info and edit / delete / submit actions.
categories: [Sales Productivity]
personas: [Service]
chips:
  - Auto-resolves Account
  - Edit / delete / submit
  - Activates Order on submit
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Show / hide line item details
  - Currency display
  - Separator label
seBenefit: Clean visual summary that a rep can read aloud during a call without scrolling — great for the "I'm reading you the order back" moment.
featured: true
featuredRank: 10
releaseStatus: stable
status: active
screenshots: []
---

# seFrOrderSummary

Displays the **most recent Order** associated with the current Case. The Account is resolved first from `Case.AccountId`; if missing, from `Case.Contact.AccountId`. Shows products, total amount and delivery info, with actions to edit delivery details, delete, or submit (marks the Order status as `Activated`).

## Where to drop it
- **Target:** Lightning Record Page
- **Object:** Case
- **App Builder label:** `SE_FR — Order Summary`

## Apex dependencies
- `SE_FR_OrderSummaryController` — exposes `getOrderDetailsFromCase`, `submitOrderToERP`, `saveDeliveryDetails`, `deleteOrderRecord`.

## Standard fields used
- `Case.AccountId`, `Case.ContactId` + `Contact.AccountId` — to resolve which Account to look up orders for.
- `Order.EndDate` — displayed as "estimated delivery date" and edited via the delivery form.
- `Order.Status` — set to `Activated` when the user clicks "Submit order".

## Optional custom field
- `Product2.Image_URL__c` (URL) — if present, shows a thumbnail in the product list. Gracefully skipped.

## Properties

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Linked Order` | |
| `cardIcon` | String | `standard:orders` | |
| `showBottomSeparator` | Boolean | `true` | Shows a horizontal "OR" divider at the bottom of the card. |
| `separatorLabel` | String | `OR` | Text inside the divider. |
| `currencyCode` | String | `USD` | |
| `successMessage` | String | `Order submitted.` | Toast on submit. |
| `deleteConfirmMessage` | String | `Delete this order?` | Browser `confirm()` prompt. |
| `emptyStateMessage` | String | `No order found for this case.` | Displayed when the Case has no resolvable Account or that Account has no Order. |
| `productImageFieldApiName` | String | `Image_URL__c` | Field on `Product2` holding an image URL. Schema-safe. |
| `productImageFallbackUrl` | String | — | URL used when no image is found on the product. |

## Replace action
Beyond the auto-resolved order (latest order of the Case's account / contact's account), clicking **Replace** opens a record picker so the user can manually select any Order. That choice is held in memory only — reloading the page reverts to the auto-resolved order. Use the "Back to default" link in the blue banner to clear the override.

## Install
1. Deploy `classes/SE_FR_OrderSummaryController.cls`.
2. Unzip `seFrOrderSummary.zip`, deploy the LWC bundle.
3. Drop `SE_FR — Order Summary` on a Case record page.
