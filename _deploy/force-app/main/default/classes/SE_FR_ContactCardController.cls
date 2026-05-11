public with sharing class SE_FR_ContactCardController {

    /**
     * Resolves the Contact Id for a given source record. Mirrors the lookup logic from Charly
     * Ansel's original canContactCardController plus a couple of extra objects. Used when the
     * component is placed on an Account / Case / Opportunity record page.
     */
    @AuraEnabled(cacheable=true)
    public static Id resolveContactId(Id recordId, String objectApiName) {
        if (recordId == null || String.isBlank(objectApiName)) return null;
        try {
            if (objectApiName == 'Contact') return recordId;
            if (objectApiName == 'MessagingSession') {
                return queryLookup('EndUserContactId', 'MessagingSession', recordId);
            }
            if (objectApiName == 'Account') {
                // Person Account: AccountContactRelation or PersonContactId; otherwise first Contact.
                Id personId = queryLookup('PersonContactId', 'Account', recordId);
                if (personId != null) return personId;
                List<Contact> cs = [SELECT Id FROM Contact WHERE AccountId = :recordId ORDER BY CreatedDate ASC LIMIT 1];
                return cs.isEmpty() ? null : cs[0].Id;
            }
            if (objectApiName == 'Case' || objectApiName == 'Opportunity' || objectApiName == 'Order') {
                return queryLookup('ContactId', objectApiName, recordId);
            }
            if (objectApiName == 'VoiceCall' || objectApiName == 'VideoCall') {
                return queryLookup('Contact__c', objectApiName, recordId);
            }
            if (objectApiName == 'Lead') {
                return queryLookup('Contact__c', 'Lead', recordId);
            }
            if (objectApiName.endsWith('__c')) {
                return queryLookup('Contact__c', objectApiName, recordId);
            }
            return queryLookup('ContactId', objectApiName, recordId);
        } catch (Exception e) {
            System.debug('[SE_FR_ContactCardController] resolveContactId error: ' + e.getMessage());
            return null;
        }
    }

    private static Id queryLookup(String field, String objectApi, Id recordId) {
        try {
            SObject row = Database.query(
                'SELECT ' + field + ' FROM ' + objectApi + ' WHERE Id = :recordId LIMIT 1'
            );
            return row == null ? null : (Id) row.get(field);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Returns the Contact + any optional custom fields the SE configured (image, customer id,
     * gauge fields). Schema-safe: the optional fields are added to the SELECT only if they exist
     * on Contact. Output is a Map<String,Object> so the client can read dynamic field values.
     */
    @AuraEnabled(cacheable=true)
    public static Map<String, Object> getContactData(Id contactId,
                                                     String imageFieldApiName,
                                                     String customerIdFieldApiName,
                                                     String gauge1FieldApiName,
                                                     String gauge2FieldApiName,
                                                     String gauge3FieldApiName) {
        if (contactId == null) return new Map<String, Object>();
        Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Contact.fields.getMap();

        // Always-included Contact fields
        Set<String> selectFields = new Set<String>{
            'Id', 'FirstName', 'LastName', 'Email', 'Phone', 'MobilePhone', 'Title', 'Department',
            'MailingStreet', 'MailingPostalCode', 'MailingCity', 'MailingState', 'MailingCountry',
            'AccountId', 'Account.Name'
        };
        // Optional custom fields — added only when they actually exist on Contact.
        for (String f : new List<String>{ imageFieldApiName, customerIdFieldApiName,
                                          gauge1FieldApiName, gauge2FieldApiName, gauge3FieldApiName }) {
            if (String.isNotBlank(f) && fieldMap.containsKey(f.toLowerCase())) {
                selectFields.add(f);
            }
        }

        String q = 'SELECT ' + String.join(new List<String>(selectFields), ', ')
            + ' FROM Contact WHERE Id = :contactId LIMIT 1';
        List<SObject> rows = Database.query(q);
        if (rows.isEmpty()) return new Map<String, Object>();
        Contact c = (Contact) rows[0];

        Map<String, Object> out = new Map<String, Object>();
        out.put('Id', c.Id);
        out.put('FirstName', c.FirstName);
        out.put('LastName', c.LastName);
        out.put('Email', c.Email);
        out.put('Phone', c.Phone);
        out.put('MobilePhone', c.MobilePhone);
        out.put('Title', c.Title);
        out.put('Department', c.Department);
        out.put('MailingStreet', c.MailingStreet);
        out.put('MailingPostalCode', c.MailingPostalCode);
        out.put('MailingCity', c.MailingCity);
        out.put('MailingState', c.MailingState);
        out.put('MailingCountry', c.MailingCountry);
        out.put('AccountId', c.AccountId);
        out.put('AccountName', c.Account != null ? c.Account.Name : null);
        // Optional fields — put the raw value under the requested API name so the client can read
        // it consistently regardless of which fields were configured.
        for (String f : new List<String>{ imageFieldApiName, customerIdFieldApiName,
                                          gauge1FieldApiName, gauge2FieldApiName, gauge3FieldApiName }) {
            if (String.isNotBlank(f) && fieldMap.containsKey(f.toLowerCase())) {
                out.put(f, c.get(f));
            }
        }
        return out;
    }

    /**
     * Runs an Einstein Prompt Template and returns the generated text. Used only when the SE
     * explicitly turns on "Enable prompt summary" in App Builder. Thin wrapper over ConnectApi.
     */
    @AuraEnabled(cacheable=false)
    public static String getPromptSummary(Id recordId, String promptTemplateApiName, String inputApiName) {
        if (recordId == null || String.isBlank(promptTemplateApiName) || String.isBlank(inputApiName)) {
            return '';
        }
        Map<String, String> record = new Map<String, String>{ 'id' => String.valueOf(recordId) };
        ConnectApi.WrappedValue recordValue = new ConnectApi.WrappedValue();
        recordValue.value = record;

        Map<String, ConnectApi.WrappedValue> inputParams = new Map<String, ConnectApi.WrappedValue>{
            inputApiName => recordValue
        };
        ConnectApi.EinsteinPromptTemplateGenerationsInput input = new ConnectApi.EinsteinPromptTemplateGenerationsInput();
        input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
        input.additionalConfig.applicationName = 'PromptBuilderPreview';
        input.isPreview = false;
        input.inputParams = inputParams;

        ConnectApi.EinsteinPromptTemplateGenerationsRepresentation out =
            ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(promptTemplateApiName, input);
        return (out != null && !out.generations.isEmpty()) ? out.generations[0].text : '';
    }
}
