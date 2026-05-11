public with sharing class SE_FR_PipelineSnapshotController {

    /**
     * Returns every open Opportunity for a customer (Account) plus a total amount,
     * grouped client-side in the LWC. We do not SOQL-group here because we also want
     * each Opp's details (Name, Amount, Probability, CloseDate, OwnerName).
     *
     * @param recordId        Account Id (or Opportunity Id — we resolve its AccountId).
     * @param objectApiName   'Account' | 'Opportunity'.
     * @param limitCount      LIMIT clamp (default 40, max 200).
     * @param includeClosed   When true, includes Closed Won / Closed Lost.
     */
    @AuraEnabled(cacheable=true)
    public static List<Opportunity> getPipeline(Id recordId, String objectApiName, Integer limitCount, Boolean includeClosed) {
        if (recordId == null || String.isBlank(objectApiName)) return new List<Opportunity>();

        Integer rows = (limitCount == null || limitCount <= 0) ? 40 : Math.min(limitCount, 200);

        Id accountId;
        if (objectApiName == 'Account') {
            accountId = recordId;
        } else if (objectApiName == 'Opportunity') {
            List<Opportunity> ref = [SELECT AccountId FROM Opportunity WHERE Id = :recordId LIMIT 1];
            if (ref.isEmpty()) return new List<Opportunity>();
            accountId = ref[0].AccountId;
        } else {
            return new List<Opportunity>();
        }
        if (accountId == null) return new List<Opportunity>();

        String query = 'SELECT Id, Name, Amount, StageName, Probability, CloseDate, ForecastCategoryName, '
            + 'OwnerId, Owner.Name, Account.Name '
            + 'FROM Opportunity WHERE AccountId = :accountId ';
        if (includeClosed != true) query += ' AND IsClosed = false ';
        query += ' ORDER BY CloseDate ASC NULLS LAST LIMIT :rows';

        return Database.query(query);
    }
}
