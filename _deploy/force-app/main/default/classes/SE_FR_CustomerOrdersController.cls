public with sharing class SE_FR_CustomerOrdersController {

    // ----------------------- Public entry point -----------------------

    /**
     * Returns the orders linked to a customer (Account or Contact).
     *
     * For an Account: all Orders where Order.AccountId = recordId.
     * For a Contact: union of
     *   - Orders where BillToContactId = recordId
     *   - Orders where ShipToContactId = recordId
     *   - Orders where Contact__c = recordId (custom lookup — included only if present on the org)
     *   - Orders where AccountId = contact.AccountId
     *
     * @param recordId                 The current record Id (Account or Contact).
     * @param objectApiName            'Account' or 'Contact'.
     * @param limitCount               LIMIT clamp for the history list (default 10, max 50).
     * @param statusFilter             Optional Order.Status whitelist (comma-separated). Empty = all statuses.
     * @param sortBy                   'EffectiveDate DESC' (default) | 'EffectiveDate ASC' | 'TotalAmount DESC' | 'TotalAmount ASC' | 'OrderNumber ASC' | 'OrderNumber DESC'.
     * @param searchTerm               Optional — case-insensitive substring match on OrderNumber.
     * @param productImageFieldApiName Field on Product2 holding the image URL (schema-safe).
     */
    @AuraEnabled(cacheable=true)
    public static CustomerOrdersResult getCustomerOrders(
        Id recordId,
        String objectApiName,
        Integer limitCount,
        String statusFilter,
        String sortBy,
        String searchTerm,
        String productImageFieldApiName
    ) {
        if (recordId == null || String.isBlank(objectApiName)) return null;

        Integer rows = (limitCount == null || limitCount <= 0) ? 10 : Math.min(limitCount, 50);

        // Whitelist the ORDER BY to block SOQL injection
        Set<String> allowedSorts = new Set<String>{
            'EffectiveDate DESC', 'EffectiveDate ASC',
            'TotalAmount DESC', 'TotalAmount ASC',
            'OrderNumber ASC', 'OrderNumber DESC'
        };
        String safeSort = allowedSorts.contains(sortBy) ? sortBy : 'EffectiveDate DESC NULLS LAST, CreatedDate DESC';

        // Parse status filter CSV
        List<String> statuses = new List<String>();
        if (String.isNotBlank(statusFilter)) {
            for (String s : statusFilter.split(',')) {
                String v = s.trim();
                if (String.isNotBlank(v)) statuses.add(v);
            }
        }

        // Build WHERE clause based on object context
        String whereClause = buildWhereClause(recordId, objectApiName);
        if (String.isBlank(whereClause)) return new CustomerOrdersResult();

        String searchClause = '';
        String likeValue = null;
        if (String.isNotBlank(searchTerm)) {
            likeValue = '%' + String.escapeSingleQuotes(searchTerm.trim()) + '%';
            searchClause = ' AND OrderNumber LIKE :likeValue';
        }

        String statusClause = statuses.isEmpty() ? '' : ' AND Status IN :statuses';

        // Keep Status raw (picklist value, e.g. 'Draft', 'Activated') — the LWC maps it to a label / colour.
        String baseSelect = 'SELECT Id, OrderNumber, Name, TotalAmount, Status, EffectiveDate, EndDate, AccountId, Account.Name, BillToContactId, BillToContact.Name';

        // 1. Fetch the LATEST order (most recent by EffectiveDate) with full details for the header card.
        String latestQuery = baseSelect + ' FROM Order WHERE ' + whereClause + statusClause + searchClause
            + ' ORDER BY EffectiveDate DESC NULLS LAST, CreatedDate DESC LIMIT 1';
        List<Order> latestList = Database.query(latestQuery);
        Order latest = latestList.isEmpty() ? null : latestList[0];

        // 2. Fetch the history (ordered according to the requested sort; excludes the latest).
        String historyQuery = baseSelect + ' FROM Order WHERE ' + whereClause + statusClause + searchClause;
        if (latest != null) historyQuery += ' AND Id != :latestId';
        historyQuery += ' ORDER BY ' + safeSort + ' LIMIT :rows';

        Id latestId = latest != null ? latest.Id : null;
        List<Order> historyList = Database.query(historyQuery);

        CustomerOrdersResult result = new CustomerOrdersResult();
        result.latest = buildOrderDetail(latest, productImageFieldApiName);
        result.history = new List<OrderSummary>();
        for (Order o : historyList) result.history.add(buildOrderSummary(o));

        // Total count (for the "View all" button) — respects status + search but not the sort.
        String countQuery = 'SELECT COUNT() FROM Order WHERE ' + whereClause + statusClause + searchClause;
        result.totalCount = Database.countQuery(countQuery);

        return result;
    }

    // ----------------------- WHERE clause builder -----------------------

    private static String buildWhereClause(Id recordId, String objectApiName) {
        if (objectApiName == 'Account') {
            // Bound via :recordId — safe.
            return 'AccountId = :recordId';
        }
        if (objectApiName == 'Contact') {
            // Resolve the contact's AccountId so orders on the parent account are included too.
            List<Contact> c = [SELECT AccountId FROM Contact WHERE Id = :recordId LIMIT 1];
            Id contactAccountId = c.isEmpty() ? null : c[0].AccountId;
            Boolean hasContactCustomField = Schema.SObjectType.Order.fields.getMap().containsKey('contact__c');

            List<String> clauses = new List<String>{
                'BillToContactId = :recordId',
                'ShipToContactId = :recordId'
            };
            if (hasContactCustomField) clauses.add('Contact__c = :recordId');
            if (contactAccountId != null) clauses.add('AccountId = :contactAccountId');
            return '(' + String.join(clauses, ' OR ') + ')';
        }
        return null;
    }

    // ----------------------- Shaping helpers -----------------------

    private static OrderSummary buildOrderSummary(Order o) {
        OrderSummary s = new OrderSummary();
        s.orderId = o.Id;
        s.orderNumber = o.OrderNumber;
        s.name = o.Name;
        s.totalAmount = o.TotalAmount;
        s.status = o.Status;
        s.effectiveDate = o.EffectiveDate;
        s.accountId = o.AccountId;
        s.accountName = o.Account != null ? o.Account.Name : null;
        return s;
    }

    private static OrderDetail buildOrderDetail(Order o, String productImageFieldApiName) {
        if (o == null) return null;

        OrderDetail d = new OrderDetail();
        d.orderId = o.Id;
        d.orderNumber = o.OrderNumber;
        d.name = o.Name;
        d.totalAmount = o.TotalAmount;
        d.status = o.Status;
        d.effectiveDate = o.EffectiveDate;
        d.endDate = o.EndDate;
        d.accountId = o.AccountId;
        d.accountName = o.Account != null ? o.Account.Name : null;
        d.billToContactId = o.BillToContactId;
        d.billToContactName = o.BillToContact != null ? o.BillToContact.Name : null;

        Map<String, Schema.SObjectField> productFields = Schema.SObjectType.Product2.fields.getMap();
        String imageField = String.isNotBlank(productImageFieldApiName) ? productImageFieldApiName : 'Image_URL__c';
        Boolean hasProductImage = productFields.containsKey(imageField.toLowerCase());

        String itemsQuery = 'SELECT Id, Quantity, UnitPrice, TotalPrice, Product2.Name, Product2.ProductCode';
        if (hasProductImage) itemsQuery += ', Product2.' + imageField;
        itemsQuery += ' FROM OrderItem WHERE OrderId = :orderId';

        Id orderId = o.Id;
        d.items = Database.query(itemsQuery);
        d.itemCount = d.items.size();
        return d;
    }

    // ----------------------- Return types -----------------------

    public class CustomerOrdersResult {
        @AuraEnabled public OrderDetail latest;
        @AuraEnabled public List<OrderSummary> history;
        @AuraEnabled public Integer totalCount;
    }

    public class OrderSummary {
        @AuraEnabled public Id orderId;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal totalAmount;
        @AuraEnabled public String status;
        @AuraEnabled public Date effectiveDate;
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
    }

    public class OrderDetail {
        @AuraEnabled public Id orderId;
        @AuraEnabled public String orderNumber;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal totalAmount;
        @AuraEnabled public String status;
        @AuraEnabled public Date effectiveDate;
        @AuraEnabled public Date endDate;
        @AuraEnabled public Id accountId;
        @AuraEnabled public String accountName;
        @AuraEnabled public Id billToContactId;
        @AuraEnabled public String billToContactName;
        @AuraEnabled public List<OrderItem> items;
        @AuraEnabled public Integer itemCount;
    }
}
