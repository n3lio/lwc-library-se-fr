/**
 * Backing controller for the CCO FR - Visit Shelf Compliance LWC.
 * READ-ONLY: no DML. File creation is handled natively by lightning-file-upload.
 *
 *   getPhotos     - image ContentVersions linked to a record (cacheable).
 *   analyzeShelf  - optional Agentforce vision call (ConnectApi is Apex-only). Soft-fail:
 *                   returns null when no template is given or on any exception, so the
 *                   LWC falls back to its mock result.
 */
public with sharing class SE_FR_ShelfComplianceController {

    private static final Set<String> IMAGE_EXT = new Set<String>{ 'png', 'jpg', 'jpeg', 'heic' };

    public class PhotoDto {
        @AuraEnabled public Id contentDocumentId;
        @AuraEnabled public Id contentVersionId;
        @AuraEnabled public String title;
        @AuraEnabled public String fileExtension;
    }

    @AuraEnabled(cacheable=true)
    public static List<PhotoDto> getPhotos(Id recordId) {
        List<PhotoDto> out = new List<PhotoDto>();
        if (recordId == null) {
            return out;
        }
        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink l : [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
            WITH USER_MODE
            LIMIT 200
        ]) {
            docIds.add(l.ContentDocumentId);
        }
        if (docIds.isEmpty()) {
            return out;
        }
        for (ContentVersion v : [
            SELECT Id, ContentDocumentId, Title, FileExtension
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds AND IsLatest = true
            WITH USER_MODE
            ORDER BY CreatedDate DESC
            LIMIT 50
        ]) {
            if (v.FileExtension != null && IMAGE_EXT.contains(v.FileExtension.toLowerCase())) {
                PhotoDto d = new PhotoDto();
                d.contentDocumentId = v.ContentDocumentId;
                d.contentVersionId = v.Id;
                d.title = v.Title;
                d.fileExtension = v.FileExtension;
                out.add(d);
            }
        }
        return out;
    }

    /**
     * Upload a photo for the visit record. Inserts a ContentVersion with
     * FirstPublishLocationId = recordId (auto-creates ContentDocument + ContentDocumentLink).
     * Lets the LWC use a custom "Charger" button instead of lightning-file-upload (whose
     * built-in label "Charger des fichiers" wraps on 2 lines in narrow columns).
     *
     * @return the new ContentVersionId.
     */
    @AuraEnabled
    public static Id uploadPhoto(Id recordId, String fileName, String base64Data) {
        if (recordId == null || String.isBlank(fileName) || String.isBlank(base64Data)) {
            throw new AuraHandledException('recordId, fileName and base64Data are required.');
        }
        ContentVersion cv = new ContentVersion();
        cv.Title = fileName;
        cv.PathOnClient = fileName;
        cv.VersionData = EncodingUtil.base64Decode(base64Data);
        cv.FirstPublishLocationId = recordId;
        insert cv;
        return cv.Id;
    }

    /** Returns generated text, or null (soft-fail) so the client shows the mock result. */
    @AuraEnabled
    public static String analyzeShelf(Id recordId, String promptTemplateApiName) {
        if (recordId == null || String.isBlank(promptTemplateApiName)) {
            return null;
        }
        try {
            ConnectApi.WrappedValue recordValue = new ConnectApi.WrappedValue();
            recordValue.value = new Map<String, String>{ 'id' => String.valueOf(recordId) };
            ConnectApi.EinsteinPromptTemplateGenerationsInput input =
                new ConnectApi.EinsteinPromptTemplateGenerationsInput();
            input.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
            input.additionalConfig.applicationName = 'PromptBuilderPreview';
            input.isPreview = false;
            input.inputParams = new Map<String, ConnectApi.WrappedValue>{ 'Input:Visit__c' => recordValue };
            ConnectApi.EinsteinPromptTemplateGenerationsRepresentation res =
                ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate(promptTemplateApiName, input);
            if (res == null || res.generations == null || res.generations.isEmpty()) {
                return null;
            }
            return res.generations[0].text;
        } catch (Exception e) {
            return null;
        }
    }
}
