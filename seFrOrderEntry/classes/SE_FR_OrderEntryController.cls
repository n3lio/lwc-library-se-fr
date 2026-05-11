public with sharing class SE_FR_OrderEntryController {

    public class ProductWrapper {
        @AuraEnabled public Id productId;
        @AuraEnabled public String category;
        @AuraEnabled public String family;
        @AuraEnabled public String productCode;
        @AuraEnabled public String name;
        @AuraEnabled public String description;
        @AuraEnabled public Decimal unitPrice;
        @AuraEnabled public Integer stock;
        @AuraEnabled public Date lastOrderDate;

        @AuraEnabled public Integer recommendedQty;
        @AuraEnabled public Decimal recommendedDiscount;
        @AuraEnabled public String aiReason;

        @AuraEnabled public Integer lastOrderQty;
        @AuraEnabled public Decimal lastOrderDiscount;

        @AuraEnabled public Decimal maxDiscount;
        @AuraEnabled public String rowStatus;
        @AuraEnabled public String imageUrl;
    }

    @AuraEnabled(cacheable=true)
    public static List<ProductWrapper> getProductsList(Id accountId, Integer limitSize, String filter1, String filter2, String filter3, String filter4, String filter5) {
        return getProductsListWithImageField(accountId, limitSize, filter1, filter2, filter3, filter4, filter5, 'Image_URL__c', null);
    }

    @AuraEnabled(cacheable=true)
    public static List<ProductWrapper> getProductsListWithImageField(Id accountId, Integer limitSize, String filter1, String filter2, String filter3, String filter4, String filter5, String productImageFieldApiName, String productImageFallbackUrl) {
        return getProductsListFull(accountId, limitSize, filter1, filter2, filter3, filter4, filter5, productImageFieldApiName, productImageFallbackUrl, null, null);
    }

    // Default AI reason pools (used when the SE doesn't override via aiReasonsCsv). Keyed by
    // rowStatus so each status can draw from its own narrative pool.
    private static final Map<String, List<String>> AI_REASONS_EN = new Map<String, List<String>>{
        'recent'    => new List<String>{
            'Trend: stock-out expected within 5 days based on consumption history. Early restock suggested.',
            'Usage up 15% this quarter — recommend increasing order size.',
            'Repeat purchase pattern detected; align next order with forecast.'
        },
        'old'       => new List<String>{
            'Win-back: item not ordered in 4 months. Discount suggested to re-engage.',
            'Churn risk detected on this line — propose a small trial pack.',
            'Competitor product may have displaced this item. Discount recommended.'
        },
        'oos'       => new List<String>{ 'Out of stock. Suggest alternative SKU.' },
        'promo'     => new List<String>{
            'Opportunity: flagship item promoted this month. Strong margin and ample stock available.',
            'High-margin product with a promotional price this month.',
            'Vendor rebate in effect — good moment to push volume.'
        },
        'clearance' => new List<String>{
            'Clearance: high discount authorized to clear regional stock.',
            'End-of-life SKU — offer aggressive discount to rotate inventory.',
            'Regional overstock. Discount approved to reduce inventory pressure.'
        }
    };
    private static final Map<String, List<String>> AI_REASONS_FR = new Map<String, List<String>>{
        'recent'    => new List<String>{
            'Tendance : rupture attendue sous 5 jours selon la consommation. Réapprovisionnement anticipé recommandé.',
            'Consommation +15 % ce trimestre — augmenter la quantité commandée.',
            'Schéma de réachat détecté ; aligner la prochaine commande sur la prévision.'
        },
        'old'       => new List<String>{
            'Win-back : article non commandé depuis 4 mois. Remise suggérée pour relancer.',
            'Risque de churn sur cette ligne — proposer un pack d\'essai.',
            'Produit concurrent possiblement adopté. Remise recommandée.'
        },
        'oos'       => new List<String>{ 'Rupture de stock. Proposer un SKU de substitution.' },
        'promo'     => new List<String>{
            'Opportunité : produit phare en promotion ce mois-ci. Marge élevée et stock suffisant.',
            'Produit à forte marge avec prix promotionnel ce mois-ci.',
            'Remise fournisseur active — bon moment pour pousser le volume.'
        },
        'clearance' => new List<String>{
            'Déstockage : remise élevée autorisée pour écouler le stock régional.',
            'SKU en fin de vie — remise agressive pour rotation.',
            'Surstock régional. Remise approuvée pour réduire la pression sur l\'inventaire.'
        }
    };

    /**
     * Full signature — called by the LWC. The optional aiReasonsCsv overrides the built-in
     * bilingual reason pools with one message per row ('<rowStatus>|<message>', comma-separated).
     * The language parameter picks the default pool when no override is provided.
     *
     * Stock / qty / discount ranges are widened (deterministically by Id hash) so each product
     * tile shows a plausible but unique set of numbers rather than a 6-value loop.
     */
    @AuraEnabled(cacheable=true)
    public static List<ProductWrapper> getProductsListFull(Id accountId, Integer limitSize, String filter1, String filter2, String filter3, String filter4, String filter5, String productImageFieldApiName, String productImageFallbackUrl, String aiReasonsCsv, String language) {
        List<ProductWrapper> wrappers = new List<ProductWrapper>();

        Map<String, Schema.SObjectField> productFields = Schema.SObjectType.Product2.fields.getMap();
        String imageField = String.isNotBlank(productImageFieldApiName) ? productImageFieldApiName : 'Image_URL__c';
        Boolean hasImageUrl = productFields.containsKey(imageField.toLowerCase());

        String query = 'SELECT Id, Name, ProductCode, Family, Description';
        if (hasImageUrl) query += ', ' + imageField;
        query += ' FROM Product2 WHERE IsActive = true';

        List<String> validFilters = new List<String>();
        if (String.isNotBlank(filter1)) validFilters.add(filter1);
        if (String.isNotBlank(filter2)) validFilters.add(filter2);
        if (String.isNotBlank(filter3)) validFilters.add(filter3);
        if (String.isNotBlank(filter4)) validFilters.add(filter4);
        if (String.isNotBlank(filter5)) validFilters.add(filter5);

        for (String filter : validFilters) { query += ' AND (' + filter + ')'; }

        Integer safeLimit = (limitSize != null && limitSize > 0) ? limitSize : 25;
        query += ' LIMIT ' + safeLimit;

        Map<Id, Product2> productsMap = new Map<Id, Product2>((List<Product2>) Database.query(query));

        Map<Id, String> productImagesMap = new Map<Id, String>();
        try {
            if (!productsMap.isEmpty()) {
                String mediaQuery = 'SELECT ProductId, URI FROM ProductMedia WHERE ProductId IN :productIds';
                Set<Id> productIds = productsMap.keySet();
                for (SObject pm : Database.query(mediaQuery)) {
                    productImagesMap.put((Id)pm.get('ProductId'), (String)pm.get('URI'));
                }
            }
        } catch (Exception e) {
            System.debug('ProductMedia not available');
        }

        // Parse optional override pool: '<rowStatus>|<message>,<rowStatus>|<message>…'. Collected
        // by status so each row picks a reason of its own status pseudo-randomly.
        Map<String, List<String>> overridePool = new Map<String, List<String>>();
        if (String.isNotBlank(aiReasonsCsv)) {
            for (String entry : aiReasonsCsv.split(',')) {
                List<String> parts = entry.split('\\|');
                if (parts.size() == 2) {
                    String status = parts[0].trim();
                    String msg = parts[1].trim();
                    if (!overridePool.containsKey(status)) overridePool.put(status, new List<String>());
                    overridePool.get(status).add(msg);
                }
            }
        }
        Map<String, List<String>> defaultPool = (language == 'en') ? AI_REASONS_EN : AI_REASONS_FR;

        Integer index = 0;
        for (Product2 prod : productsMap.values()) {
            ProductWrapper pw = new ProductWrapper();
            pw.productId = prod.Id;
            pw.category = String.isNotBlank(prod.Family) ? prod.Family : 'Uncategorized';
            pw.family = prod.Family;
            pw.productCode = prod.ProductCode;
            pw.name = prod.Name;
            pw.description = prod.Description;

            // Deterministic per-row seeds from the Salesforce Id so values stay stable across
            // refreshes but look varied between rows (no more 6-value loop).
            Integer h = Math.abs(prod.Id.hashCode());
            Integer seedA = Math.mod(h, 97);
            Integer seedB = Math.mod(h / 97, 97);
            Integer seedC = Math.mod(h / 9409, 97);

            pw.unitPrice = 8.50 + Math.mod(h, 11500) / 100.0;   // 8.50 -> ~123.50

            Integer statusMod = Math.mod(index, 5);
            pw.recommendedQty = 0; pw.recommendedDiscount = 0.0; pw.aiReason = '';

            if (statusMod == 0) {
                pw.rowStatus = 'recent';
                pw.lastOrderDate = Date.today().addDays(-(5 + Math.mod(seedA, 25)));          // 5-29 days
                pw.stock = 80 + Math.mod(seedA * 3, 180);                                     // 80-259
                pw.maxDiscount = 10 + Math.mod(seedB, 10);                                    // 10-19
                pw.lastOrderQty = 4 + Math.mod(seedB, 12);                                    // 4-15
                pw.lastOrderDiscount = 0.0;
                if (Math.mod(seedC, 2) == 0) {
                    pw.recommendedQty = pw.lastOrderQty + 2 + Math.mod(seedC, 10);            // slight uplift
                    pw.recommendedDiscount = 3 + Math.mod(seedC, 8);                          // 3-10%
                }
            } else if (statusMod == 1) {
                pw.rowStatus = 'old';
                pw.lastOrderDate = Date.today().addDays(-(90 + Math.mod(seedA, 120)));         // 90-209 days
                pw.stock = 20 + Math.mod(seedB * 5, 150);                                      // 20-169
                pw.maxDiscount = 15 + Math.mod(seedC, 10);                                     // 15-24
                pw.lastOrderQty = 2 + Math.mod(seedC, 10);                                     // 2-11
                pw.lastOrderDiscount = 0.0;
                if (Math.mod(seedB, 3) == 0) {
                    pw.recommendedQty = 3 + Math.mod(seedB, 8);
                    pw.recommendedDiscount = 8 + Math.mod(seedC, 10);                          // 8-17%
                }
            } else if (statusMod == 2) {
                // OOS never changes: 0 stock forbids ordering.
                pw.rowStatus = 'oos';
                pw.stock = 0;
                pw.maxDiscount = 0.0;
                pw.lastOrderQty = 0;
                pw.lastOrderDiscount = 0.0;
            } else if (statusMod == 3) {
                pw.rowStatus = 'promo';
                pw.stock = 120 + Math.mod(seedA * 2, 280);                                     // 120-399
                pw.maxDiscount = 20 + Math.mod(seedB, 15);                                     // 20-34
                pw.lastOrderQty = 10 + Math.mod(seedC, 30);                                    // 10-39
                pw.lastOrderDiscount = Math.mod(seedB, 8);                                     // 0-7%
                pw.recommendedQty = pw.lastOrderQty * 2 + Math.mod(seedA, 20);                 // aggressive uplift
                pw.recommendedDiscount = 8 + Math.mod(seedC, 12);                              // 8-19%
            } else if (statusMod == 4) {
                pw.rowStatus = 'clearance';
                pw.stock = 3 + Math.mod(seedB, 28);                                            // 3-30
                pw.maxDiscount = 35 + Math.mod(seedC, 20);                                     // 35-54
                pw.lastOrderQty = 0;
                pw.lastOrderDiscount = 0.0;
                if (Math.mod(seedA, 2) != 0) {
                    pw.recommendedQty = Math.max(1, pw.stock - 2);                             // clear almost everything
                    pw.recommendedDiscount = 25 + Math.mod(seedC, 20);                         // 25-44%
                }
            }

            // Pick the AI reason from the override pool if provided, else from the language
            // default pool. Deterministic via seedA so a given product always shows the same reason.
            if (pw.recommendedQty > 0 || pw.rowStatus == 'promo') {
                List<String> pool = overridePool.containsKey(pw.rowStatus)
                    ? overridePool.get(pw.rowStatus)
                    : defaultPool.get(pw.rowStatus);
                if (pool != null && !pool.isEmpty()) {
                    pw.aiReason = pool[Math.mod(seedA, pool.size())];
                }
            }

            String customImageUrl = hasImageUrl ? (String)prod.get(imageField) : null;
            if (String.isNotBlank(customImageUrl)) {
                pw.imageUrl = customImageUrl;
            } else if (productImagesMap.containsKey(prod.Id)) {
                pw.imageUrl = productImagesMap.get(prod.Id);
            } else if (String.isNotBlank(productImageFallbackUrl)) {
                pw.imageUrl = productImageFallbackUrl;
            } else {
                pw.imageUrl = null;
            }

            wrappers.add(pw);
            index++;
        }
        return wrappers;
    }

    @AuraEnabled
    public static String createOrderFromGrid(Id accountId, String orderDataJSON, String deliveryDateString, Id caseId) {
        return createOrderFromGridWithChannel(accountId, orderDataJSON, deliveryDateString, caseId, null);
    }

    @AuraEnabled
    public static String createOrderFromGridWithChannel(Id accountId, String orderDataJSON, String deliveryDateString, Id caseId, Id salesChannelId) {
        try {
            List<Object> rawItems = (List<Object>) JSON.deserializeUntyped(orderDataJSON);
            List<Map<String, Object>> itemsToSave = new List<Map<String, Object>>();
            for (Object obj : rawItems) { itemsToSave.add((Map<String, Object>) obj); }
            if (itemsToSave.isEmpty()) return 'No items to save';

            Set<Id> productIds = new Set<Id>();
            for (Map<String, Object> item : itemsToSave) { productIds.add((Id) item.get('productId')); }

            List<PricebookEntry> pbes = [SELECT Id, Product2Id, Pricebook2Id FROM PricebookEntry WHERE Product2Id IN :productIds AND IsActive = true LIMIT 100];
            if (pbes.isEmpty()) throw new AuraHandledException('These products do not have active prices.');

            Id activePricebookId = pbes[0].Pricebook2Id;
            Map<Id, Id> productToPbeMap = new Map<Id, Id>();
            for (PricebookEntry pbe : pbes) {
                if (pbe.Pricebook2Id == activePricebookId) {
                    productToPbeMap.put(pbe.Product2Id, pbe.Id);
                }
            }

            Account acc = [SELECT Name, BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry,
                                  ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry
                           FROM Account WHERE Id = :accountId LIMIT 1];

            String formattedDate = Datetime.now().format('yyyy-MM-dd');
            Decimal totalOrderAmount = 0.0;

            List<OrderItem> orderItemsToInsert = new List<OrderItem>();

            Order newOrder = new Order(
                AccountId = accountId,
                EffectiveDate = Date.today(),
                Status = 'Draft',
                Pricebook2Id = activePricebookId,
                Name = 'Order for ' + acc.Name + ' on ' + formattedDate,
                BillingStreet = acc.BillingStreet, BillingCity = acc.BillingCity, BillingState = acc.BillingState, BillingPostalCode = acc.BillingPostalCode, BillingCountry = acc.BillingCountry,
                ShippingStreet = acc.ShippingStreet, ShippingCity = acc.ShippingCity, ShippingState = acc.ShippingState, ShippingPostalCode = acc.ShippingPostalCode, ShippingCountry = acc.ShippingCountry
            );

            if (salesChannelId != null) {
                newOrder.SalesChannelId = salesChannelId;
            }

            if (String.isNotBlank(deliveryDateString)) {
                newOrder.EndDate = Date.valueOf(deliveryDateString);
            }

            insert newOrder;

            for (Map<String, Object> item : itemsToSave) {
                Id prodId = (Id) item.get('productId');
                if (productToPbeMap.containsKey(prodId)) {
                    Decimal qty = Decimal.valueOf(String.valueOf(item.get('qty')));
                    Decimal netPrice = Decimal.valueOf(String.valueOf(item.get('netPrice')));
                    totalOrderAmount += (qty * netPrice);

                    OrderItem oi = new OrderItem(
                        OrderId = newOrder.Id,
                        PricebookEntryId = productToPbeMap.get(prodId),
                        Quantity = qty,
                        UnitPrice = netPrice
                    );
                    orderItemsToInsert.add(oi);
                }
            }

            if (!orderItemsToInsert.isEmpty()) { insert orderItemsToInsert; }

            newOrder.Description = 'Items: ' + itemsToSave.size()
                + '\nTotal: ' + totalOrderAmount.setScale(2);
            update newOrder;

            return newOrder.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Error creating order: ' + e.getMessage());
        }
    }
}
