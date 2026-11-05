---
tagline: Turns out-of-stock products found during the shelf survey into a Draft restock Order in one click.
categories: [Sales]
personas: [Sales, Field]
chips:
  - Ruptures → Draft Order
  - Suggested quantities
  - One click
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Default quantity per rupture
  - Include price-alert products
  - Currency / locale
seBenefit: Closes the loop of a store visit — the ruptures spotted during the product survey become an order on the visit's account without re-typing.
featured: false
releaseStatus: new
status: active
screenshots: []
---

# seFrVisitRestockOrder (Restock Order from ruptures)

Reads the out-of-stock products flagged by `seFrVisitProductCheck`, suggests a quantity per line, and creates an Order (Draft) + OrderItems on the visit's Account.

## Where to drop it
- **Target:** Lightning Record Page — `Visit__c`
- **App Builder label:** `CCO FR - Réassort auto (ruptures relevé)`

## Apex dependency
`SE_FR_VisitRestockOrderController` — `getVisitContext`, `getRestockProducts`, `createRestockOrder` (bundled in `classes/`). Requires an active standard-pricebook entry per product.

## Properties
| Name | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `fr` or `en` |
| `defaultQuantity` | Integer | `6` | Prefilled quantity per rupture |
| `includePriceAlerts` | Boolean | `false` | Also list products with an abnormal observed price |
| `currencySymbol` / `localeTag` | String | `€` / `fr-FR` | Formatting |
