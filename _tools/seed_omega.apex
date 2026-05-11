// Seeds demo-ready sample data on Omega, Inc. for the SE_FR_Library showcase org.
// Contract: DOES NOT touch the data model. Only updates existing records or creates standard
// SObject instances with required fields. Safe to re-run (idempotent where possible).

Id OMEGA_ID = '001J900000Jz1FuIAJ';
Id USER_ID = UserInfo.getUserId();
Date today = Date.today();

// ---------------------------------------------------------------------------
// 1. Opportunities — spread CloseDates across 6 rolling months, vary stages so
//    seFrPipelineSnapshot shows multiple columns (not everything "Closed Won").
// ---------------------------------------------------------------------------
List<Opportunity> opps = [SELECT Id, StageName, CloseDate, Probability FROM Opportunity WHERE AccountId = :OMEGA_ID ORDER BY CreatedDate];
if (opps.size() >= 6) {
    // Targeted distribution: 1 Prospecting, 2 Qualification, 2 Needs Analysis, 2 Proposal, 1 Negotiation, rest Closed Won.
    String[] stages = new String[]{
        'Prospecting', 'Qualification', 'Qualification',
        'Needs Analysis', 'Needs Analysis',
        'Proposal/Price Quote', 'Proposal/Price Quote',
        'Negotiation/Review'
    };
    Integer[] monthOffsets = new Integer[]{ 1, 2, 3, 2, 4, 1, 5, 2 };
    for (Integer i = 0; i < opps.size(); i++) {
        Opportunity o = opps[i];
        if (i < stages.size()) {
            o.StageName = stages[i];
            o.CloseDate = today.addMonths(monthOffsets[i]).toStartOfMonth().addDays(15);
        } else {
            // Remaining = Closed Won, spread across the past 6 months so Revenue Dashboard looks alive
            o.StageName = 'Closed Won';
            o.CloseDate = today.addMonths(-1 - (i - stages.size())).toStartOfMonth().addDays(10);
        }
    }
    update opps;
    System.debug('Opportunities updated: ' + opps.size());
}

// ---------------------------------------------------------------------------
// 2. Orders — spread EffectiveDate across 24 rolling months. Keep ~85% Activated,
//    ~15% Draft, so seFrTelesalesRepHome has something to show under "to validate"
//    and seFrMetricTile / seFrCustomerOrders have a full history.
// ---------------------------------------------------------------------------
// Orders are left as-is: EffectiveDate is locked once Activated, and Draft orders are constrained
// by their Contract.StartDate. The existing seed data already spans 24+ months naturally thanks
// to CreatedDate variation, which is enough for seFrCustomerOrders / seFrMetricTile.
System.debug('Orders: skipped (dates constrained by contract / activation — existing spread is acceptable).');

// ---------------------------------------------------------------------------
// 3. Cases — last 90 days, mixed statuses, some open.
// ---------------------------------------------------------------------------
List<Case> cases = [SELECT Id, Status, Priority FROM Case WHERE AccountId = :OMEGA_ID ORDER BY CreatedDate];
String[] caseStatuses = new String[]{ 'New', 'Working', 'Working', 'Closed', 'Escalated', 'New', 'Waiting on Customer', 'Closed' };
for (Integer i = 0; i < cases.size(); i++) {
    Case c = cases[i];
    c.Status = caseStatuses[Math.mod(i, caseStatuses.size())];
    c.Priority = Math.mod(i, 3) == 0 ? 'High' : (Math.mod(i, 3) == 1 ? 'Medium' : 'Low');
}
update cases;
System.debug('Cases updated: ' + cases.size());

