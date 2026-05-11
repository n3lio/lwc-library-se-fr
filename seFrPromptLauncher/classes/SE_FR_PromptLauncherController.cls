/**
 * Backing controller for the SE FR Prompt Launcher LWC.
 *
 * Drives two operations:
 *   1. listPromptTemplates() — discover what prompt templates are available on the org so the SE
 *      can copy/paste API names into the component config.
 *   2. runPrompt() — invoke a prompt template via the standard Salesforce Invocable Action endpoint
 *      `/actions/custom/generatePromptResponse/<DeveloperName>` and return the rendered text.
 *
 * The component used to be a chat-with-Agent surface bound to a Named Credential pointing at
 * Agentforce Runtime. That endpoint is gated by an org-level feature flag that's not provisioned
 * on demo orgs. Prompt templates, on the other hand, are accessible via a generic Invocable
 * Actions URL on every Einstein-enabled org. We pivoted accordingly.
 *
 * The Named Credential is still used because callouts to `/services/data/...` need authenticated
 * routing. Default name kept as `Agentforce_API` to not break existing Named Credential setups.
 */
public with sharing class SE_FR_PromptLauncherController {

    private static final String API_VERSION = 'v62.0';

    /**
     * Returns the list of prompt templates accessible through the Salesforce Invocable Action
     * endpoint. The shape is forwarded as-is so the LWC can present a list directly.
     */
    @AuraEnabled(cacheable=true)
    public static String listPromptTemplates(String namedCredential) {
        String nc = String.isNotBlank(namedCredential) ? namedCredential : 'Agentforce_API';
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + nc + '/services/data/' + API_VERSION + '/actions/custom/generatePromptResponse');
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        try {
            HttpResponse res = new Http().send(req);
            if (res.getStatusCode() >= 400) {
                return wrapError('HTTP ' + res.getStatusCode() + ': ' + res.getBody());
            }
            return res.getBody();
        } catch (Exception e) {
            return wrapError(e.getMessage());
        }
    }

    /**
     * Returns the schema (inputs / outputs) of a single prompt template. Useful to discover what
     * userInputs the LWC should ask before running.
     */
    @AuraEnabled(cacheable=true)
    public static String describePromptTemplate(String promptApiName, String namedCredential) {
        if (String.isBlank(promptApiName)) return wrapError('promptApiName is required');
        String nc = String.isNotBlank(namedCredential) ? namedCredential : 'Agentforce_API';
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + nc + '/services/data/' + API_VERSION
            + '/actions/custom/generatePromptResponse/' + promptApiName);
        req.setMethod('GET');
        req.setHeader('Accept', 'application/json');
        try {
            HttpResponse res = new Http().send(req);
            if (res.getStatusCode() >= 400) {
                return wrapError('HTTP ' + res.getStatusCode() + ': ' + res.getBody());
            }
            return res.getBody();
        } catch (Exception e) {
            return wrapError(e.getMessage());
        }
    }

    /**
     * Runs a prompt template and returns the generated text.
     *
     * @param promptApiName   Prompt template DeveloperName (e.g. 'einstein_gpt__summarizeAccountDefault')
     * @param inputsJson      JSON map of input values:
     *                          { "Input:Account": "001xxx", "userQuestion": "Hello" }
     *                        The component fills `Input:<Object>` automatically from the host
     *                        record context; user-typed inputs are merged in by the LWC.
     * @param namedCredential Named Credential routing to the org's REST API. Default 'Agentforce_API'.
     * @return JSON string. On success: the raw Invocable Action response, the LWC unpacks
     *         `actions[0].outputValues.promptResponse`. On failure: `{ "error": "..." }`.
     */
    @AuraEnabled
    public static String runPrompt(String promptApiName, String inputsJson, String namedCredential) {
        if (String.isBlank(promptApiName)) return wrapError('promptApiName is required');
        String nc = String.isNotBlank(namedCredential) ? namedCredential : 'Agentforce_API';

        Map<String, Object> inputs = new Map<String, Object>();
        if (String.isNotBlank(inputsJson)) {
            try {
                inputs = (Map<String, Object>) JSON.deserializeUntyped(inputsJson);
            } catch (Exception e) {
                return wrapError('Invalid inputsJson: ' + e.getMessage());
            }
        }

        // Invocable Actions take an array of action invocations. We send one. Salesforce expects
        // the inputs as a flat map of name → value.
        Map<String, Object> body = new Map<String, Object>{
            'inputs' => new List<Object>{ inputs }
        };

        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:' + nc + '/services/data/' + API_VERSION
            + '/actions/custom/generatePromptResponse/' + promptApiName);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setHeader('Accept', 'application/json');
        req.setBody(JSON.serialize(body));

        try {
            HttpResponse res = new Http().send(req);
            String responseBody = res.getBody();
            Integer status = res.getStatusCode();
            if (status >= 400) {
                return wrapError('HTTP ' + status + ': ' + responseBody);
            }
            return responseBody;
        } catch (System.CalloutException e) {
            return wrapError(e.getMessage());
        } catch (Exception e) {
            return wrapError(e.getMessage());
        }
    }

    /**
     * Convenience: persist the AI response on a record as a Note (ContentNote + ContentDocumentLink).
     * The LWC offers a "Save as Note" button next to each rendered response.
     */
    @AuraEnabled
    public static Id saveAsNote(Id recordId, String title, String htmlContent) {
        if (recordId == null || String.isBlank(htmlContent)) {
            throw new AuraHandledException('recordId and htmlContent are required.');
        }
        ContentNote note = new ContentNote();
        note.Title = String.isNotBlank(title) ? title.abbreviate(200) : 'AI summary';
        // ContentNote stores HTML in `Content` (Blob) — UTF-8 encoded markup.
        note.Content = Blob.valueOf(htmlContent);
        insert note;

        ContentDocumentLink link = new ContentDocumentLink();
        link.LinkedEntityId = recordId;
        link.ContentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :note.LatestPublishedVersionId LIMIT 1].ContentDocumentId;
        link.ShareType = 'V';
        link.Visibility = 'AllUsers';
        insert link;

        return note.Id;
    }

    private static String wrapError(String message) {
        String escaped = String.valueOf(message)
            .replace('\\', '\\\\')
            .replace('"', '\\"')
            .replace('\n', ' ')
            .replace('\r', ' ');
        return '{"error": "' + escaped + '"}';
    }
}
