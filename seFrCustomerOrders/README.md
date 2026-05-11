---
tagline: Last order detail card plus searchable, sortable, filterable order history for an Account or Contact.
categories: [Account 360°]
personas: [Sales, Telesales]
chips:
  - Last order detail card
  - Searchable + sortable
  - Status filter + 'View all'
dataMode: live
mobileReady: false
originalAuthor: Lionel Braun
keyProps:
  - Max rows
  - Filter by status / date range
  - "`productImageFieldApiName` · default `Image_URL__c`"
seBenefit: Renders product images per line — turns a plain list into a visual catalog reminiscent of an e-commerce order history. Compatible with SDO product image fields out of the box.
featured: false
releaseStatus: stable
status: active
screenshots: []
---

# seFrCustomerOrders (Customer Orders)

**B2B / B2C** — Lists the orders linked to an Account or a Contact. Two blocks:
1. **Last order** — full detail card of the most recent order (number, status, amount, effective date, line items with product images), inspired by `seFrOrderSummary` but **read-only** (no replace / delete / ERP submit — this panel is about history).
2. **Order history** — compact list of the previous orders with **Search** (by order number), **Sort**, optional **Status filter** and a **View all** link.

## Where to drop it
- **Target:** Lightning Record Page
- **Objects:** Account, Contact
- **App Builder label:** `SE FR - Customer Orders`

## What "linked to a customer" means
When placed on an **Account** page, the component shows `Order.AccountId = recordId`.

When placed on a **Contact** page, the component is exhaustive: the union of
- `BillToContactId = contactId`
- `ShipToContactId = contactId`
- `Contact__c = contactId` (only if the custom lookup exists on Order)
- `AccountId = contact.AccountId` (orders of the contact's account)

This way, a contact linked to a bakery's Account also sees the orders placed by the bakery itself, not just orders where the contact is named explicitly.

## Apex dependency
`SE_FR_CustomerOrdersController.getCustomerOrders(recordId, objectApiName, limitCount, statusFilter, sortBy, searchTerm, productImageFieldApiName)` — bundled here in `classes/`.

Returns:
```json
{
  "latest": { /* OrderDetail with line items */ },
  "history": [ /* OrderSummary[] excluding the latest */ ],
  "totalCount": 42
}
```

## Actions
- **New order** — opens the standard Order new form, pre-filling `AccountId` when we can resolve it (from the current Account page or from the latest order on Contact page).
- **Refresh** — re-runs the Apex wire.
- **Search** — case-insensitive substring match on `OrderNumber`.
- **Sort** — Date (new/old), Amount (high/low), Order number (A-Z / Z-A).
- **Status picker** — visible only when `statusFilter` is populated; lets the SE narrow the list on-page.
- **View all** — navigates to the Account's Orders related list on Account pages, or the Order object home on Contact pages. Hidden if we already show everything.

## Properties (App Builder)

| Name | Type | Default | Description |
|---|---|---|---|
| `language` | String | `en` | `en` or `fr`. |
| `cardTitle` | String | — | Override the dictionary default (`Orders` / `Commandes`). |
| `cardIcon` | String | `standard:orders` | |
| `historyLimit` | Integer | `10` | Server-side LIMIT (1–50). |
| `currencyCode` | String | `USD` | ISO 4217. |
| `localeTag` | String | `en-US` | Used for date formatting. |
| `statusFilter` | String | — | CSV whitelist of `Order.Status` values. When set, shows a status dropdown in the toolbar. |
| `defaultSort` | String | `EffectiveDate DESC` | Whitelisted. |
| `productImageFieldApiName` | String | `Image_URL__c` | Schema-safe. |
| `productImageFallbackUrl` | String | — | Used when the product field is empty / absent. |
| `hideNewOrderButton` | Boolean | `false` | |
| `hideViewAllLink` | Boolean | `false` | |

## Install
1. Deploy `classes/SE_FR_CustomerOrdersController.cls`.
2. Unzip `seFrCustomerOrders.zip`, deploy the LWC bundle.
3. Drop `SE FR - Customer Orders` on an Account or Contact record page.
4. Adjust the `historyLimit`, `statusFilter`, `defaultSort`, `language` in App Builder as needed.

## Data enrichment prerequisites
- On an **Account** page, any Order linked via `Order.AccountId` is picked up — no extra work needed if the Account already has orders.
- On a **Contact** page, the query unions `BillToContactId`, `ShipToContactId`, `Contact__c` (if the custom lookup exists on the org), and `AccountId = contact.AccountId`. If a Contact has no direct link and no parent Account with orders, the empty state shows the "Create the first order" CTA — intentional.
- For the **line-item detail** on the latest order card to show images, `Product2` records must have an image URL in the `Image_URL__c` field (or the field you configure via `productImageFieldApiName`). Fallback URL available through `productImageFallbackUrl` when none of the products carry an image.

## Known caveats
- On an **Account** page, the "View all" button uses the standard "Orders" related list. If the Account page layout hides that related list, the navigation still works — Salesforce routes to the related-object view.
- `Order.AccountNumber` and custom fields are not fetched by default. Use the standard Order page to see them.
- Product images rely on a `Product2.Image_URL__c`-style custom field. Configure `productImageFieldApiName` or `productImageFallbackUrl` for your data model.