// ---------------------------------------------------------------------------
// 4. Events — create 6 future events on the next 14 days, owner = running user.
//    Types varied for Activity Feed + seFrMyEvents colour palette. Skip if already
//    seeded (check a marker subject prefix) to keep the Apex re-runnable.
// ---------------------------------------------------------------------------
String SEED_PREFIX = '[SE_FR] ';
Integer existing = [SELECT count() FROM Event WHERE OwnerId = :USER_ID AND Subject LIKE :SEED_PREFIX + '%'];
if (existing == 0) {
    // Pick an Omega contact to relate the events to — makes them discoverable via Activity Feed.
    List<Contact> omegaContacts = [SELECT Id FROM Contact WHERE AccountId = :OMEGA_ID LIMIT 1];
    Id sampleWhoId = omegaContacts.isEmpty() ? null : omegaContacts[0].Id;

    List<Event> events = new List<Event>();
    String[] eventTitles = new String[]{
        'Strategy review with Omega',
        'Quarterly business review',
        'Demo — new platform',
        'Renewal call with Director',
        'Training — onboarding',
        'Prep call — executive visit'
    };
    String[] eventTypes = new String[]{ 'Meeting', 'Call', 'Demo', 'Call', 'Training', 'Meeting' };
    Integer[] dayOffsets = new Integer[]{ 1, 3, 5, 7, 10, 13 };
    Integer[] startHours = new Integer[]{ 9, 11, 14, 10, 16, 15 };
    for (Integer i = 0; i < eventTitles.size(); i++) {
        DateTime start = DateTime.newInstance(today.addDays(dayOffsets[i]), Time.newInstance(startHours[i], 0, 0, 0));
        events.add(new Event(
            Subject = SEED_PREFIX + eventTitles[i],
            StartDateTime = start,
            EndDateTime = start.addMinutes(45),
            Type = eventTypes[i],
            WhoId = sampleWhoId,
            WhatId = OMEGA_ID,
            OwnerId = USER_ID,
            Description = 'Seeded by SE_FR_Library data enrichment script.'
        ));
    }
    insert events;
    System.debug('Events created: ' + events.size());
} else {
    System.debug('Events already seeded (' + existing + ' matching).');
}

// ---------------------------------------------------------------------------
// 5. Contacts — refresh LastActivityDate indirectly via a fresh Task per contact.
//    (LastActivityDate is computed by Salesforce and cannot be set directly.)
// ---------------------------------------------------------------------------
List<Contact> omegaContacts = [SELECT Id, Name FROM Contact WHERE AccountId = :OMEGA_ID];
List<Task> freshTasks = new List<Task>();
Integer taskIdx = 0;
for (Contact c : omegaContacts) {
    // Skip contacts that already have a recent seeded task — keep the script idempotent.
    Integer recent = [SELECT count() FROM Task WHERE WhoId = :c.Id AND Subject LIKE :SEED_PREFIX + '%' AND ActivityDate >= :today.addDays(-14)];
    if (recent > 0) continue;
    freshTasks.add(new Task(
        Subject = SEED_PREFIX + 'Recent follow-up',
        Status = 'Completed',
        Priority = 'Normal',
        ActivityDate = today.addDays(-(taskIdx * 2)),  // stagger so LastActivityDate differs per contact
        WhoId = c.Id,
        WhatId = OMEGA_ID,
        OwnerId = USER_ID
    ));
    taskIdx++;
}
if (!freshTasks.isEmpty()) {
    insert freshTasks;
    System.debug('Contact-related tasks seeded: ' + freshTasks.size());
}

// ---------------------------------------------------------------------------
// 6. Files — attach sample files if none on Omega.
//    We create a ContentVersion (auto-creates a ContentDocument) + ContentDocumentLink.
// ---------------------------------------------------------------------------
Integer existingLinks = [SELECT count() FROM ContentDocumentLink WHERE LinkedEntityId = :OMEGA_ID];
if (existingLinks < 2) {
    // 3 distinct sample files — text-only content, small, safe in any org.
    Map<String, String> sampleFiles = new Map<String, String>{
        'Omega_Strategy_2026.txt'        => 'Omega Strategy 2026\n\nKey priorities:\n- Renew expiring contracts Q2\n- Expand data platform\n- Upsell premium support\n',
        'Omega_Contract_Summary.txt'     => 'Contract Summary\n\nStarted: 2024-06-01\nRenewal: 2026-06-01\nAnnual value: $285,000\n',
        'Omega_Onboarding_Checklist.txt' => 'Onboarding Checklist\n\n[x] Kickoff meeting\n[x] Platform access\n[ ] First QBR\n[ ] Admin training\n'
    };
    List<ContentVersion> versions = new List<ContentVersion>();
    for (String title : sampleFiles.keySet()) {
        versions.add(new ContentVersion(
            Title = title.replace('.txt', ''),
            PathOnClient = title,
            VersionData = Blob.valueOf(sampleFiles.get(title))
        ));
    }
    insert versions;
    List<Id> docIds = new List<Id>();
    for (ContentVersion v : [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :versions]) {
        docIds.add(v.ContentDocumentId);
    }
    List<ContentDocumentLink> links = new List<ContentDocumentLink>();
    for (Id docId : docIds) {
        links.add(new ContentDocumentLink(
            LinkedEntityId = OMEGA_ID,
            ContentDocumentId = docId,
            ShareType = 'V',        // Viewer
            Visibility = 'AllUsers'
        ));
    }
    insert links;
    System.debug('Sample files attached: ' + links.size());
} else {
    System.debug('Files already present on Omega (' + existingLinks + ' links).');
}

System.debug('==== Omega, Inc. data enrichment completed ====');
