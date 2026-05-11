public with sharing class SE_FR_NearbyAccountsController {

    @AuraEnabled(cacheable=true)
    public static List<Account> getNearbyAccounts(Integer limitCount, String recordTypeName) {
        return getNearbyAccountsWithField(limitCount, recordTypeName, 'SDO_MAPS_Days_Since_Last_Visit__c');
    }

    @AuraEnabled(cacheable=true)
    public static List<Account> getNearbyAccountsWithField(Integer limitCount, String recordTypeName, String lastVisitFieldApiName) {
        // `limitCount` represents the number the SE wants on the map. We fetch a much larger pool
        // server-side (up to 200) so the LWC can sort by haversine distance and slice the closest
        // ones — otherwise the JS-side sort only re-orders an alphabetic sample and never finds
        // the truly nearest accounts.
        Integer wanted = (limitCount == null || limitCount <= 0) ? 10 : Math.min(limitCount, 100);
        Integer poolSize = Math.min(200, Math.max(wanted * 5, 50));
        Id userId = UserInfo.getUserId();
        Map<String, Schema.SObjectField> accountFields = Schema.SObjectType.Account.fields.getMap();
        Boolean hasLastVisit = String.isNotBlank(lastVisitFieldApiName)
            && accountFields.containsKey(lastVisitFieldApiName.toLowerCase());

        // Including BillingLatitude / BillingLongitude lets the LWC skip server-side geocoding and
        // pin every account reliably even when Bing Maps can't resolve the address.
        String baseSelect = 'SELECT Id, Name, BillingStreet, BillingCity, BillingPostalCode, BillingCountry, BillingLatitude, BillingLongitude';
        if (hasLastVisit) baseSelect += ', ' + lastVisitFieldApiName;

        // Only return accounts with usable coordinates so the LWC distance sort works on every row.
        String baseWhere = ' FROM Account WHERE BillingLatitude != null AND BillingLongitude != null ';
        if (String.isNotBlank(recordTypeName)) {
            baseWhere += ' AND RecordType.DeveloperName = :recordTypeName ';
        }

        // First pass — owned by running user. Pull a large pool so the LWC can pick the geo-closest.
        String query = baseSelect + baseWhere + ' AND OwnerId = :userId ORDER BY Name ASC LIMIT :poolSize';
        List<Account> mine = Database.query(query);
        if (!mine.isEmpty()) return mine;

        // Fallback — any owner. Lets the widget render something on a fresh demo org.
        String fallback = baseSelect + baseWhere + ' ORDER BY Name ASC LIMIT :poolSize';
        return Database.query(fallback);
    }
}
