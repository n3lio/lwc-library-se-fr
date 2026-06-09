/**
 * Shared controller for the File-based image pattern used by several library components
 * (Record Highlights, Contact Card, Related Record Card). The image is stored as a standard
 * Salesforce File attached to the target record; no custom field on the object is required.
 *
 * Components that want to offer "click to replace image" simply call these two methods.
 */
public with sharing class SE_FR_ImageFileController {

    // Title prefix used to tag images uploaded via the SE_FR library. Looking for this marker
    // lets us find the latest image on a record without needing a custom field.
    private static final String TITLE_PREFIX = '__SE_FR_IMG__';

    // Backwards-compat prefix: the library's very first implementation used a different marker.
    // We still match it on read so existing records keep their image after the shared refactor.
    private static final String LEGACY_TITLE_PREFIX = '__SE_FR_RH_IMG__';

    /**
     * Returns the latest library-managed image URL for the given record, or null if none.
     */
    @AuraEnabled(cacheable=true)
    public static String getRecordImageUrl(Id recordId) {
        if (recordId == null) return null;
        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
            LIMIT 200
        ];
        if (links.isEmpty()) return null;
        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink l : links) docIds.add(l.ContentDocumentId);

        String currentLike = TITLE_PREFIX + '%';
        String legacyLike = LEGACY_TITLE_PREFIX + '%';
        List<ContentVersion> versions = [
            SELECT Id
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds
              AND IsLatest = true
              AND (Title LIKE :currentLike OR Title LIKE :legacyLike)
            ORDER BY CreatedDate DESC
            LIMIT 1
        ];
        if (versions.isEmpty()) return null;
        return '/sfc/servlet.shepherd/version/download/' + versions[0].Id;
    }

    /**
     * Bulk variant: returns a {recordId -> imageUrl} map for a list of records.
     * Used by components that render avatars for many records at once
     * (Contacts Carousel, etc.) so we don't need N round-trips.
     */
    @AuraEnabled(cacheable=true)
    public static Map<Id, String> getRecordImageUrls(List<Id> recordIds) {
        Map<Id, String> result = new Map<Id, String>();
        if (recordIds == null || recordIds.isEmpty()) return result;

        List<ContentDocumentLink> links = [
            SELECT LinkedEntityId, ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId IN :recordIds
        ];
        if (links.isEmpty()) return result;

        // doc -> set of records it's linked to (a doc can be shared)
        Map<Id, Set<Id>> docToRecords = new Map<Id, Set<Id>>();
        for (ContentDocumentLink l : links) {
            if (!docToRecords.containsKey(l.ContentDocumentId)) {
                docToRecords.put(l.ContentDocumentId, new Set<Id>());
            }
            docToRecords.get(l.ContentDocumentId).add(l.LinkedEntityId);
        }

        String currentLike = TITLE_PREFIX + '%';
        String legacyLike = LEGACY_TITLE_PREFIX + '%';
        // Latest image-marked ContentVersion per ContentDocument
        List<ContentVersion> versions = [
            SELECT Id, ContentDocumentId, CreatedDate
            FROM ContentVersion
            WHERE ContentDocumentId IN :docToRecords.keySet()
              AND IsLatest = true
              AND (Title LIKE :currentLike OR Title LIKE :legacyLike)
            ORDER BY CreatedDate DESC
        ];

        // For each record, pick the most recent image among its linked docs.
        // Iterating in DESC order means the first hit is the freshest.
        for (ContentVersion v : versions) {
            String url = '/sfc/servlet.shepherd/version/download/' + v.Id;
            for (Id recId : docToRecords.get(v.ContentDocumentId)) {
                if (!result.containsKey(recId)) {
                    result.put(recId, url);
                }
            }
        }
        return result;
    }

    /**
     * Uploads a replacement image, attaches it to the target record and returns its download URL.
     */
    @AuraEnabled
    public static String replaceRecordImage(Id recordId, String fileName, String base64Data) {
        if (recordId == null || String.isBlank(base64Data)) {
            throw new AuraHandledException('Missing required parameter.');
        }
        String safeName = String.isNotBlank(fileName) ? fileName : 'record-image.png';
        String title = TITLE_PREFIX + safeName;

        ContentVersion cv = new ContentVersion(
            Title = title,
            PathOnClient = safeName,
            VersionData = EncodingUtil.base64Decode(base64Data),
            IsMajorVersion = false
        );
        insert cv;

        ContentVersion inserted = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];
        ContentDocumentLink link = new ContentDocumentLink(
            ContentDocumentId = inserted.ContentDocumentId,
            LinkedEntityId = recordId,
            ShareType = 'V',
            Visibility = 'AllUsers'
        );
        insert link;

        return '/sfc/servlet.shepherd/version/download/' + inserted.Id;
    }
}
