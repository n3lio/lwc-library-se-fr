/**
 * Backing controller for the CCO FR - Visit Product Check LWC.
 * READ-ONLY: no DML. Lists active products from the Standard Pricebook so a sales rep
 * can run an in-store product audit (presence / out-of-stock / observed price).
 *
 * Image resolution order (no CSP needed):
 *   1. Latest Files (ContentDocumentLink) attached to Product2 → /sfc/servlet.shepherd/version/download/<ContentVersionId>
 *   2. Product2.DisplayUrl (if set — e.g. a Static Resource path or an internal path)
 *   3. Null (LWC renders initial fallback)
 *
 * Fallback strategy for the catalog :
 *   1. Standard Pricebook (Pricebook2.IsStandard = true) PricebookEntry WHERE IsActive = true
 *   2. If no standard pricebook (unlikely), any active Product2.
 */
public with sharing class SE_FR_ProductCheckController {

    public class ProductDto {
        @AuraEnabled public Id productId;
        @AuraEnabled public Id pricebookEntryId;
        @AuraEnabled public String name;
        @AuraEnabled public String productCode;
        @AuraEnabled public String family;
        @AuraEnabled public Decimal unitPrice;
        @AuraEnabled public String currencyIsoCode;
        @AuraEnabled public String imageUrl;
    }

    @AuraEnabled(cacheable=true)
    public static List<ProductDto> getProducts(Id recordId, Integer maxCount) {
        List<ProductDto> out = new List<ProductDto>();
        Integer limitCount = (maxCount == null || maxCount <= 0) ? 15 : Math.min(maxCount, 50);

        // Try Standard Pricebook first.
        List<Pricebook2> stdPb = [
            SELECT Id FROM Pricebook2 WHERE IsStandard = true WITH USER_MODE LIMIT 1
        ];
        if (!stdPb.isEmpty()) {
            Id stdPbId = stdPb[0].Id;
            for (PricebookEntry pe : [
                SELECT Id, UnitPrice,
                       Product2Id, Product2.Name, Product2.ProductCode, Product2.Family,
                       Product2.DisplayUrl
                FROM PricebookEntry
                WHERE Pricebook2Id = :stdPbId
                  AND IsActive = true
                  AND Product2.IsActive = true
                WITH USER_MODE
                ORDER BY Product2.Name ASC
                LIMIT :limitCount
            ]) {
                ProductDto d = new ProductDto();
                d.productId = pe.Product2Id;
                d.pricebookEntryId = pe.Id;
                d.name = pe.Product2.Name;
                d.productCode = pe.Product2.ProductCode;
                d.family = pe.Product2.Family;
                d.unitPrice = pe.UnitPrice;
                d.currencyIsoCode = null;
                d.imageUrl = pe.Product2.DisplayUrl;
                out.add(d);
            }
        }

        // Fallback — no standard pricebook or no entries.
        if (out.isEmpty()) {
            for (Product2 p : [
                SELECT Id, Name, ProductCode, Family, DisplayUrl
                FROM Product2
                WHERE IsActive = true
                WITH USER_MODE
                ORDER BY Name ASC
                LIMIT :limitCount
            ]) {
                ProductDto d = new ProductDto();
                d.productId = p.Id;
                d.pricebookEntryId = null;
                d.name = p.Name;
                d.productCode = p.ProductCode;
                d.family = p.Family;
                d.unitPrice = null;
                d.currencyIsoCode = null;
                d.imageUrl = p.DisplayUrl;
                out.add(d);
            }
        }

        // Product2.Image_URL__c (static resource / external URL) wins over DisplayUrl when present.
        if (!out.isEmpty() && Schema.SObjectType.Product2.fields.getMap().containsKey('image_url__c')) {
            Set<Id> imgIds = new Set<Id>();
            for (ProductDto d : out) imgIds.add(d.productId);
            Map<Id, Product2> withImg = new Map<Id, Product2>((List<Product2>) Database.query(
                'SELECT Id, Image_URL__c FROM Product2 WHERE Id IN :imgIds'));
            for (ProductDto d : out) {
                Product2 p2 = withImg.get(d.productId);
                Object u = p2 == null ? null : p2.get('Image_URL__c');
                if (u != null && String.valueOf(u) != '') d.imageUrl = String.valueOf(u);
            }
        }

        // Overlay Files-based image URLs for any product that has an attached ContentDocument.
        // No CSP needed: served from the Salesforce domain via Shepherd.
        if (!out.isEmpty()) {
            Set<Id> productIds = new Set<Id>();
            for (ProductDto d : out) productIds.add(d.productId);

            // Pull latest ContentDocumentLinks for these products.
            Map<Id, Id> productToVersionId = new Map<Id, Id>();
            // Query latest-version per product: ContentDocument.LatestPublishedVersionId
            for (ContentDocumentLink cdl : [
                SELECT LinkedEntityId, ContentDocument.LatestPublishedVersionId, ContentDocument.CreatedDate
                FROM ContentDocumentLink
                WHERE LinkedEntityId IN :productIds
                WITH USER_MODE
                ORDER BY ContentDocument.CreatedDate DESC
            ]) {
                // First-wins (most recent). Skip if already set.
                if (!productToVersionId.containsKey(cdl.LinkedEntityId) && cdl.ContentDocument.LatestPublishedVersionId != null) {
                    productToVersionId.put(cdl.LinkedEntityId, cdl.ContentDocument.LatestPublishedVersionId);
                }
            }

            if (!productToVersionId.isEmpty()) {
                for (ProductDto d : out) {
                    Id versionId = productToVersionId.get(d.productId);
                    if (versionId != null) {
                        // Shepherd URL — authenticated, no CSP, serves original binary.
                        d.imageUrl = '/sfc/servlet.shepherd/version/download/' + versionId;
                    }
                }
            }
        }

        return out;
    }
}
