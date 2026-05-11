public with sharing class SE_FR_TerritoryMapController {

    /**
     * Territory map data: returns up to `limitCount` Accounts (with billing geo info), each
     * enriched with rolled-up Opportunity figures (open count + total amount + pipeline stages
     * present) and Case counts.
     *
     * Schema-safe: filterFieldA / filterFieldB API names are checked against the schema before
     * being projected & filtered, and silently ignored otherwise.
     */
    @AuraEnabled(cacheable=true)
    public static List<TerritoryAccount> getTerritoryAccounts(
        Integer limitCount,
        String recordTypeName,
        String ownerScope,
        Decimal amountMin,
        Decimal amountMax,
        String stagesCsv,
        String nameSearch,
        String caseStatusCsv,
        String filterFieldAApiName,
        String filterFieldAValuesCsv,
        String filterFieldBApiName,
        String filterFieldBValuesCsv
    ) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 100 : Math.min(limitCount, 200);
        Id userId = UserInfo.getUserId();
        Boolean ownedByMe = ownerScope == null || ownerScope == 'mine';

        // Stage filter set: when empty, "open" defaults to !IsClosed.
        Set<String> stageFilter = csvToSet(stagesCsv);
        Set<String> caseStatusFilter = csvToSet(caseStatusCsv);
        List<String> filterAValues = new List<String>(csvToSet(filterFieldAValuesCsv));
        List<String> filterBValues = new List<String>(csvToSet(filterFieldBValuesCsv));

        Map<String, Schema.SObjectField> accountFields = Schema.SObjectType.Account.fields.getMap();
        Boolean filterAValid = String.isNotBlank(filterFieldAApiName)
            && accountFields.containsKey(filterFieldAApiName.toLowerCase()) && !filterAValues.isEmpty();
        Boolean filterBValid = String.isNotBlank(filterFieldBApiName)
            && accountFields.containsKey(filterFieldBApiName.toLowerCase()) && !filterBValues.isEmpty();

        // Project the configurable filter fields if valid + present so we can return them in the
        // wrapper (and the SE can show them in the list).
        Set<String> projected = new Set<String>{
            'Id','Name','Industry','Type','Phone','Website',
            'BillingStreet','BillingCity','BillingPostalCode','BillingState','BillingCountry',
            'BillingLatitude','BillingLongitude','OwnerId','Owner.Name',
            'AnnualRevenue','NumberOfEmployees',
            'RecordType.DeveloperName','RecordType.Name'
        };
        if (filterAValid) projected.add(filterFieldAApiName);
        if (filterBValid) projected.add(filterFieldBApiName);

        // 1) Account base query — only with billing geo so we can pin them.
        String soql = 'SELECT ' + String.join(new List<String>(projected), ', ')
            + ' FROM Account '
            + 'WHERE BillingLatitude != null AND BillingLongitude != null ';
        if (String.isNotBlank(recordTypeName)) {
            soql += ' AND RecordType.DeveloperName = :recordTypeName ';
        }
        if (ownedByMe) {
            soql += ' AND OwnerId = :userId ';
        }
        // Name search — case-insensitive substring (LIKE-bound to a normalized variable).
        String nameLike = null;
        if (String.isNotBlank(nameSearch)) {
            nameLike = '%' + nameSearch.trim() + '%';
            soql += ' AND Name LIKE :nameLike ';
        }
        if (filterAValid) {
            // String.escapeSingleQuotes on the field name guards against SOQL injection — we
            // already validated via the schema map but better belt-and-braces.
            soql += ' AND ' + String.escapeSingleQuotes(filterFieldAApiName) + ' IN :filterAValues ';
        }
        if (filterBValid) {
            soql += ' AND ' + String.escapeSingleQuotes(filterFieldBApiName) + ' IN :filterBValues ';
        }
        soql += ' ORDER BY Name ASC LIMIT :rows';

        List<Account> accounts = Database.query(soql);
        if (accounts.isEmpty() && ownedByMe) {
            // Fallback to "any owner" so a fresh demo org still shows pins.
            String fallback = soql.replace(' AND OwnerId = :userId ', ' ');
            accounts = Database.query(fallback);
        }
        if (accounts.isEmpty()) return new List<TerritoryAccount>();

        Set<Id> accountIds = new Set<Id>();
        for (Account a : accounts) accountIds.add(a.Id);

        // 2) Opportunities — group manually since AggregateResult is awkward with several measures.
        Map<Id, OppRollup> oppRollupByAccount = new Map<Id, OppRollup>();
        for (Opportunity o : [
            SELECT Id, AccountId, Name, Amount, StageName, IsClosed, IsWon, CloseDate
            FROM Opportunity
            WHERE AccountId IN :accountIds
        ]) {
            OppRollup r = oppRollupByAccount.get(o.AccountId);
            if (r == null) { r = new OppRollup(); oppRollupByAccount.put(o.AccountId, r); }
            Boolean isOpen = !o.IsClosed;
            // When stage filter is set: count opportunity as "open" only if its stage matches.
            if (!stageFilter.isEmpty()) isOpen = stageFilter.contains(o.StageName);
            if (isOpen) {
                r.openCount++;
                if (o.Amount != null) r.openAmount += o.Amount;
                r.stages.add(o.StageName);
            }
            if (o.IsWon) {
                r.wonCount++;
                if (o.Amount != null) r.wonAmount += o.Amount;
            }
        }

        // 3) Cases — count opens, optionally restricted to a status filter set.
        Map<Id, Integer> openCasesByAccount = new Map<Id, Integer>();
        Map<Id, Set<String>> caseStatusesByAccount = new Map<Id, Set<String>>();
        List<Case> cases;
        if (caseStatusFilter.isEmpty()) {
            cases = [SELECT Id, AccountId, Status, IsClosed FROM Case WHERE AccountId IN :accountIds AND IsClosed = false];
        } else {
            cases = [SELECT Id, AccountId, Status, IsClosed FROM Case WHERE AccountId IN :accountIds AND Status IN :caseStatusFilter];
        }
        for (Case c : cases) {
            Integer current = openCasesByAccount.containsKey(c.AccountId) ? openCasesByAccount.get(c.AccountId) : 0;
            openCasesByAccount.put(c.AccountId, current + 1);
            Set<String> seen = caseStatusesByAccount.get(c.AccountId);
            if (seen == null) { seen = new Set<String>(); caseStatusesByAccount.put(c.AccountId, seen); }
            if (c.Status != null) seen.add(c.Status);
        }

        // 4) Build the wrapper, applying the amount range filter post-rollup.
        List<TerritoryAccount> result = new List<TerritoryAccount>();
        for (Account a : accounts) {
            OppRollup r = oppRollupByAccount.get(a.Id);
            Decimal openAmt = (r != null) ? r.openAmount : 0;
            if (amountMin != null && openAmt < amountMin) continue;
            if (amountMax != null && amountMax > 0 && openAmt > amountMax) continue;
            TerritoryAccount t = new TerritoryAccount();
            t.id = a.Id;
            t.name = a.Name;
            t.industry = a.Industry;
            t.type = a.Type;
            t.phone = a.Phone;
            t.website = a.Website;
            t.street = a.BillingStreet;
            t.city = a.BillingCity;
            t.postalCode = a.BillingPostalCode;
            t.state = a.BillingState;
            t.country = a.BillingCountry;
            t.latitude = a.BillingLatitude;
            t.longitude = a.BillingLongitude;
            t.annualRevenue = a.AnnualRevenue;
            t.numberOfEmployees = a.NumberOfEmployees;
            t.ownerId = a.OwnerId;
            t.ownerName = a.Owner != null ? a.Owner.Name : null;
            t.recordTypeName = a.RecordType != null ? a.RecordType.Name : null;
            t.recordTypeDeveloperName = a.RecordType != null ? a.RecordType.DeveloperName : null;
            t.openOpportunityCount = r != null ? r.openCount : 0;
            t.openOpportunityAmount = r != null ? r.openAmount : 0;
            t.wonOpportunityCount = r != null ? r.wonCount : 0;
            t.wonOpportunityAmount = r != null ? r.wonAmount : 0;
            t.stagePresent = r != null ? new List<String>(r.stages) : new List<String>();
            t.openCaseCount = openCasesByAccount.containsKey(a.Id) ? openCasesByAccount.get(a.Id) : 0;
            t.caseStatuses = caseStatusesByAccount.containsKey(a.Id)
                ? new List<String>(caseStatusesByAccount.get(a.Id)) : new List<String>();
            // Project the configurable filter fields back into the wrapper so the LWC list can
            // display them under the account's name without a second query.
            if (filterAValid) t.filterFieldAValue = (String) a.get(filterFieldAApiName);
            if (filterBValid) t.filterFieldBValue = (String) a.get(filterFieldBApiName);
            result.add(t);
        }
        return result;
    }

    private static Set<String> csvToSet(String csv) {
        Set<String> out = new Set<String>();
        if (String.isBlank(csv)) return out;
        for (String s : csv.split(',')) {
            if (String.isNotBlank(s)) out.add(s.trim());
        }
        return out;
    }

    /**
     * Returns the distinct OpportunityStage StageNames available on the org. Used to populate
     * the Stage filter dropdown without forcing the SE to type values. Cached.
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getStageNames() {
        List<String> names = new List<String>();
        for (Schema.PicklistEntry e : Opportunity.StageName.getDescribe().getPicklistValues()) {
            if (e.isActive()) names.add(e.getValue());
        }
        return names;
    }

    /**
     * Returns the active Account RecordTypes (Name + DeveloperName). Empty if the org has no
     * RecordTypes on Account.
     */
    @AuraEnabled(cacheable=true)
    public static List<AccountRecordTypeOption> getAccountRecordTypes() {
        List<AccountRecordTypeOption> out = new List<AccountRecordTypeOption>();
        for (Schema.RecordTypeInfo rt : Account.SObjectType.getDescribe().getRecordTypeInfos()) {
            if (rt.isAvailable() && !rt.isMaster()) {
                AccountRecordTypeOption o = new AccountRecordTypeOption();
                o.label = rt.getName();
                o.developerName = rt.getDeveloperName();
                out.add(o);
            }
        }
        return out;
    }

    /**
     * Returns the active picklist values for any picklist field on Account, by API name. Empty
     * list if the field is missing, not a picklist, or otherwise unreadable. Used by the LWC to
     * populate the configurable Type / Industry style filters.
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getAccountPicklistValues(String fieldApiName) {
        List<String> out = new List<String>();
        if (String.isBlank(fieldApiName)) return out;
        Map<String, Schema.SObjectField> fields = Schema.SObjectType.Account.fields.getMap();
        Schema.SObjectField f = fields.get(fieldApiName.toLowerCase());
        if (f == null) return out;
        Schema.DescribeFieldResult d = f.getDescribe();
        if (d.getType() != Schema.DisplayType.PICKLIST && d.getType() != Schema.DisplayType.MULTIPICKLIST) return out;
        for (Schema.PicklistEntry e : d.getPicklistValues()) {
            if (e.isActive()) out.add(e.getValue());
        }
        return out;
    }

    /**
     * Returns the active picklist values for the Case.Status picklist (used by the case-status
     * filter dual-listbox).
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getCaseStatuses() {
        List<String> out = new List<String>();
        for (Schema.PicklistEntry e : Case.Status.getDescribe().getPicklistValues()) {
            if (e.isActive()) out.add(e.getValue());
        }
        return out;
    }

    /**
     * Returns the LWC-safe label for a given Account field API name (so the SE who configured a
     * custom field gets a nice header in the filter panel without typing it again).
     */
    @AuraEnabled(cacheable=true)
    public static String getAccountFieldLabel(String fieldApiName) {
        if (String.isBlank(fieldApiName)) return '';
        Map<String, Schema.SObjectField> fields = Schema.SObjectType.Account.fields.getMap();
        Schema.SObjectField f = fields.get(fieldApiName.toLowerCase());
        if (f == null) return '';
        return f.getDescribe().getLabel();
    }

    private class OppRollup {
        Integer openCount = 0;
        Decimal openAmount = 0;
        Integer wonCount = 0;
        Decimal wonAmount = 0;
        Set<String> stages = new Set<String>();
    }

    public class TerritoryAccount {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String industry;
        @AuraEnabled public String type;
        @AuraEnabled public String phone;
        @AuraEnabled public String website;
        @AuraEnabled public String street;
        @AuraEnabled public String city;
        @AuraEnabled public String postalCode;
        @AuraEnabled public String state;
        @AuraEnabled public String country;
        @AuraEnabled public Decimal latitude;
        @AuraEnabled public Decimal longitude;
        @AuraEnabled public Decimal annualRevenue;
        @AuraEnabled public Decimal numberOfEmployees;
        @AuraEnabled public Id ownerId;
        @AuraEnabled public String ownerName;
        @AuraEnabled public String recordTypeName;
        @AuraEnabled public String recordTypeDeveloperName;
        @AuraEnabled public Integer openOpportunityCount;
        @AuraEnabled public Decimal openOpportunityAmount;
        @AuraEnabled public Integer wonOpportunityCount;
        @AuraEnabled public Decimal wonOpportunityAmount;
        @AuraEnabled public List<String> stagePresent;
        @AuraEnabled public Integer openCaseCount;
        @AuraEnabled public List<String> caseStatuses;
        @AuraEnabled public String filterFieldAValue;
        @AuraEnabled public String filterFieldBValue;
    }

    public class AccountRecordTypeOption {
        @AuraEnabled public String label;
        @AuraEnabled public String developerName;
    }
}
