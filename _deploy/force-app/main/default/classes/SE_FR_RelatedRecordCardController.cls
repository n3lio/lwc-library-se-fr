public with sharing class SE_FR_RelatedRecordCardController {

    public class RelatedRecordWrapper {
        @AuraEnabled public Id recordId;
        @AuraEnabled public String objectApiName;
        @AuraEnabled public String name;
        @AuraEnabled public String imageUrl;
        @AuraEnabled public List<FieldValue> fields;
    }
    public class FieldValue {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        @AuraEnabled public String type;        // 'phone' | 'email' | 'url' | 'text'
    }

    /**
     * Fetches a "related record" to display in a card:
     *   - given a Contact Id → returns the Account the Contact belongs to
     *   - given an Account Id → returns the primary Contact (or the first Contact on the Account)
     *   - given a Case / Opportunity / Order Id → returns the related Account OR Contact depending
     *     on the requested target ('account' | 'contact')
     *
     * The caller chooses the object to display via `target`; 'auto' lets this method pick the most
     * natural counterpart based on `sourceObjectApi`.
     *
     * fieldsCsv lists the fields to render (API names, comma-separated). The method resolves label
     * + value + type for each, skipping fields that don't exist on the target SObject.
     */
    @AuraEnabled(cacheable=true)
    public static RelatedRecordWrapper getRelatedRecord(Id sourceRecordId, String sourceObjectApi,
                                                        String target, String imageFieldApiName,
                                                        String fieldsCsv) {
        if (sourceRecordId == null) return null;

        // Decide target object and target record id.
        String resolvedTarget = (target == null) ? 'auto' : target.toLowerCase();
        String targetObject;
        Id targetRecordId;

        if (resolvedTarget == 'account') {
            targetObject = 'Account';
            targetRecordId = resolveAccountId(sourceRecordId, sourceObjectApi);
        } else if (resolvedTarget == 'contact') {
            targetObject = 'Contact';
            targetRecordId = resolveContactId(sourceRecordId, sourceObjectApi);
        } else {
            // auto — Account → primary Contact, Contact → Account, others default to Account
            if (sourceObjectApi == 'Account') {
                targetObject = 'Contact';
                targetRecordId = resolveContactId(sourceRecordId, sourceObjectApi);
            } else if (sourceObjectApi == 'Contact') {
                targetObject = 'Account';
                targetRecordId = resolveAccountId(sourceRecordId, sourceObjectApi);
            } else {
                targetObject = 'Account';
                targetRecordId = resolveAccountId(sourceRecordId, sourceObjectApi);
            }
        }
        if (targetRecordId == null) return null;

        // Validate fields against the target SObject schema, keep the order given by the SE.
        Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe().get(targetObject).getDescribe().fields.getMap();
        List<String> requestedFields = new List<String>();
        if (String.isNotBlank(fieldsCsv)) {
            for (String f : fieldsCsv.split(',')) {
                String clean = f.trim();
                if (String.isNotBlank(clean) && fieldMap.containsKey(clean.toLowerCase())) {
                    requestedFields.add(clean);
                }
            }
        }

        // Always include Name + the image field if present.
        Set<String> selectFields = new Set<String>{ 'Id', 'Name' };
        for (String f : requestedFields) selectFields.add(f);
        String imgField = String.isNotBlank(imageFieldApiName) ? imageFieldApiName.trim() : null;
        Boolean hasImageField = (imgField != null) && fieldMap.containsKey(imgField.toLowerCase());
        if (hasImageField) selectFields.add(imgField);

        String q = 'SELECT ' + String.join(new List<String>(selectFields), ', ') + ' FROM ' + targetObject
            + ' WHERE Id = :targetRecordId LIMIT 1';
        List<SObject> rows = Database.query(q);
        if (rows.isEmpty()) return null;
        SObject row = rows[0];

        RelatedRecordWrapper w = new RelatedRecordWrapper();
        w.recordId = (Id) row.get('Id');
        w.objectApiName = targetObject;
        w.name = (String) row.get('Name');
        w.imageUrl = hasImageField ? (String) row.get(imgField) : null;
        w.fields = new List<FieldValue>();
        for (String f : requestedFields) {
            Schema.DescribeFieldResult dr = fieldMap.get(f.toLowerCase()).getDescribe();
            Object rawVal = row.get(f);
            FieldValue fv = new FieldValue();
            fv.apiName = f;
            fv.label = dr.getLabel();
            fv.value = rawVal == null ? '' : String.valueOf(rawVal);
            fv.type = mapFieldType(dr.getType());
            w.fields.add(fv);
        }
        return w;
    }

    private static Id resolveAccountId(Id sourceId, String sourceObjectApi) {
        if (sourceId == null) return null;
        if (sourceObjectApi == 'Account') return sourceId;
        // Lookup lookup-style relation based on the source object
        if (sourceObjectApi == 'Contact') {
            List<Contact> cs = [SELECT AccountId FROM Contact WHERE Id = :sourceId LIMIT 1];
            return cs.isEmpty() ? null : cs[0].AccountId;
        }
        if (sourceObjectApi == 'Case') {
            List<Case> cs = [SELECT AccountId FROM Case WHERE Id = :sourceId LIMIT 1];
            return cs.isEmpty() ? null : cs[0].AccountId;
        }
        if (sourceObjectApi == 'Opportunity') {
            List<Opportunity> os = [SELECT AccountId FROM Opportunity WHERE Id = :sourceId LIMIT 1];
            return os.isEmpty() ? null : os[0].AccountId;
        }
        if (sourceObjectApi == 'Order') {
            List<Order> os = [SELECT AccountId FROM Order WHERE Id = :sourceId LIMIT 1];
            return os.isEmpty() ? null : os[0].AccountId;
        }
        return null;
    }

    private static Id resolveContactId(Id sourceId, String sourceObjectApi) {
        if (sourceId == null) return null;
        if (sourceObjectApi == 'Contact') return sourceId;
        if (sourceObjectApi == 'Case') {
            List<Case> cs = [SELECT ContactId FROM Case WHERE Id = :sourceId LIMIT 1];
            return cs.isEmpty() ? null : cs[0].ContactId;
        }
        if (sourceObjectApi == 'Opportunity') {
            // Opportunity.ContactId was Spring '24; fall back to primary OpportunityContactRole.
            try {
                List<SObject> oppRows = Database.query(
                    'SELECT ContactId FROM Opportunity WHERE Id = :sourceId LIMIT 1'
                );
                if (!oppRows.isEmpty()) {
                    Object v = oppRows[0].get('ContactId');
                    if (v != null) return (Id) v;
                }
            } catch (Exception ex) { /* field may not exist on older orgs */ }
            List<OpportunityContactRole> ocrs = [
                SELECT ContactId FROM OpportunityContactRole
                WHERE OpportunityId = :sourceId AND IsPrimary = true
                LIMIT 1
            ];
            if (!ocrs.isEmpty()) return ocrs[0].ContactId;
            List<OpportunityContactRole> anyRole = [
                SELECT ContactId FROM OpportunityContactRole
                WHERE OpportunityId = :sourceId LIMIT 1
            ];
            return anyRole.isEmpty() ? null : anyRole[0].ContactId;
        }
        if (sourceObjectApi == 'Account') {
            // Primary contact via Account.PersonContactId (Person Accounts) then first Contact.
            try {
                List<SObject> accRows = Database.query(
                    'SELECT PersonContactId FROM Account WHERE Id = :sourceId LIMIT 1'
                );
                if (!accRows.isEmpty()) {
                    Object v = accRows[0].get('PersonContactId');
                    if (v != null) return (Id) v;
                }
            } catch (Exception ex) { /* non-PersonAccount org */ }
            List<Contact> cs = [
                SELECT Id FROM Contact
                WHERE AccountId = :sourceId
                ORDER BY CreatedDate ASC LIMIT 1
            ];
            return cs.isEmpty() ? null : cs[0].Id;
        }
        if (sourceObjectApi == 'Order') {
            List<Order> os = [SELECT BillToContactId FROM Order WHERE Id = :sourceId LIMIT 1];
            return os.isEmpty() ? null : os[0].BillToContactId;
        }
        return null;
    }

    private static String mapFieldType(Schema.DisplayType t) {
        if (t == Schema.DisplayType.EMAIL) return 'email';
        if (t == Schema.DisplayType.PHONE) return 'phone';
        if (t == Schema.DisplayType.URL)   return 'url';
        return 'text';
    }
}
