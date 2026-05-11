public with sharing class SE_FR_ContactsCarouselController {

    /**
     * Wrapper: Contact + resolved photo URL.
     * The photo can come from two sources, in priority order:
     *   1. A library-managed image (ContentDocument tagged with the
     *      __SE_FR_IMG__ prefix, the same pattern Record Highlights /
     *      Contact Card / Related Record Card use). This is what an SE
     *      uploads via click-to-replace on those components.
     *   2. The standard Contact.PhotoURL field (rarely populated on a
     *      vanilla SDO unless social-contact sync is configured).
     */
    public class ContactRow {
        @AuraEnabled public Id id;
        @AuraEnabled public String name;
        @AuraEnabled public String title;
        @AuraEnabled public String department;
        @AuraEnabled public String email;
        @AuraEnabled public String phone;
        @AuraEnabled public Date lastActivityDate;
        @AuraEnabled public String photoUrl;
    }

    /**
     * Returns Contacts related to an Account, with photo URL resolved
     * from either ContentDocument (library pattern) or PhotoURL standard.
     * Schema-safe: detects Contact.PhotoURL automatically.
     */
    @AuraEnabled(cacheable=true)
    public static List<ContactRow> getContacts(Id accountId, Integer limitCount, String orderBy) {
        List<ContactRow> result = new List<ContactRow>();
        if (accountId == null) return result;
        Integer rows = (limitCount == null || limitCount <= 0) ? 24 : Math.min(limitCount, 100);

        Set<String> allowedOrders = new Set<String>{
            'LastActivityDate DESC NULLS LAST',
            'Name ASC',
            'CreatedDate DESC',
            'Title ASC NULLS LAST'
        };
        String safeOrderBy = allowedOrders.contains(orderBy) ? orderBy : 'LastActivityDate DESC NULLS LAST';

        Map<String, Schema.SObjectField> fields = Schema.SObjectType.Contact.fields.getMap();
        Boolean hasPhoto = fields.containsKey('photourl');

        String q = 'SELECT Id, Name, Title, Department, Email, Phone, LastActivityDate';
        if (hasPhoto) q += ', PhotoURL';
        q += ' FROM Contact WHERE AccountId = :accountId ORDER BY ' + safeOrderBy + ' LIMIT :rows';
        List<Contact> contacts = Database.query(q);
        if (contacts.isEmpty()) return result;

        // Resolve library-managed images in one batch round-trip.
        List<Id> contactIds = new List<Id>();
        for (Contact c : contacts) contactIds.add(c.Id);
        Map<Id, String> imageUrls = SE_FR_ImageFileController.getRecordImageUrls(contactIds);

        for (Contact c : contacts) {
            ContactRow row = new ContactRow();
            row.id = c.Id;
            row.name = c.Name;
            row.title = c.Title;
            row.department = c.Department;
            row.email = c.Email;
            row.phone = c.Phone;
            row.lastActivityDate = c.LastActivityDate;
            String libImage = imageUrls.get(c.Id);
            if (String.isNotBlank(libImage)) {
                row.photoUrl = libImage;
            } else if (hasPhoto) {
                row.photoUrl = (String) c.get('PhotoURL');
            }
            result.add(row);
        }
        return result;
    }
}
