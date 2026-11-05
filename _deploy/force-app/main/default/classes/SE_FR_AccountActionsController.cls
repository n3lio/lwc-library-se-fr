/**
 * Backing controller for the CCO FR — Account Actions LWC.
 *
 * Provides a single operation:
 *   getPromptSummary — invokes an Einstein Prompt Template via `ConnectApi.EinsteinLLM.generate
 *   MessagesForPromptTemplate`, feeding it the current record Id. Returns the generated text
 *   verbatim (markdown is parsed client-side).
 *
 * Pattern copied from SE_FR_ContactCardController.getPromptSummary — same wrapping, same
 * backward-compatible defaults. No Named Credential is used; ConnectApi handles routing itself.
 */
public with sharing class SE_FR_AccountActionsController {

    /**
     * Run an Einstein Prompt Template bound to the current record.
     *
     * @param recordId              The host record Id (the LWC passes `this.recordId`)
     * @param promptTemplateApiName DeveloperName of the prompt template (e.g.
     *                              'einstein_gpt__summarizeAccountDefault')
     * @param inputApiName          Name of the input parameter the prompt expects
     *                              (typically 'Input:Account' / 'Input:Contact' / etc.)
     * @return                      The generated text (may be empty). Client-side will render it
     *                              as markdown.
     */
    @AuraEnabled(cacheable=false)
    public static String getPromptSummary(Id recordId, String promptTemplateApiName, String inputApiName) {
        if (recordId == null) {
            throw new AuraHandledException('recordId is required.');
        }
        if (String.isBlank(promptTemplateApiName)) {
            throw new AuraHandledException('promptTemplateApiName is required.');
        }
        if (String.isBlank(inputApiName)) {
            throw new AuraHandledException('inputApiName is required.');
        }

        try {
            Map<String, String> record = new Map<String, String>{ 'id' => String.valueOf(recordId) };
            ConnectApi.WrappedValue recordValue = new ConnectApi.WrappedValue();
            recordValue.value = record;

            Map<String, ConnectApi.WrappedValue> inputParams = new Map<String, ConnectApi.WrappedValue>{
                inputApiName => recordValue
            };
            ConnectApi.EinsteinPromptTemplateGenerationsInput input =
                new ConnectApi.EinsteinPromptTemplateGenerationsInput();
            input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
            input.additionalConfig.applicationName = 'PromptBuilderPreview';
            input.isPreview = false;
            input.inputParams = inputParams;

            ConnectApi.EinsteinPromptTemplateGenerationsRepresentation out =
                ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(promptTemplateApiName, input);

            if (out == null || out.generations == null || out.generations.isEmpty()) {
                return '';
            }
            return out.generations[0].text;
        } catch (Exception e) {
            // Wrap for the client. The LWC toasts the message as 'warning' (feature is
            // soft-failing — the card stays usable even if Einstein is down).
            throw new AuraHandledException(e.getMessage());
        }
    }
}
