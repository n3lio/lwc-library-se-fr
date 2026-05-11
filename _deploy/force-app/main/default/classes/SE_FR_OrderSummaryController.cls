public with sharing class SE_FR_OrderSummaryController {

    @AuraEnabled(cacheable=true)
    public static OrderData getOrderDetailsFromCase(Id caseId) {
        return getOrderDetailsFromCaseWithImageField(caseId, 'Image_URL__c');
    }

    @AuraEnabled(cacheable=true)
    public static OrderData getOrderDetailsFromCaseWithImageField(Id caseId, String productImageFieldApiName) {
        Map<String, Schema.SObjectField> productFields = Schema.SObjectType.Product2.fields.getMap();
        String imageField = String.isNotBlank(productImageFieldApiName) ? productImageFieldApiName : 'Image_URL__c';
        Boolean hasProductImage = productFields.containsKey(imageField.toLowerCase());

        // 1. Find the Account linked to this Case, directly or through the Contact.
        List<Case> cases = [
            SELECT Id, AccountId, ContactId, Contact.AccountId, Comments,
                   Account.ShippingStreet, Account.ShippingCity, Account.ShippingPostalCode, Account.ShippingCountry
            FROM Case
            WHERE Id = :caseId
            LIMIT 1
        ];
        if (cases.isEmpty()) return null;
        Case currentCase = cases[0];

        Id resolvedAccountId = currentCase.AccountId;
        if (resolvedAccountId == null && currentCase.Contact != null) {
            resolvedAccountId = currentCase.Contact.AccountId;
        }
        if (resolvedAccountId == null) return null;

        // 2. Get the most recent Order for that Account.
        List<Order> orders = [
            SELECT Id, OrderNumber, Name, TotalAmount, toLabel(Status), EndDate,
                   Account.ShippingStreet, Account.ShippingCity, Account.ShippingPostalCode, Account.ShippingCountry
            FROM Order
            WHERE AccountId = :resolvedAccountId
            ORDER BY EffectiveDate DESC NULLS LAST, CreatedDate DESC
            LIMIT 1
        ];
        if (orders.isEmpty()) return null;
        Order ord = orders[0];

        // 3. Format the shipping address from whatever is available (Case.Account first, Order.Account fallback).
        String street = currentCase.Account != null && currentCase.Account.ShippingStreet != null
            ? currentCase.Account.ShippingStreet
            : (ord.Account != null && ord.Account.ShippingStreet != null ? ord.Account.ShippingStreet : '');
        String zip = currentCase.Account != null && currentCase.Account.ShippingPostalCode != null
            ? currentCase.Account.ShippingPostalCode
            : (ord.Account != null && ord.Account.ShippingPostalCode != null ? ord.Account.ShippingPostalCode : '');
        String city = currentCase.Account != null && currentCase.Account.ShippingCity != null
            ? currentCase.Account.ShippingCity
            : (ord.Account != null && ord.Account.ShippingCity != null ? ord.Account.ShippingCity : '');
        String addr = (String.isNotBlank(street) ? street + ', ' : '')
            + (String.isNotBlank(zip) ? zip + ' ' : '')
            + (String.isNotBlank(city) ? city : '');

        // 4. Load the order products.
        String itemsQuery = 'SELECT Id, Quantity, UnitPrice, TotalPrice, Product2.Name, Product2.ProductCode';
        if (hasProductImage) itemsQuery += ', Product2.' + imageField;
        itemsQuery += ' FROM OrderItem WHERE OrderId = :orderId';
        Id orderId = ord.Id;
        List<OrderItem> items = Database.query(itemsQuery);

        OrderData data = new OrderData();
        data.orderId = ord.Id;
        data.orderNumber = ord.OrderNumber;
        data.orderName = ord.Name;
        data.totalAmount = ord.TotalAmount;
        data.status = ord.Status;
        data.deliveryDate = ord.EndDate;
        data.deliveryNote = currentCase.Comments;
        data.accountAddress = addr;
        data.itemCount = items.size();
        data.products = items;

        return data;
    }

    @AuraEnabled(cacheable=true)
    public static OrderData getOrderDetailsById(Id orderId, Id caseId) {
        return getOrderDetailsByIdWithImageField(orderId, caseId, 'Image_URL__c');
    }

    @AuraEnabled(cacheable=true)
    public static OrderData getOrderDetailsByIdWithImageField(Id orderId, Id caseId, String productImageFieldApiName) {
        Map<String, Schema.SObjectField> productFields = Schema.SObjectType.Product2.fields.getMap();
        String imageField = String.isNotBlank(productImageFieldApiName) ? productImageFieldApiName : 'Image_URL__c';
        Boolean hasProductImage = productFields.containsKey(imageField.toLowerCase());

        List<Order> orders = [
            SELECT Id, OrderNumber, Name, TotalAmount, toLabel(Status), EndDate,
                   Account.ShippingStreet, Account.ShippingCity, Account.ShippingPostalCode, Account.ShippingCountry
            FROM Order
            WHERE Id = :orderId
            LIMIT 1
        ];
        if (orders.isEmpty()) return null;
        Order ord = orders[0];

        String noteFromCase = null;
        if (caseId != null) {
            List<Case> caseList = [SELECT Id, Comments FROM Case WHERE Id = :caseId LIMIT 1];
            if (!caseList.isEmpty()) noteFromCase = caseList[0].Comments;
        }

        String street = ord.Account != null && ord.Account.ShippingStreet != null ? ord.Account.ShippingStreet : '';
        String zip = ord.Account != null && ord.Account.ShippingPostalCode != null ? ord.Account.ShippingPostalCode : '';
        String city = ord.Account != null && ord.Account.ShippingCity != null ? ord.Account.ShippingCity : '';
        String addr = (String.isNotBlank(street) ? street + ', ' : '')
            + (String.isNotBlank(zip) ? zip + ' ' : '')
            + (String.isNotBlank(city) ? city : '');

        String itemsQuery = 'SELECT Id, Quantity, UnitPrice, TotalPrice, Product2.Name, Product2.ProductCode';
        if (hasProductImage) itemsQuery += ', Product2.' + imageField;
        itemsQuery += ' FROM OrderItem WHERE OrderId = :orderId';
        List<OrderItem> items = Database.query(itemsQuery);

        OrderData data = new OrderData();
        data.orderId = ord.Id;
        data.orderNumber = ord.OrderNumber;
        data.orderName = ord.Name;
        data.totalAmount = ord.TotalAmount;
        data.status = ord.Status;
        data.deliveryDate = ord.EndDate;
        data.deliveryNote = noteFromCase;
        data.accountAddress = addr;
        data.itemCount = items.size();
        data.products = items;

        return data;
    }

    @AuraEnabled
    public static void submitOrderToERP(Id orderId, Id caseId, String milestoneId) {
        // milestoneId parameter kept for backwards-compat; EntityMilestone logic intentionally omitted to stay generic.
        update new Order(Id = orderId, Status = 'Activated');
    }

    @AuraEnabled
    public static void saveDeliveryDetails(Id orderId, Id caseId, Date deliveryDate, String noteLivreur) {
        update new Order(Id = orderId, EndDate = deliveryDate);
        update new Case(Id = caseId, Comments = noteLivreur);
    }

    @AuraEnabled
    public static void deleteOrderRecord(Id orderId) {
        delete new Order(Id = orderId);
    }

    public class OrderData {
        @AuraEnabled public String orderId;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public String orderName;
        @AuraEnabled public Decimal totalAmount;
        @AuraEnabled public String status;
        @AuraEnabled public Date deliveryDate;
        @AuraEnabled public String deliveryNote;
        @AuraEnabled public String accountAddress;
        @AuraEnabled public Integer itemCount;
        @AuraEnabled public List<OrderItem> products;
    }
}
