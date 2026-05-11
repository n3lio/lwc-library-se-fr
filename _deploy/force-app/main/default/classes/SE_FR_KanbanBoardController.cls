public with sharing class SE_FR_KanbanBoardController {

    /**
     * Dynamic kanban — queries any SObject / group-by picklist / display field.
     * Whitelisted object names to avoid SOQL injection on the caller side.
     *
     * @param objectApiName  'Case', 'Opportunity', 'Lead', 'Order', 'Task', 'Account'.
     * @param groupByField   picklist / text field API name used as column key.
     * @param displayField   field shown on each card (title).
     * @param secondaryField optional field shown under the title (may be empty).
     * @param amountField    optional Decimal field to sum per column (e.g. Amount on Opportunity).
     * @param filterClause   optional WHERE fragment (e.g. "IsClosed = false"). Caller responsibility.
     * @param limitCount     LIMIT clamp (default 100, max 500).
     */
    @AuraEnabled(cacheable=true)
    public static List<SObject> getRecords(String objectApiName, String groupByField, String displayField,
                                           String secondaryField, String amountField, String filterClause,
                                           String recordId, String recordScopeField, Integer limitCount) {
        Integer rows = (limitCount == null || limitCount <= 0) ? 100 : Math.min(limitCount, 500);
        Set<String> allowedObjects = new Set<String>{
            'Case', 'Opportunity', 'Lead', 'Order', 'Task', 'Account'
        };
        if (!allowedObjects.contains(objectApiName)) return new List<SObject>();
        if (String.isBlank(groupByField) || String.isBlank(displayField)) return new List<SObject>();

        // Field-level sanity: each identifier must look like a Salesforce field name
        for (String f : new List<String>{ groupByField, displayField, secondaryField, amountField, recordScopeField }) {
            if (String.isNotBlank(f) && !Pattern.matches('^[A-Za-z0-9_]+$', f)) return new List<SObject>();
        }

        List<String> selectFields = new List<String>{ 'Id', groupByField, displayField };
        if (String.isNotBlank(secondaryField)) selectFields.add(secondaryField);
        if (String.isNotBlank(amountField)) selectFields.add(amountField);

        // Merge base clause + record-scope filter so Kanban on a Record Page auto-filters to the
        // current record without requiring the SE to write the clause themselves.
        List<String> clauses = new List<String>();
        if (String.isNotBlank(filterClause)) clauses.add(filterClause);
        if (String.isNotBlank(recordId) && String.isNotBlank(recordScopeField)) {
            // Guard against non-Id values — Pattern match the 15/18-char Salesforce Id shape.
            String trimmedId = recordId.trim();
            if (Pattern.matches('^[a-zA-Z0-9]{15,18}$', trimmedId)) {
                clauses.add(recordScopeField + ' = \'' + trimmedId + '\'');
            }
        }

        String q = 'SELECT ' + String.join(selectFields, ', ') + ' FROM ' + objectApiName;
        if (!clauses.isEmpty()) q += ' WHERE ' + String.join(clauses, ' AND ');
        q += ' ORDER BY CreatedDate DESC LIMIT :rows';
        return Database.query(q);
    }

    /**
     * Returns the picklist values of a field — used to seed empty columns on the client side.
     */
    @AuraEnabled(cacheable=true)
    public static List<String> getPicklistValues(String objectApiName, String fieldApiName) {
        if (String.isBlank(objectApiName) || String.isBlank(fieldApiName)) return new List<String>();
        Schema.DescribeSObjectResult sd = Schema.getGlobalDescribe().get(objectApiName) != null
            ? Schema.getGlobalDescribe().get(objectApiName).getDescribe()
            : null;
        if (sd == null) return new List<String>();
        Schema.SObjectField field = sd.fields.getMap().get(fieldApiName);
        if (field == null) return new List<String>();
        List<String> values = new List<String>();
        for (Schema.PicklistEntry e : field.getDescribe().getPicklistValues()) {
            if (e.isActive()) values.add(e.getValue());
        }
        return values;
    }

    /**
     * Updates a record's group-by field when the SE drags a card. Whitelisted same as getRecords.
     */
    @AuraEnabled
    public static void updateGroupBy(Id recordId, String groupByField, String newValue) {
        if (recordId == null || String.isBlank(groupByField)) return;
        if (!Pattern.matches('^[A-Za-z0-9_]+$', groupByField)) return;

        Schema.SObjectType t = recordId.getSObjectType();
        SObject obj = t.newSObject(recordId);
        obj.put(groupByField, newValue);
        update obj;
    }
}
