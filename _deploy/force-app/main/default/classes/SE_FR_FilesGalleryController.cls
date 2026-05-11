public with sharing class SE_FR_FilesGalleryController {

    /**
     * Returns the ContentDocument records linked to a given record (any SObject). We go through
     * ContentDocumentLink.LinkedEntityId = :recordId and pull the latest version for each document.
     */
    @AuraEnabled(cacheable=true)
    public static List<FileItem> getFiles(Id recordId, Integer limitCount) {
        if (recordId == null) return new List<FileItem>();
        Integer rows = (limitCount == null || limitCount <= 0) ? 20 : Math.min(limitCount, 100);

        List<ContentDocumentLink> links = [
            SELECT ContentDocumentId
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :recordId
            ORDER BY SystemModstamp DESC
            LIMIT :rows
        ];
        if (links.isEmpty()) return new List<FileItem>();

        Set<Id> docIds = new Set<Id>();
        for (ContentDocumentLink l : links) docIds.add(l.ContentDocumentId);

        List<ContentVersion> versions = [
            SELECT Id, ContentDocumentId, Title, FileType, FileExtension, ContentSize, VersionNumber,
                   CreatedDate, Owner.Name
            FROM ContentVersion
            WHERE ContentDocumentId IN :docIds AND IsLatest = true
            ORDER BY CreatedDate DESC
        ];

        List<FileItem> items = new List<FileItem>();
        for (ContentVersion v : versions) {
            FileItem i = new FileItem();
            i.documentId = v.ContentDocumentId;
            i.versionId = v.Id;
            i.title = v.Title;
            i.fileType = v.FileType;
            i.fileExtension = v.FileExtension;
            i.sizeBytes = v.ContentSize;
            i.ownerName = v.Owner != null ? v.Owner.Name : null;
            i.createdDate = v.CreatedDate;
            items.add(i);
        }
        return items;
    }

    /**
     * Deletes a file (ContentDocument) entirely — removes the document itself, which cascades to
     * every ContentDocumentLink and ContentVersion. The running user must have delete permission
     * on the ContentDocument.
     */
    @AuraEnabled
    public static void deleteFile(Id contentDocumentId) {
        if (contentDocumentId == null) return;
        List<ContentDocument> docs = [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId LIMIT 1];
        if (!docs.isEmpty()) delete docs;
    }

    /**
     * Uploads a single file (base64) and links it to the current record. Returns the created
     * ContentDocumentId so the LWC can refresh the list. Library-internal helper used by the
     * custom dropzone (replaces lightning-file-upload to keep full layout control).
     */
    @AuraEnabled
    public static Id uploadFile(Id recordId, String fileName, String base64Data) {
        if (recordId == null || String.isBlank(base64Data)) return null;
        ContentVersion v = new ContentVersion();
        v.Title = String.isNotBlank(fileName) ? fileName : 'Upload';
        v.PathOnClient = v.Title;
        v.VersionData = EncodingUtil.base64Decode(base64Data);
        insert v;
        ContentVersion inserted = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :v.Id LIMIT 1];
        ContentDocumentLink link = new ContentDocumentLink();
        link.ContentDocumentId = inserted.ContentDocumentId;
        link.LinkedEntityId = recordId;
        link.ShareType = 'V';
        link.Visibility = 'AllUsers';
        insert link;
        return inserted.ContentDocumentId;
    }

    public class FileItem {
        @AuraEnabled public Id documentId;
        @AuraEnabled public Id versionId;
        @AuraEnabled public String title;
        @AuraEnabled public String fileType;
        @AuraEnabled public String fileExtension;
        @AuraEnabled public Decimal sizeBytes;
        @AuraEnabled public String ownerName;
        @AuraEnabled public DateTime createdDate;
    }
}
