/**
 * Backing controller for seFrVisitRestockOrder.
 *
 * Context: on the Visit record page, the SE goes through seFrVisitProductCheck and marks
 * products as "oos" (out of shelf). That component publishes the list of ruptures to
 * localStorage. seFrVisitRestockOrder reads it and offers a one-click "convert ruptures
 * into a Draft Order on the Visit's Account" workflow.
 *
 * This controller:
 *   - resolves product metadata (list price, standard-pricebook entry) for a given list
 *     of productIds — so the LWC can prefill a quantity/price grid.
 *   - creates an Order + OrderItems in Draft, linked to the Visit's Account__c, and
 *     returns the new Order Id to let the LWC navigate to it.
 *
 * Idempotency: each call creates a new Draft Order. The LWC is responsible for guarding
 * double-clicks.
 */
public with sharing class SE_FR_VisitRestockOrderController {

    // ----------------------- DTOs -----------------------

    public class RestockProduct {
        @AuraEnabled public Id productId;
        @AuraEnabled public String name;
        @AuraEnabled public String productCode;
        @AuraEnabled public Decimal listPrice;
        @AuraEnabled public Id pricebookEntryId;
        @AuraEnabled public String currencyIsoCode;
        @AuraEnabled public String imageUrl;        // optional, pulled from Product2.Image_URL__c if present
    }

    public class RestockLine {
        @AuraEnabled public Id productId;
        @AuraEnabled public Decimal quantity;
        @AuraEnabled public Decimal unitPrice;
    }

    public class RestockResult {
        @AuraEnabled public Id orderId;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public Integer linesCreated;
    }

    public class VisitContext {
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public Id visitId;   // the Visit whose ruptures are read (latest one when launched from an Account)
    }

    // ----------------------- Visit → Account resolution -----------------------

    /** Accepts a Visit__c Id (Visit record page) or an Account Id (Account record page). */
    @AuraEnabled(cacheable=true)
    public static VisitContext getVisitContext(Id visitId) {
        VisitContext ctx = new VisitContext();
        if (visitId == null) return ctx;
        if (visitId.getSObjectType() == Schema.Account.SObjectType) {
            Account a = [SELECT Id, Name FROM Account WHERE Id = :visitId LIMIT 1];
            ctx.accountId = a.Id;
            ctx.accountName = a.Name;
            if (Schema.getGlobalDescribe().containsKey('Visit__c')) {
                List<SObject> latest = Database.query(
                    'SELECT Id FROM Visit__c WHERE Account__c = :visitId ORDER BY PlannedStartDateTime__c DESC NULLS LAST LIMIT 1'
                );
                if (!latest.isEmpty()) ctx.visitId = (Id) latest[0].get('Id');
            }
            return ctx;
        }
        if (!Schema.getGlobalDescribe().containsKey('Visit__c')) return ctx;
        List<SObject> rows = Database.query(
            'SELECT Account__c, Account__r.Name FROM Visit__c WHERE Id = :visitId LIMIT 1'
        );
        if (rows.isEmpty()) return ctx;
        ctx.visitId = visitId;
        ctx.accountId = (Id) rows[0].get('Account__c');
        SObject accRef = (SObject) rows[0].getSObject('Account__r');
        if (accRef != null) ctx.accountName = (String) accRef.get('Name');
        return ctx;
    }

    // ----------------------- Product metadata -----------------------

    /**
     * Returns {name, code, listPrice, pricebookEntryId} for each requested product on the
     * standard pricebook. Products without an active standard-pricebook entry are skipped.
     *
     * Schema-safe for Image_URL__c (included only if the field exists in the org).
     */
    @AuraEnabled(cacheable=true)
    public static List<RestockProduct> getRestockProducts(List<Id> productIds) {
        List<RestockProduct> out = new List<RestockProduct>();
        if (productIds == null || productIds.isEmpty()) return out;

        // Standard pricebook id — one per org.
        List<Pricebook2> stdPb = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
        if (stdPb.isEmpty()) return out;
        Id stdPbId = stdPb[0].Id;

        Boolean hasImage = Schema.SObjectType.Product2.fields.getMap().containsKey('image_url__c');
        Boolean multiCurrency = Schema.SObjectType.PricebookEntry.fields.getMap().containsKey('currencyisocode');

        // Pricebook entries on the standard pricebook, active, for the requested products.
        // CurrencyIsoCode only exists on multi-currency orgs — query conditionally.
        String pbeSoql = 'SELECT Id, Product2Id, UnitPrice'
                       + (multiCurrency ? ', CurrencyIsoCode' : '')
                       + ' FROM PricebookEntry WHERE Pricebook2Id = :stdPbId'
                       + ' AND Product2Id IN :productIds AND IsActive = true';
        Map<Id, PricebookEntry> pbeByProduct = new Map<Id, PricebookEntry>();
        for (PricebookEntry pbe : (List<PricebookEntry>) Database.query(pbeSoql)) {
            pbeByProduct.put(pbe.Product2Id, pbe);
        }

        String soql = 'SELECT Id, Name, ProductCode' + (hasImage ? ', Image_URL__c' : '')
                    + ' FROM Product2 WHERE Id IN :productIds';
        for (Product2 p : (List<Product2>) Database.query(soql)) {
            PricebookEntry pbe = pbeByProduct.get(p.Id);
            if (pbe == null) continue;      // no active price — skip, can't be ordered
            RestockProduct rp = new RestockProduct();
            rp.productId = p.Id;
            rp.name = p.Name;
            rp.productCode = p.ProductCode;
            rp.listPrice = pbe.UnitPrice;
            rp.pricebookEntryId = pbe.Id;
            if (multiCurrency) {
                Object iso = pbe.get('CurrencyIsoCode');
                rp.currencyIsoCode = iso == null ? null : String.valueOf(iso);
            }
            if (hasImage) {
                Object img = p.get('Image_URL__c');
                rp.imageUrl = img == null ? null : String.valueOf(img);
            }
            out.add(rp);
        }
        return out;
    }

    // ----------------------- Order creation -----------------------

    /**
     * Inserts an Order on the Visit's Account__c with the given lines. Status=Draft,
     * EffectiveDate=today. OrderItems created in a single DML for governor-limits safety.
     *
     * Throws AuraHandledException on bad input or missing standard pricebook.
     */
    @AuraEnabled
    public static RestockResult createRestockOrder(Id visitId, List<RestockLine> lines) {
        if (visitId == null) throw new AuraHandledException('Missing visitId.');
        if (lines == null || lines.isEmpty()) {
            throw new AuraHandledException('No rupture lines to convert into an order.');
        }

        VisitContext ctx = getVisitContext(visitId);
        if (ctx.accountId == null) {
            throw new AuraHandledException('The visit has no Account__c — cannot create an Order.');
        }

        // Standard pricebook — needed to attach the Order so Products can be added as OrderItems.
        List<Pricebook2> stdPb = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
        if (stdPb.isEmpty()) throw new AuraHandledException('No standard pricebook found in this org.');
        Id stdPbId = stdPb[0].Id;

        // Resolve PricebookEntries for all requested products in ONE query.
        Set<Id> productIds = new Set<Id>();
        for (RestockLine l : lines) if (l.productId != null) productIds.add(l.productId);

        Map<Id, PricebookEntry> pbeByProduct = new Map<Id, PricebookEntry>();
        for (PricebookEntry pbe : [
            SELECT Id, Product2Id, UnitPrice
            FROM PricebookEntry
            WHERE Pricebook2Id = :stdPbId
              AND Product2Id IN :productIds
              AND IsActive = true
        ]) {
            pbeByProduct.put(pbe.Product2Id, pbe);
        }

        Order ord = new Order();
        ord.AccountId = ctx.accountId;
        ord.Pricebook2Id = stdPbId;
        ord.EffectiveDate = Date.today();
        ord.Status = 'Draft';
        ord.Description = 'Réassort automatique suite au relevé produits'
            + (ctx.visitId != null ? ' (visite ' + ctx.visitId + ')' : '') + '.';
        // Optional lookup to Visit__c if the custom field exists.
        if (ctx.visitId != null && Schema.SObjectType.Order.fields.getMap().containsKey('visit__c')) {
            ord.put('Visit__c', ctx.visitId);
        }
        insert ord;

        List<OrderItem> items = new List<OrderItem>();
        for (RestockLine l : lines) {
            PricebookEntry pbe = pbeByProduct.get(l.productId);
            if (pbe == null) continue;
            Decimal q = l.quantity == null || l.quantity <= 0 ? 1 : l.quantity;
            Decimal up = l.unitPrice == null || l.unitPrice < 0 ? pbe.UnitPrice : l.unitPrice;
            items.add(new OrderItem(
                OrderId = ord.Id,
                PricebookEntryId = pbe.Id,
                Product2Id = l.productId,
                Quantity = q,
                UnitPrice = up
            ));
        }
        if (!items.isEmpty()) insert items;

        // Fetch the OrderNumber so the LWC can display it in the toast.
        Order fresh = [SELECT OrderNumber FROM Order WHERE Id = :ord.Id LIMIT 1];

        RestockResult res = new RestockResult();
        res.orderId = ord.Id;
        res.orderNumber = fresh.OrderNumber;
        res.linesCreated = items.size();
        return res;
    }
}
