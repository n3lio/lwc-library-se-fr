public with sharing class SE_FR_AccountHealthController {

    /**
     * Gathers the signals used to compute an Account health score on the client side.
     * Schema-safe: optional custom fields (NPS__c, SDO_MAPS_Days_Since_Last_Visit__c...) are
     * included only when present.
     */
    @AuraEnabled(cacheable=true)
    public static Snapshot getSnapshot(Id accountId) {
        if (accountId == null) return null;
        Map<String, Schema.SObjectField> fm = Schema.SObjectType.Account.fields.getMap();
        Boolean hasMapsVisit = fm.containsKey('sdo_maps_days_since_last_visit__c');
        Boolean hasNps = fm.containsKey('nps__c');

        String q = 'SELECT Id, Name, AnnualRevenue, LastActivityDate';
        if (hasMapsVisit) q += ', SDO_MAPS_Days_Since_Last_Visit__c';
        if (hasNps) q += ', NPS__c';
        q += ' FROM Account WHERE Id = :accountId LIMIT 1';
        List<Account> accs = Database.query(q);
        if (accs.isEmpty()) return null;
        Account a = accs[0];

        Snapshot s = new Snapshot();
        s.accountId = a.Id;
        s.name = a.Name;
        s.annualRevenue = a.AnnualRevenue;
        s.lastActivityDate = a.LastActivityDate;
        s.daysSinceLastActivity = a.LastActivityDate != null ? a.LastActivityDate.daysBetween(Date.today()) : null;
        s.daysSinceLastVisit = hasMapsVisit ? (Decimal) a.get('SDO_MAPS_Days_Since_Last_Visit__c') : null;
        s.npsScore = hasNps ? (Decimal) a.get('NPS__c') : null;

        // Pipeline & sales signals
        s.openOpportunities = [SELECT count() FROM Opportunity WHERE AccountId = :accountId AND IsClosed = false];
        s.openCases = [SELECT count() FROM Case WHERE AccountId = :accountId AND IsClosed = false];
        s.recentOrders90d = [SELECT count() FROM Order WHERE AccountId = :accountId AND Status = 'Activated' AND EffectiveDate = LAST_N_DAYS:90];
        s.totalContacts = [SELECT count() FROM Contact WHERE AccountId = :accountId];

        return s;
    }

    public class Snapshot {
        @AuraEnabled public Id accountId;
        @AuraEnabled public String name;
        @AuraEnabled public Decimal annualRevenue;
        @AuraEnabled public Date lastActivityDate;
        @AuraEnabled public Integer daysSinceLastActivity;
        @AuraEnabled public Decimal daysSinceLastVisit;
        @AuraEnabled public Decimal npsScore;
        @AuraEnabled public Integer openOpportunities;
        @AuraEnabled public Integer openCases;
        @AuraEnabled public Integer recentOrders90d;
        @AuraEnabled public Integer totalContacts;
    }
}
