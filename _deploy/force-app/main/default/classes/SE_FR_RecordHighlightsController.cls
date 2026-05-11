public with sharing class SE_FR_RecordHighlightsController {

    /**
     * Returns the page-layout-driven actions for a given record. Salesforce exposes the actions
     * on a record via the virtual `PlatformAction` SObject (ActionListContext = 'Record' returns
     * the same actions surfaced in the standard Highlights Panel).
     *
     * Fallback: when the layout has no actions, return Edit + Delete so the highlights panel is
     * never empty out-of-the-box. The LWC truncates to `maxQuickActions`.
     */
    @AuraEnabled(cacheable=true)
    public static List<QuickActionInfo> getQuickActionsForRecord(String recordId, String objectApiName) {
        List<QuickActionInfo> result = new List<QuickActionInfo>();
        if (String.isBlank(recordId) || String.isBlank(objectApiName)) {
            return defaults(objectApiName);
        }
        try {
            // PlatformAction is a virtual SObject; it requires a SourceEntity (record id or
            // SObjectType name) and an ActionListContext to return the right action set.
            // We use 'Record' for the page-level highlights actions.
            String soql = 'SELECT ActionEnumOrId, Label, Type, IconUrl, ActionTargetType, ActionTargetUrl, ActionListContext '
                + 'FROM PlatformAction '
                + 'WHERE SourceEntity = :recordId AND ActionListContext = \'Record\' '
                + 'ORDER BY SortOrder ASC';
            List<SObject> raws = Database.query(soql);
            for (SObject r : raws) {
                String label = (String) r.get('Label');
                String enumOrId = (String) r.get('ActionEnumOrId');
                if (String.isBlank(label) || String.isBlank(enumOrId)) continue;
                QuickActionInfo i = new QuickActionInfo();
                i.apiName = enumOrId;
                i.label = label;
                i.iconUrl = (String) r.get('IconUrl');
                i.actionType = (String) r.get('Type');
                i.objectApiName = objectApiName;
                result.add(i);
            }
        } catch (Exception e) {
            // Fall through to defaults — some org configurations restrict PlatformAction access.
        }
        if (result.isEmpty()) return defaults(objectApiName);
        return result;
    }

    private static List<QuickActionInfo> defaults(String objectApiName) {
        return new List<QuickActionInfo>{
            buildStandard('Edit', objectApiName),
            buildStandard('Delete', objectApiName)
        };
    }

    private static QuickActionInfo buildStandard(String name, String objectApiName) {
        QuickActionInfo i = new QuickActionInfo();
        i.apiName = name;
        i.label = name;
        i.iconUrl = null;
        i.actionType = 'StandardButton';
        i.objectApiName = objectApiName;
        return i;
    }

    public class QuickActionInfo {
        @AuraEnabled public String apiName;
        @AuraEnabled public String label;
        @AuraEnabled public String iconUrl;
        @AuraEnabled public String actionType;
        @AuraEnabled public String objectApiName;
    }
}
