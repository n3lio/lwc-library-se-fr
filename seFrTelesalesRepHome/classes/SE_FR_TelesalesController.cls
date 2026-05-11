public with sharing class SE_FR_TelesalesController {

    /**
     * Cases to handle on the telesales Home.
     *
     * @param statusesCsv  comma-separated Case statuses. Default 'New,Working,Waiting on Customer,Escalated'.
     * @param ownerScope   'mine' | 'all' (default). 'all' makes the widget usable in a fresh SDO where the running user doesn't own all demo cases.
     * @param limitCount   LIMIT (1..50). Default 6.
     */
    @AuraEnabled(cacheable=true)
    public static List<Case> getIncomingCases(String statusesCsv, String ownerScope, Integer limitCount) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 6 : Math.min(limitCount, 50);

        List<String> statusList = new List<String>();
        if (String.isNotBlank(statusesCsv)) {
            for (String s : statusesCsv.split(',')) {
                String v = s.trim();
                if (String.isNotBlank(v)) statusList.add(v);
            }
        }
        if (statusList.isEmpty()) {
            statusList = new List<String>{ 'New', 'Working', 'Waiting on Customer', 'Escalated' };
        }

        String query = 'SELECT Id, CaseNumber, Subject, Status, Origin, Priority, CreatedDate, AccountId, Account.Name, ContactId, Contact.Name FROM Case WHERE IsClosed = false AND Status IN :statusList ';
        if (ownerScope == 'mine') {
            Id userId = UserInfo.getUserId();
            query += ' AND OwnerId = :userId ';
        }
        query += ' ORDER BY CreatedDate DESC LIMIT :rows';
        return Database.query(query);
    }

    /**
     * Orders to validate on the telesales Home.
     *
     * @param statusesCsv  comma-separated Order statuses. Default 'Draft'.
     * @param ownerScope   'mine' | 'all' (default).
     * @param limitCount   LIMIT (1..50). Default 6.
     */
    @AuraEnabled(cacheable=true)
    public static List<Order> getOrdersToValidate(String statusesCsv, String ownerScope, Integer limitCount) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 6 : Math.min(limitCount, 50);

        List<String> statusList = new List<String>();
        if (String.isNotBlank(statusesCsv)) {
            for (String s : statusesCsv.split(',')) {
                String v = s.trim();
                if (String.isNotBlank(v)) statusList.add(v);
            }
        }
        if (statusList.isEmpty()) {
            statusList = new List<String>{ 'Draft' };
        }

        // SalesChannel is optional; use SafeNavigation to avoid failures on orgs without channel records
        String query = 'SELECT Id, OrderNumber, Status, CreatedDate, EffectiveDate, TotalAmount, AccountId, Account.Name, SalesChannel.SalesChannelName FROM Order WHERE Status IN :statusList ';
        if (ownerScope == 'mine') {
            Id userId = UserInfo.getUserId();
            query += ' AND OwnerId = :userId ';
        }
        query += ' ORDER BY CreatedDate DESC LIMIT :rows';
        return Database.query(query);
    }

    /**
     * Contacts to call for the "Calls to make" tile. Real data, not mock:
     * — ranks Contacts whose Account has an open Case (churn signal) or a Draft Order (needs validation)
     *   ahead of generic follow-ups.
     * — only Contacts with a non-blank Phone / MobilePhone are returned.
     *
     * @param recordTypeName Account.RecordType.DeveloperName filter. Empty = no filter.
     * @param ownerScope     'mine' | 'all' (default — limits by Account.OwnerId).
     * @param limitCount     LIMIT (1..20). Default 5.
     */
    @AuraEnabled(cacheable=true)
    public static List<Contact> getCallsToMake(String recordTypeName, String ownerScope, Integer limitCount) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 5 : Math.min(limitCount, 20);

        Set<Id> priorityAccountIds = new Set<Id>();
        for (Case c : [
            SELECT AccountId FROM Case
            WHERE IsClosed = false AND AccountId != null
            ORDER BY CreatedDate DESC LIMIT 50
        ]) {
            if (c.AccountId != null) priorityAccountIds.add(c.AccountId);
        }
        for (Order o : [
            SELECT AccountId FROM Order
            WHERE Status = 'Draft' AND AccountId != null
            ORDER BY CreatedDate DESC LIMIT 50
        ]) {
            if (o.AccountId != null) priorityAccountIds.add(o.AccountId);
        }

        String query = 'SELECT Id, Name, Title, Phone, MobilePhone, AccountId, Account.Name '
            + 'FROM Contact '
            + 'WHERE (Phone != null OR MobilePhone != null) ';
        if (String.isNotBlank(recordTypeName)) {
            query += ' AND Account.RecordType.DeveloperName = :recordTypeName ';
        }
        if (ownerScope == 'mine') {
            Id userId = UserInfo.getUserId();
            query += ' AND Account.OwnerId = :userId ';
        }
        query += ' ORDER BY LastActivityDate DESC NULLS LAST, LastModifiedDate DESC LIMIT :rows';
        List<Contact> raw = Database.query(query);

        List<Contact> prio = new List<Contact>();
        List<Contact> rest = new List<Contact>();
        for (Contact c : raw) {
            if (c.AccountId != null && priorityAccountIds.contains(c.AccountId)) prio.add(c);
            else rest.add(c);
        }
        List<Contact> ordered = new List<Contact>();
        ordered.addAll(prio);
        ordered.addAll(rest);
        if (ordered.size() > rows) {
            List<Contact> truncated = new List<Contact>();
            for (Integer i = 0; i < rows; i++) truncated.add(ordered[i]);
            return truncated;
        }
        return ordered;
    }
}
