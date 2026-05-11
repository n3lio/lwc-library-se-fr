public with sharing class SE_FR_FieldSalesController {

    /**
     * Priority accounts to visit on the field-sales Home.
     *
     * @param recordTypeName  Account.RecordType.DeveloperName filter (e.g. 'SDO_Account_Simple'). Blank = any.
     * @param ownerScope      'mine' (default) | 'all' — lets the SE show accounts owned by anyone when their own list is empty.
     * @param orderBy         whitelisted ORDER BY expression. One of: 'Name', 'LastActivityDate DESC NULLS LAST', 'AnnualRevenue DESC NULLS LAST', 'CreatedDate DESC'. Defaults to 'Name'.
     * @param limitCount      LIMIT (1..50). Default 6.
     */
    @AuraEnabled(cacheable=true)
    public static List<Account> getPriorityAccounts(String recordTypeName, String ownerScope, String orderBy, Integer limitCount) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 6 : Math.min(limitCount, 50);

        Set<String> allowedOrders = new Set<String>{
            'Name',
            'LastActivityDate DESC NULLS LAST',
            'AnnualRevenue DESC NULLS LAST',
            'CreatedDate DESC'
        };
        String safeOrderBy = allowedOrders.contains(orderBy) ? orderBy : 'Name';

        String query = 'SELECT Id, Name, BillingCity, BillingCountry, Type, Industry, LastActivityDate, AnnualRevenue FROM Account WHERE BillingStreet != null ';

        if (ownerScope != 'all') {
            Id userId = UserInfo.getUserId();
            query += ' AND OwnerId = :userId ';
        }
        if (String.isNotBlank(recordTypeName)) {
            query += ' AND RecordType.DeveloperName = :recordTypeName ';
        }

        query += ' ORDER BY ' + safeOrderBy + ' LIMIT :rows';
        return Database.query(query);
    }

    /**
     * Leads to convert on the field-sales Home.
     *
     * @param rating       'Hot' (default) | 'Warm' | 'Cool' | 'Any'. 'Any' returns leads of any rating (still filters nulls out only when rating != Any).
     * @param ownerScope   'mine' (default) | 'all'.
     * @param limitCount   LIMIT (1..50). Default 6.
     */
    @AuraEnabled(cacheable=true)
    public static List<Lead> getMyLeads(String rating, String ownerScope, Integer limitCount) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 6 : Math.min(limitCount, 50);

        String query = 'SELECT Id, Name, Company, Status, Rating, CreatedDate FROM Lead WHERE IsConverted = false ';

        if (ownerScope != 'all') {
            Id userId = UserInfo.getUserId();
            query += ' AND OwnerId = :userId ';
        }
        Set<String> allowedRatings = new Set<String>{ 'Hot', 'Warm', 'Cool' };
        if (String.isNotBlank(rating) && allowedRatings.contains(rating)) {
            query += ' AND Rating = :rating ';
        }

        query += ' ORDER BY CreatedDate DESC LIMIT :rows';
        return Database.query(query);
    }
}
