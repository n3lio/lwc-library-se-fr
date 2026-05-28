/**
 * Returns team members related to a given record for the seFrSubscribersList component.
 *
 * Works on multiple objects:
 *   - Account → Owner + OpportunityTeamMembers on child Opps (deduplicated)
 *   - Opportunity → Owner + OpportunityTeamMembers
 *   - Case → Owner + Account Owner (if different)
 *   - Any other → Owner only
 *
 * Each returned member includes: UserId, Name, Role (UserRole.Name), SmallPhotoUrl.
 * Ordered by role weight (executives first, then managers, then agents).
 */
public with sharing class SE_FR_SubscribersListController {

    public class TeamMemberDTO {
        @AuraEnabled public Id     userId;
        @AuraEnabled public String name;
        @AuraEnabled public String role;
        @AuraEnabled public String photoUrl;
        @AuraEnabled public String initials;
    }

    @AuraEnabled(cacheable=true)
    public static List<TeamMemberDTO> getTeamMembers(Id recordId) {
        if (recordId == null) return new List<TeamMemberDTO>();

        String objectType = recordId.getSObjectType().getDescribe().getName();
        Map<Id, TeamMemberDTO> memberMap = new Map<Id, TeamMemberDTO>();

        // Always include the record Owner
        addOwner(recordId, objectType, memberMap);

        if (objectType == 'Account') {
            addOppTeamForAccount(recordId, memberMap);
        } else if (objectType == 'Opportunity') {
            addOppTeam(recordId, memberMap);
        } else if (objectType == 'Case') {
            addAccountOwnerForCase(recordId, memberMap);
        }

        // Sort by role weight
        List<TeamMemberDTO> result = memberMap.values();
        result.sort(new RoleWeightComparator());
        return result;
    }

    private static void addOwner(Id recordId, String objectType, Map<Id, TeamMemberDTO> memberMap) {
        String soql = 'SELECT OwnerId, Owner.Name, Owner.UserRole.Name, Owner.SmallPhotoUrl'
            + ' FROM ' + String.escapeSingleQuotes(objectType)
            + ' WHERE Id = :recordId LIMIT 1';
        List<SObject> records = Database.query(soql);
        if (records.isEmpty()) return;
        SObject rec = records[0];
        Id ownerId = (Id) rec.get('OwnerId');
        if (ownerId == null || String.valueOf(ownerId).startsWith('00G')) return; // skip queues
        SObject owner = rec.getSObject('Owner');
        if (owner == null) return;
        addUser(ownerId, owner, memberMap);
    }

    private static void addOppTeamForAccount(Id accountId, Map<Id, TeamMemberDTO> memberMap) {
        for (OpportunityTeamMember otm : [
            SELECT UserId, User.Name, User.UserRole.Name, User.SmallPhotoUrl
            FROM OpportunityTeamMember
            WHERE Opportunity.AccountId = :accountId
            ORDER BY User.Name
            LIMIT 50
        ]) {
            addUser(otm.UserId, otm.User, memberMap);
        }
    }

    private static void addOppTeam(Id oppId, Map<Id, TeamMemberDTO> memberMap) {
        for (OpportunityTeamMember otm : [
            SELECT UserId, User.Name, User.UserRole.Name, User.SmallPhotoUrl
            FROM OpportunityTeamMember
            WHERE OpportunityId = :oppId
            ORDER BY User.Name
            LIMIT 20
        ]) {
            addUser(otm.UserId, otm.User, memberMap);
        }
    }

    private static void addAccountOwnerForCase(Id caseId, Map<Id, TeamMemberDTO> memberMap) {
        List<Case> cases = [SELECT Account.OwnerId, Account.Owner.Name, Account.Owner.UserRole.Name, Account.Owner.SmallPhotoUrl FROM Case WHERE Id = :caseId AND AccountId != null LIMIT 1];
        if (cases.isEmpty()) return;
        SObject acct = cases[0].getSObject('Account');
        if (acct == null) return;
        SObject acctOwner = acct.getSObject('Owner');
        Id acctOwnerId = (Id) acct.get('OwnerId');
        if (acctOwnerId != null && acctOwner != null) {
            addUser(acctOwnerId, acctOwner, memberMap);
        }
    }

    private static void addUser(Id userId, SObject userRecord, Map<Id, TeamMemberDTO> memberMap) {
        if (userId == null || memberMap.containsKey(userId)) return;
        TeamMemberDTO dto = new TeamMemberDTO();
        dto.userId   = userId;
        dto.name     = (String) userRecord.get('Name');
        SObject userRole = userRecord.getSObject('UserRole');
        dto.role     = userRole != null ? (String) userRole.get('Name') : '';
        dto.photoUrl = (String) userRecord.get('SmallPhotoUrl');
        dto.initials = computeInitials(dto.name);
        memberMap.put(userId, dto);
    }

    private static String computeInitials(String name) {
        if (String.isBlank(name)) return '?';
        List<String> parts = name.trim().split('\\s+');
        if (parts.size() == 1) return parts[0].substring(0, Math.min(2, parts[0].length())).toUpperCase();
        return (parts[0].substring(0, 1) + parts[parts.size() - 1].substring(0, 1)).toUpperCase();
    }

    /**
     * Sort comparator: VP/Director/CEO first, then RVP, then Sales, then Service, then others.
     */
    public class RoleWeightComparator implements System.Comparator<TeamMemberDTO> {
        public Integer compare(TeamMemberDTO a, TeamMemberDTO b) {
            return weight(a.role) - weight(b.role);
        }
        private Integer weight(String role) {
            if (String.isBlank(role)) return 99;
            String r = role.toLowerCase();
            if (r.contains('ceo') || r.contains('vp') || r.contains('director')) return 1;
            if (r.contains('rvp') || r.contains('manager')) return 2;
            if (r.contains('sales') || r.contains('channel')) return 3;
            if (r.contains('engineer')) return 4;
            if (r.contains('service') || r.contains('agent')) return 5;
            return 10;
        }
    }
}
