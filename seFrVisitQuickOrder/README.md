---
tagline: Visual product catalogue with contextual recommendations (out-of-stock, missing products, low shelf share) and a cart with line + global discount.
categories: [Retail Execution]
personas: [Sales, FieldSales, Retail]
chips:
  - Visual catalogue
  - Contextual recommendations
  - Cart with discounts
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Brand name (badges & recos)
  - "`seedProductsJson` · override the built-in CPG catalogue"
  - Currency symbol
seBenefit: Visual alternative to the fast-entry order pad — surfaces what to push during a store visit, based on what the visit just revealed.
featured: false
releaseStatus: new
status: active
screenshots: []
---

# seFrVisitQuickOrder (Quick Order — visual catalogue)

Visual order-taking component for a retail visit. Shows a product catalogue with images and badges, recommendations derived from the visit survey (out-of-stock products, missing references, low shelf share), and a cart with per-line and global discount.

## Where to drop it
- **Target:** Lightning Record Page (Visit__c, Account) and App Page
- **App Builder label:** `CCO FR - Commande rapide (catalogue visuel)`

## Apex dependencies
None. Without `seedProductsJson` it uses a generic CPG catalogue.

## Properties
| Name | Type | Default | Description |
|---|---|---|---|
| `language` | String | `fr` | `fr` or `en` |
| `cardTitle` / `cardIcon` | String | — / `standard:order_item` | Header overrides |
| `brandName` | String | `Ma marque` | Brand used for badges and recommendations |
| `currencySymbol` | String | `€` | |
| `seedProductsJson` | String | *(generic CPG)* | JSON array `{ id, code, name, family, price, imageUrl, stock, badge? }` |
