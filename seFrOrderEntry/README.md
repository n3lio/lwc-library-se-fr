---
tagline: Full-grid order entry on an Account or Case with stock, AI-recommended quantities and discounts, persisted as real Order records.
categories: [Sales]
personas: [Telesales]
chips:
  - AI-recommended qty + discount
  - Live running total
  - Persists real Order
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Product columns (code, category, last order, stock, price)
  - Currency code & symbol
  - Order type defaults
seBenefit: Real product images appear in each row (read from `Product2.Image_URL__c` by default — works out-of-box on SDO). Reorder shortcut and stock visibility are visually striking demo moments.
featured: true
featuredRank: 11
releaseStatus: stable
status: active
screenshots: []
---

# seFrOrderEntry

Full-grid order entry component for an Account (or for a Case linked to an Account). Displays products with stock, price, AI-recommended quantity and discount, a running order total, and a confirmation modal. Saves as a real `Order` + `OrderItem` records.

## Where to drop it
- **Target:** Lightning Record Page
- **Object:** Account, Case, or Visit__c (uses the Account when on an Account page, the Case's `AccountId` on a Case page, and the Visit's `Account__c` on a Visit__c page). On a Visit record, placing an order also publishes `order:done` to `sefr-visit-progress::<visitId>` in `localStorage` so `seFrVisitPlan` ticks its "Prise de commande" checklist step.
- **App Builder label:** `SE_FR — Order Entry`

## Apex dependencies
- `SE_FR_OrderEntryController` — exposes `getProductsList(…)` and `createOrderFromGrid(…)`.

## Standard fields used
- `Product2.Family` — product category column in the grid (falls back to "Uncategorized" if blank).
- `Order.SalesChannelId` — set from the `salesChannelId` property (lookup to `SalesChannel`).
- `Order.EndDate` — set from the delivery date picker.

## Optional custom field
- `Product2.Image_URL__c` (URL) — if present, used as fallback to `ProductMedia.URI`. Gracefully skipped if absent.

## Properties (highlights)

| Name | Type | Default | Description |
|---|---|---|---|
| `cardTitle` | String | `Order Entry` | |
| `cardIcon` | String | `standard:orders` | |
| `recordLimit` | Integer | `25` | Max products shown. |
| `currencyCode` | String | `USD` | Passed to `lightning-datatable` currency columns. |
| `currencySymbol` | String | `$` | Inline rendering next to prices. |
| `localeTag` | String | `en-US` | |
| `fullScreenTitleTemplate` | String | `Order entry for {account}` | Displayed in full-screen mode. `{account}` placeholder. |
| `noAccountMessage` | String | `Link an account to this case before starting an order.` | Shown when placed on a Case that has no `AccountId`. |
| `erpCheckboxLabel` | String | `Send directly to ERP` | Label of the final confirmation checkbox. |
| `filter1..5` | String | — | Dynamic SOQL fragments added to the `Product2` query (e.g. `Family = 'Widgets'`). |
| `salesChannelId` | String | — | Optional. 18-char Id of a `SalesChannel` record set on `Order.SalesChannelId` at creation. |
| `productImageFieldApiName` | String | `Image_URL__c` | Field on `Product2` holding an image URL. Schema-safe — skipped if the field is absent. |
| `productImageFallbackUrl` | String | — | URL shown when no image is found on the product or in `ProductMedia`. |

## Install
1. Deploy `classes/SE_FR_OrderEntryController.cls` first.
2. Unzip `seFrOrderEntry.zip`, deploy the LWC bundle.
3. Drop `SE_FR — Order Entry` on an Account or Case record page.
4. Configure card title, currency, filters.

## Images produits (showcase)
Le tooltip du Cadencier lit `Product2.Image_URL__c`. Dans le showcase CCO FR, le champ, le permission set `CCO_FR_Product_Image` et la static resource `cpg_products` (15 packshots SVG) sont dans `_deploy/`, et `scripts/apex/seed-showcase-orders.apex` renseigne `Image_URL__c` (`/resource/cpg_products/<CODE>.svg`).
