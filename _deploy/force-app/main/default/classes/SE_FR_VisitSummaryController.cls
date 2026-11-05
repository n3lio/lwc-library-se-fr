/**
 * Backing controller for the CCO FR — Visit Summary AI LWC.
 *
 * Operates on a Visit__c record (sObject shipped by `seFrRetailExecSchema`). Also accepts
 * an Account Id — in that case the controller resolves to the Account's most recent
 * Visit__c (by CheckInDateTime desc, then PlannedStartDateTime desc, then CreatedDate
 * desc). Zero managed package dep.
 *
 *   summarizeVisit — invokes an Einstein Prompt Template via
 *   `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate`, feeding it the resolved
 *   Visit__c Id. Returns the generated text verbatim (client parses it as JSON, falling
 *   back to plain text if the prompt template is not JSON-shaped).
 */
public with sharing class SE_FR_VisitSummaryController {

    /**
     * Call an Einstein Prompt Template bound to the current Visit__c record.
     * If `recordId` is an Account, resolve to the most recent Visit__c of that account.
     *
     * @param recordId              Visit__c Id (direct) OR Account Id (resolved).
     * @param promptTemplateApiName Prompt template DeveloperName (optional). If blank,
     *                              returns a deterministic fallback summary.
     * @return                      Generated text, or JSON fallback.
     */
    @AuraEnabled(cacheable=false)
    public static String summarizeVisit(Id recordId, String promptTemplateApiName, String clientContext) {
        if (recordId == null) {
            throw new AuraHandledException('recordId is required.');
        }

        // Resolve to a Visit__c Id. If the host record is an Account, look up its most
        // recent Visit__c. If the host record is already a Visit__c, use it as-is.
        Id visitId = resolveVisitId(recordId);
        if (visitId == null) {
            // No visit found — return a clean "nothing to summarize" payload so the UI
            // can show a neutral message instead of a hard error.
            return '{"summary":"Aucune visite enregistrée pour ce compte.","keyPoints":[],"actions":[]}';
        }

        if (String.isBlank(promptTemplateApiName)) {
            return buildFallbackSummary(visitId, clientContext);
        }

        try {
            Map<String, String> record = new Map<String, String>{ 'id' => String.valueOf(visitId) };
            ConnectApi.WrappedValue recordValue = new ConnectApi.WrappedValue();
            recordValue.value = record;

            Map<String, ConnectApi.WrappedValue> inputParams = new Map<String, ConnectApi.WrappedValue>{
                'Input:Visit__c' => recordValue
            };

            // Optionally inject the client-side context captured by sibling components
            // (progress steps, shelf PDL, product check ruptures, order lines). Prompt
            // templates can bind this via `{!$Input:ClientContext}`.
            if (String.isNotBlank(clientContext)) {
                ConnectApi.WrappedValue ctxValue = new ConnectApi.WrappedValue();
                ctxValue.value = clientContext;
                inputParams.put('Input:ClientContext', ctxValue);
            }

            ConnectApi.EinsteinPromptTemplateGenerationsInput input =
                new ConnectApi.EinsteinPromptTemplateGenerationsInput();
            input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
            input.additionalConfig.applicationName = 'PromptBuilderPreview';
            input.isPreview = false;
            input.inputParams = inputParams;

            ConnectApi.EinsteinPromptTemplateGenerationsRepresentation out =
                ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(promptTemplateApiName, input);

            if (out == null || out.generations == null || out.generations.isEmpty()) {
                return buildFallbackSummary(visitId, clientContext);
            }
            return out.generations[0].text;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }

    /**
     * If `recordId` is a Visit__c, return it as-is. If it's an Account, return the Id
     * of its most recent Visit__c (CheckInDateTime desc, then PlannedStartDateTime desc,
     * then CreatedDate desc). Otherwise, return null.
     */
    private static Id resolveVisitId(Id recordId) {
        Schema.SObjectType t = recordId.getSObjectType();
        if (t == Visit__c.SObjectType) {
            return recordId;
        }
        if (t == Account.SObjectType) {
            List<Visit__c> rows = [
                SELECT Id
                FROM Visit__c
                WHERE Account__c = :recordId
                WITH USER_MODE
                ORDER BY CheckInDateTime__c DESC NULLS LAST,
                         PlannedStartDateTime__c DESC NULLS LAST,
                         CreatedDate DESC
                LIMIT 1
            ];
            return rows.isEmpty() ? null : rows[0].Id;
        }
        return null;
    }

    /**
     * Minimal server-side fallback. The LWC already builds a rich client-side fallback
     * from the sibling-captured context (shelf PDL, named ruptures, price alerts, order
     * lines). So on the server we only emit the Visit__c meta the client doesn't know
     * (owner name, location, notes) and let the LWC enrich. We deliberately DO NOT emit
     * a planned-only duration — it leads to nonsensical values (e.g. "18780 min (prévu)"
     * when the planned slot spans days). Only actual check-in → check-out duration is
     * surfaced.
     */
    private static String buildFallbackSummary(Id visitId, String clientContext) {
        List<Visit__c> rows = [
            SELECT Name, VisitState__c, PlannedStartDateTime__c, PlannedEndDateTime__c,
                   CheckInDateTime__c, CheckOutDateTime__c, Location__c, Notes__c,
                   Account__r.Name, Owner.Name
            FROM Visit__c
            WHERE Id = :visitId
            WITH USER_MODE
            LIMIT 1
        ];
        if (rows.isEmpty()) {
            return '{"summary":"","keyPoints":[],"actions":[]}';
        }
        Visit__c v = rows[0];

        // Only emit actual duration (planned is skipped — the client won't know what to
        // do with "18 780 min planifiées").
        String durationLabel = '';
        if (v.CheckInDateTime__c != null && v.CheckOutDateTime__c != null) {
            Long millis = v.CheckOutDateTime__c.getTime() - v.CheckInDateTime__c.getTime();
            Long minutes = Math.max(0, millis / 60000);
            if (minutes <= 24L * 60L) {
                durationLabel = String.valueOf(minutes) + ' min';
            }
        }

        String accountName = v.Account__r != null ? v.Account__r.Name : null;
        List<String> summaryParts = new List<String>();
        summaryParts.add('Visite ' + v.Name + (accountName != null ? ' chez ' + accountName : '') + '.');
        if (String.isNotBlank(v.VisitState__c)) {
            summaryParts.add('État : ' + v.VisitState__c + '.');
        }
        if (String.isNotBlank(durationLabel)) {
            summaryParts.add('Durée : ' + durationLabel + '.');
        }
        if (String.isNotBlank(v.Notes__c)) {
            summaryParts.add(v.Notes__c);
        }
        if (String.isNotBlank(clientContext)) {
            summaryParts.add(clientContext);
        }

        List<String> keyPoints = new List<String>();
        if (String.isNotBlank(v.Location__c)) keyPoints.add('Lieu : ' + v.Location__c);
        if (v.Owner != null && String.isNotBlank(v.Owner.Name)) keyPoints.add('Commercial : ' + v.Owner.Name);
        if (v.CheckInDateTime__c != null) keyPoints.add('Check-in : ' + v.CheckInDateTime__c.format());
        if (v.CheckOutDateTime__c != null) keyPoints.add('Check-out : ' + v.CheckOutDateTime__c.format());

        // JSON by hand — same contract.
        String summary = String.join(summaryParts, ' ').replace('\\', '\\\\').replace('"', '\\"').replace('\n', ' ');
        String kpJson = '';
        for (String kp : keyPoints) {
            if (kpJson.length() > 0) kpJson += ',';
            kpJson += '"' + kp.replace('\\', '\\\\').replace('"', '\\"') + '"';
        }
        return '{"summary":"' + summary + '","keyPoints":[' + kpJson + '],"actions":[]}';
    }
}
