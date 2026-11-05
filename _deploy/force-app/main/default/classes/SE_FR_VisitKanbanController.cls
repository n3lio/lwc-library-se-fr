/**
 * CCO FR - Visit Kanban helper.
 * Reads go through LDS (getRelatedListRecords) and writes through updateRecord.
 * This class only answers one question: does the optional "new visit" Flow exist?
 * (soft dependency - the LWC hides its button when the Flow is absent).
 */
public with sharing class SE_FR_VisitKanbanController {
    @AuraEnabled(cacheable=true)
    public static Boolean flowExists(String flowApiName) {
        if (String.isBlank(flowApiName)) {
            return false;
        }
        try {
            return ![
                SELECT Id FROM FlowDefinitionView
                WHERE ApiName = :flowApiName AND IsActive = true
                LIMIT 1
            ].isEmpty();
        } catch (Exception e) {
            return false;
        }
    }
}
