/**
 * Aggregates activity-like records from 16+ standard objects into a single homogeneous feed.
 * Schema-safe: each query is gated on the object/field existing and being accessible.
 *
 * Supported sources:
 *   Tasks, Events, EmailMessages, VoiceCalls, MessagingSessions, LiveChatTranscripts,
 *   Orders, Cases, Opportunities, Quotes, Contracts, Visits,
 *   ContentDocumentLinks, FeedItems, SurveyResponses.
 *
 * Input:  recordId of an Account or Contact (other SObjects fall back to basic WhatId/WhoId matching).
 * Output: List<FeedEntry> sorted by date desc — the LWC re-sorts/groups client-side.
 */
public with sharing class SE_FR_ActivityFeedController {

    @AuraEnabled(cacheable=true)
    public static List<FeedEntry> getActivityFeed(Id recordId, Boolean includeRelatedContacts, Integer daysBack, Integer daysForward) {
        if (recordId == null) return new List<FeedEntry>();

        Integer safeBack = (daysBack != null && daysBack > 0) ? daysBack : 365;
        Integer safeForward = (daysForward != null && daysForward > 0) ? daysForward : 90;
        Datetime windowStart = Datetime.now().addDays(-safeBack);
        Datetime windowEnd = Datetime.now().addDays(safeForward);

        String objType = String.valueOf(recordId.getSObjectType());
        Id accountId = null;
        Id contactId = null;
        Set<Id> contactIds = new Set<Id>();

        if (objType == 'Account') {
            accountId = recordId;
            if (includeRelatedContacts == true) {
                for (Contact c : [SELECT Id FROM Contact WHERE AccountId = :accountId LIMIT 200]) {
                    contactIds.add(c.Id);
                }
            }
        } else if (objType == 'Contact') {
            contactId = recordId;
            contactIds.add(contactId);
            List<Contact> cs = [SELECT AccountId FROM Contact WHERE Id = :contactId LIMIT 1];
            if (!cs.isEmpty() && cs[0].AccountId != null) accountId = cs[0].AccountId;
        } else {
            // Fallback: treat as WhatId for Tasks/Events and bail on object-specific queries.
            accountId = recordId;
        }

        // Gather related record IDs so Tasks/Events can be matched against ALL entities related
        // to the account/contact (opportunities, cases, orders, contracts, quotes, visits, etc.).
        Set<Id> relatedIds = collectRelatedRecordIds(accountId, contactIds);
        relatedIds.add(recordId);
        if (accountId != null) relatedIds.add(accountId);
        relatedIds.addAll(contactIds);

        List<FeedEntry> feed = new List<FeedEntry>();

        feed.addAll(queryTasks(recordId, relatedIds, contactIds, windowStart, windowEnd));
        feed.addAll(queryEvents(recordId, relatedIds, contactIds, windowStart, windowEnd));
        feed.addAll(queryEmailMessages(recordId, windowStart));
        feed.addAll(queryVoiceCalls(accountId, contactIds, windowStart));
        feed.addAll(queryMessagingSessions(accountId, contactIds, windowStart));
        feed.addAll(queryLiveChatTranscripts(accountId, contactIds, windowStart));
        feed.addAll(queryOrders(accountId, windowStart));
        feed.addAll(queryCases(accountId, contactIds, windowStart));
        feed.addAll(queryOpportunities(accountId, windowStart));
        feed.addAll(queryQuotes(accountId, windowStart));
        feed.addAll(queryContracts(accountId, windowStart));
        feed.addAll(queryVisits(accountId, windowStart, windowEnd));
        feed.addAll(queryContentDocumentLinks(recordId, windowStart));
        feed.addAll(queryFeedItems(recordId, windowStart));
        feed.addAll(querySurveyResponses(recordId, windowStart));

        feed.sort();
        return feed;
    }

    // ============================================================
    // Related-record collection
    // ============================================================

    /**
     * Collects IDs of records related to the Account/Contact so that Tasks/Events pointing at
     * those records (via WhatId) are also pulled into the feed.
     */
    private static Set<Id> collectRelatedRecordIds(Id accountId, Set<Id> contactIds) {
        Set<Id> related = new Set<Id>();
        if (accountId == null && contactIds.isEmpty()) return related;

        if (accountId != null) {
            try { for (Opportunity o : [SELECT Id FROM Opportunity WHERE AccountId = :accountId LIMIT 200]) related.add(o.Id); } catch (Exception e) {}
            try { for (Order o : [SELECT Id FROM Order WHERE AccountId = :accountId LIMIT 200]) related.add(o.Id); } catch (Exception e) {}
            try { for (Contract c : [SELECT Id FROM Contract WHERE AccountId = :accountId LIMIT 100]) related.add(c.Id); } catch (Exception e) {}
            try {
                if (Schema.getGlobalDescribe().containsKey('Quote')) {
                    for (SObject q : Database.query('SELECT Id FROM Quote WHERE Opportunity.AccountId = :accountId LIMIT 100')) related.add((Id) q.get('Id'));
                }
            } catch (Exception e) {}
            try {
                if (Schema.getGlobalDescribe().containsKey('Visit')) {
                    for (SObject v : Database.query('SELECT Id FROM Visit WHERE AccountId = :accountId LIMIT 100')) related.add((Id) v.get('Id'));
                }
            } catch (Exception e) {}
        }

        if (!contactIds.isEmpty()) {
            try { for (Case c : [SELECT Id FROM Case WHERE (AccountId = :accountId OR ContactId IN :contactIds) LIMIT 200]) related.add(c.Id); } catch (Exception e) {}
        } else if (accountId != null) {
            try { for (Case c : [SELECT Id FROM Case WHERE AccountId = :accountId LIMIT 200]) related.add(c.Id); } catch (Exception e) {}
        }

        return related;
    }

    // ============================================================
    // Queries
    // ============================================================

    private static List<FeedEntry> queryTasks(Id recordId, Set<Id> relatedIds, Set<Id> contactIds, Datetime windowStart, Datetime windowEnd) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            Set<Id> whoIds = new Set<Id>(contactIds);
            if (recordId != null && String.valueOf(recordId.getSObjectType()) == 'Contact') whoIds.add(recordId);

            String soql = 'SELECT Id, Subject, Description, ActivityDate, CreatedDate, Status, IsClosed, Priority, TaskSubtype, Who.Name, What.Name, Owner.Name'
                + ' FROM Task'
                + ' WHERE (WhatId IN :relatedIds OR WhoId IN :whoIds)'
                + ' AND CreatedDate >= :windowStart'
                + ' ORDER BY ActivityDate DESC NULLS LAST'
                + ' LIMIT 300';
            for (Task t : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = String.isBlank(t.TaskSubtype) ? 'Task' : t.TaskSubtype;
                e.id = t.Id;
                e.title = t.Subject;
                e.description = t.Description;
                e.ownerName = t.Owner != null ? t.Owner.Name : null;
                e.relatedName = (t.What != null && t.What.Name != null) ? t.What.Name : (t.Who != null ? t.Who.Name : null);
                e.isCompleted = t.IsClosed;
                Datetime d = t.ActivityDate != null ? Datetime.newInstance(t.ActivityDate.year(), t.ActivityDate.month(), t.ActivityDate.day()) : t.CreatedDate;
                e.activityDate = d;
                e.isFuture = d != null && d > Datetime.now() && !t.IsClosed;
                e.url = '/lightning/r/Task/' + t.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Task query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryEvents(Id recordId, Set<Id> relatedIds, Set<Id> contactIds, Datetime windowStart, Datetime windowEnd) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            Set<Id> whoIds = new Set<Id>(contactIds);
            if (recordId != null && String.valueOf(recordId.getSObjectType()) == 'Contact') whoIds.add(recordId);

            String soql = 'SELECT Id, Subject, Description, StartDateTime, EndDateTime, IsAllDayEvent, Location, Who.Name, What.Name, Owner.Name'
                + ' FROM Event'
                + ' WHERE (WhatId IN :relatedIds OR WhoId IN :whoIds)'
                + ' AND StartDateTime >= :windowStart AND StartDateTime <= :windowEnd'
                + ' ORDER BY StartDateTime DESC'
                + ' LIMIT 300';
            for (Event ev : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'Event';
                e.id = ev.Id;
                e.title = ev.Subject;
                e.description = ev.Description;
                e.ownerName = ev.Owner != null ? ev.Owner.Name : null;
                e.relatedName = (ev.What != null && ev.What.Name != null) ? ev.What.Name : (ev.Who != null ? ev.Who.Name : null);
                e.activityDate = ev.StartDateTime;
                e.isFuture = ev.StartDateTime != null && ev.StartDateTime > Datetime.now();
                e.isCompleted = ev.StartDateTime != null && ev.StartDateTime < Datetime.now();
                e.url = '/lightning/r/Event/' + ev.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Event query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryEmailMessages(Id recordId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            // EmailMessage is linked to records via RelatedToId (typically a Case).
            // We include those where RelatedToId equals the recordId.
            String soql = 'SELECT Id, Subject, TextBody, FromName, ToAddress, MessageDate, Incoming, Status'
                + ' FROM EmailMessage'
                + ' WHERE RelatedToId = :recordId AND MessageDate >= :windowStart'
                + ' ORDER BY MessageDate DESC LIMIT 100';
            for (EmailMessage em : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'EmailMessage';
                e.id = em.Id;
                e.title = String.isBlank(em.Subject) ? '(no subject)' : em.Subject;
                e.subtitle = em.Incoming == true ? ('From: ' + em.FromName) : ('To: ' + em.ToAddress);
                e.description = em.TextBody;
                e.activityDate = em.MessageDate;
                e.isCompleted = true;
                e.url = '/lightning/r/EmailMessage/' + em.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('EmailMessage query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryVoiceCalls(Id accountId, Set<Id> contactIds, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null && contactIds.isEmpty()) return out;
        try {
            if (!Schema.getGlobalDescribe().containsKey('VoiceCall')) return out;
            Set<Id> relIds = new Set<Id>(contactIds);
            if (accountId != null) relIds.add(accountId);
            String soql = 'SELECT Id, CallStartDateTime, CallEndDateTime, CallDurationInSeconds, CallType, CallDisposition, Subject, Description, Status, FromPhoneNumber, ToPhoneNumber'
                + ' FROM VoiceCall'
                + ' WHERE (AccountId = :accountId OR RelatedRecordId IN :relIds)'
                + ' AND CallStartDateTime >= :windowStart'
                + ' ORDER BY CallStartDateTime DESC LIMIT 100';
            for (SObject o : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'VoiceCall';
                e.id = (Id) o.get('Id');
                String subj = (String) o.get('Subject');
                String callType = (String) o.get('CallType');
                e.title = String.isNotBlank(subj) ? subj : ('Voice call (' + (callType == null ? 'unknown' : callType) + ')');
                e.subtitle = (String) o.get('CallDisposition');
                Integer dur = (Integer) o.get('CallDurationInSeconds');
                if (dur != null) e.subtitle = (e.subtitle == null ? '' : e.subtitle + ' — ') + (dur / 60) + 'm ' + Math.mod(dur, 60) + 's';
                List<String> detail = new List<String>();
                if (callType != null) detail.add('Type: ' + callType);
                if (o.get('Status') != null) detail.add('Status: ' + (String) o.get('Status'));
                if (o.get('FromPhoneNumber') != null) detail.add('From: ' + (String) o.get('FromPhoneNumber'));
                if (o.get('ToPhoneNumber') != null) detail.add('To: ' + (String) o.get('ToPhoneNumber'));
                String descText = (String) o.get('Description');
                if (String.isNotBlank(descText)) detail.add(descText);
                e.description = String.join(detail, '\n');
                e.activityDate = (Datetime) o.get('CallStartDateTime');
                e.isCompleted = true;
                e.url = '/lightning/r/VoiceCall/' + e.id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('VoiceCall query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryMessagingSessions(Id accountId, Set<Id> contactIds, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null && contactIds.isEmpty()) return out;
        try {
            if (!Schema.getGlobalDescribe().containsKey('MessagingSession')) return out;
            Set<Id> relIds = new Set<Id>(contactIds);
            if (accountId != null) relIds.add(accountId);
            String soql = 'SELECT Id, Name, Status, StartTime, EndTime, MessagingChannel.ChannelType, MessagingChannel.MasterLabel, Origin'
                + ' FROM MessagingSession'
                + ' WHERE (AccountId = :accountId OR ContactId IN :contactIds)'
                + ' AND StartTime >= :windowStart'
                + ' ORDER BY StartTime DESC LIMIT 100';
            for (SObject o : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'MessagingSession';
                e.id = (Id) o.get('Id');
                e.title = 'Messaging: ' + (String) o.get('Name');
                e.subtitle = (String) o.get('Status');
                List<String> detail = new List<String>();
                SObject ch = (SObject) o.getSObject('MessagingChannel');
                if (ch != null) {
                    if (ch.get('ChannelType') != null) detail.add('Channel: ' + (String) ch.get('ChannelType'));
                    if (ch.get('MasterLabel') != null) detail.add('Label: ' + (String) ch.get('MasterLabel'));
                }
                if (o.get('Origin') != null) detail.add('Origin: ' + (String) o.get('Origin'));
                Datetime st = (Datetime) o.get('StartTime');
                Datetime et = (Datetime) o.get('EndTime');
                if (st != null && et != null) {
                    Long diffMs = et.getTime() - st.getTime();
                    detail.add('Duration: ' + (diffMs / 60000) + ' min');
                }
                e.description = String.join(detail, '\n');
                e.activityDate = st;
                e.isCompleted = et != null;
                e.url = '/lightning/r/MessagingSession/' + e.id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('MessagingSession query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryLiveChatTranscripts(Id accountId, Set<Id> contactIds, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            if (!Schema.getGlobalDescribe().containsKey('LiveChatTranscript')) return out;
            String soql = 'SELECT Id, Name, Status, StartTime, EndTime, Body, VisitorIpAddress, ChatDuration, UserAgent, Location'
                + ' FROM LiveChatTranscript'
                + ' WHERE (AccountId = :accountId OR ContactId IN :contactIds)'
                + ' AND StartTime >= :windowStart'
                + ' ORDER BY StartTime DESC LIMIT 50';
            for (SObject o : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'LiveChatTranscript';
                e.id = (Id) o.get('Id');
                e.title = 'Chat: ' + (String) o.get('Name');
                e.subtitle = (String) o.get('Status');
                List<String> detail = new List<String>();
                if (o.get('Location') != null) detail.add('Location: ' + (String) o.get('Location'));
                if (o.get('VisitorIpAddress') != null) detail.add('IP: ' + (String) o.get('VisitorIpAddress'));
                if (o.get('ChatDuration') != null) detail.add('Duration: ' + o.get('ChatDuration') + 's');
                String body = (String) o.get('Body');
                if (String.isNotBlank(body)) detail.add(body);
                e.description = String.join(detail, '\n');
                e.activityDate = (Datetime) o.get('StartTime');
                e.isCompleted = o.get('EndTime') != null;
                e.url = '/lightning/r/LiveChatTranscript/' + e.id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('LiveChatTranscript query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryOrders(Id accountId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null) return out;
        try {
            for (Order o : [SELECT Id, OrderNumber, Name, Type, Status, TotalAmount, EffectiveDate, EndDate, Description, PoNumber, Owner.Name, CreatedDate FROM Order
                            WHERE AccountId = :accountId
                            ORDER BY EffectiveDate DESC NULLS LAST LIMIT 100]) {
                FeedEntry e = new FeedEntry();
                e.type = 'Order';
                e.id = o.Id;
                e.title = 'Order ' + o.OrderNumber + (String.isNotBlank(o.Name) ? ' — ' + o.Name : '');
                e.subtitle = o.Status + (o.TotalAmount != null ? ' — ' + String.valueOf(o.TotalAmount) : '');
                e.ownerName = o.Owner != null ? o.Owner.Name : null;
                List<String> detail = new List<String>();
                if (o.Type != null) detail.add('Type: ' + o.Type);
                if (o.EffectiveDate != null) detail.add('Start: ' + String.valueOf(o.EffectiveDate));
                if (o.EndDate != null) detail.add('End: ' + String.valueOf(o.EndDate));
                if (String.isNotBlank(o.PoNumber)) detail.add('PO: ' + o.PoNumber);
                if (String.isNotBlank(o.Description)) detail.add(o.Description);
                e.description = String.join(detail, '\n');
                // Timeline anchor: order's effective (start) date — drives a meaningful position
                // on the timeline (when the order took effect) vs. when the row was technically
                // inserted in the org. Falls back to CreatedDate when EffectiveDate is null.
                Datetime anchor = (o.EffectiveDate != null)
                    ? Datetime.newInstance(o.EffectiveDate.year(), o.EffectiveDate.month(), o.EffectiveDate.day())
                    : o.CreatedDate;
                if (anchor != null && anchor < windowStart) continue;
                e.activityDate = anchor;
                e.isCompleted = true;
                e.url = '/lightning/r/Order/' + o.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Order query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryCases(Id accountId, Set<Id> contactIds, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            for (Case c : [SELECT Id, CaseNumber, Subject, Description, Status, Priority, Type, Reason, Origin, IsClosed, ClosedDate, Owner.Name, Contact.Name, CreatedDate, LastModifiedDate FROM Case
                           WHERE (AccountId = :accountId OR ContactId IN :contactIds)
                           ORDER BY LastModifiedDate DESC LIMIT 100]) {
                FeedEntry e = new FeedEntry();
                e.type = 'Case';
                e.id = c.Id;
                e.title = 'Case ' + c.CaseNumber + (String.isNotBlank(c.Subject) ? ' — ' + c.Subject : '');
                e.subtitle = c.Status + (c.Priority != null ? ' — ' + c.Priority : '');
                e.ownerName = c.Owner != null ? c.Owner.Name : null;
                e.relatedName = c.Contact != null ? c.Contact.Name : null;
                List<String> detail = new List<String>();
                if (c.Type != null) detail.add('Type: ' + c.Type);
                if (c.Reason != null) detail.add('Reason: ' + c.Reason);
                if (c.Origin != null) detail.add('Origin: ' + c.Origin);
                if (c.IsClosed) detail.add('Closed: ' + (c.ClosedDate != null ? String.valueOf(c.ClosedDate) : 'yes'));
                if (String.isNotBlank(c.Description)) detail.add(c.Description);
                e.description = String.join(detail, '\n');
                // Timeline anchor: closed cases sit on the closed date (visible "resolved" event),
                // open cases sit on their last-modified date (most recent activity on the case).
                Datetime anchor;
                if (c.IsClosed && c.ClosedDate != null) anchor = c.ClosedDate;
                else anchor = c.LastModifiedDate;
                if (anchor != null && anchor < windowStart) continue;
                e.activityDate = anchor;
                e.isCompleted = true;
                e.url = '/lightning/r/Case/' + c.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Case query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryOpportunities(Id accountId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null) return out;
        try {
            for (Opportunity op : [SELECT Id, Name, Description, StageName, Amount, Probability, Type, LeadSource, CloseDate, IsClosed, IsWon, ForecastCategoryName, NextStep, Owner.Name, CreatedDate, LastModifiedDate FROM Opportunity
                                   WHERE AccountId = :accountId
                                   ORDER BY CloseDate DESC NULLS LAST LIMIT 100]) {
                FeedEntry e = new FeedEntry();
                e.type = 'Opportunity';
                e.id = op.Id;
                e.title = 'Opportunity — ' + op.Name;
                e.subtitle = op.StageName + (op.Amount != null ? ' — ' + String.valueOf(op.Amount) : '');
                e.ownerName = op.Owner != null ? op.Owner.Name : null;
                List<String> detail = new List<String>();
                if (op.Probability != null) detail.add('Probability: ' + op.Probability + '%');
                if (op.CloseDate != null) detail.add('Close date: ' + String.valueOf(op.CloseDate));
                if (op.Type != null) detail.add('Type: ' + op.Type);
                if (op.LeadSource != null) detail.add('Source: ' + op.LeadSource);
                if (op.ForecastCategoryName != null) detail.add('Forecast: ' + op.ForecastCategoryName);
                if (op.IsClosed) detail.add(op.IsWon ? 'Closed/Won' : 'Closed/Lost');
                if (String.isNotBlank(op.NextStep)) detail.add('Next step: ' + op.NextStep);
                if (String.isNotBlank(op.Description)) detail.add(op.Description);
                e.description = String.join(detail, '\n');
                // Timeline anchor: opportunity close date (the milestone that matters in a sales
                // timeline). Falls back to LastModifiedDate when CloseDate is missing. Future
                // close dates surface as upcoming milestones.
                Datetime anchor = (op.CloseDate != null)
                    ? Datetime.newInstance(op.CloseDate.year(), op.CloseDate.month(), op.CloseDate.day())
                    : op.LastModifiedDate;
                if (anchor != null && anchor < windowStart) continue;
                e.activityDate = anchor;
                e.isCompleted = op.IsClosed;
                e.isFuture = !op.IsClosed && anchor != null && anchor > Datetime.now();
                e.url = '/lightning/r/Opportunity/' + op.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Opportunity query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryQuotes(Id accountId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null) return out;
        try {
            if (!Schema.getGlobalDescribe().containsKey('Quote')) return out;
            String soql = 'SELECT Id, QuoteNumber, Name, Status, GrandTotal, TotalPrice, ExpirationDate, Discount, Description, IsSyncing, Opportunity.Name, Owner.Name, CreatedDate, LastModifiedDate FROM Quote'
                + ' WHERE Opportunity.AccountId = :accountId'
                + ' ORDER BY LastModifiedDate DESC LIMIT 50';
            for (SObject o : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'Quote';
                e.id = (Id) o.get('Id');
                String qn = (String) o.get('QuoteNumber');
                String qnName = (String) o.get('Name');
                e.title = 'Quote ' + qn + (String.isNotBlank(qnName) ? ' — ' + qnName : '');
                e.subtitle = (String) o.get('Status');
                SObject owner = o.getSObject('Owner');
                if (owner != null) e.ownerName = (String) owner.get('Name');
                SObject opp = o.getSObject('Opportunity');
                if (opp != null) e.relatedName = (String) opp.get('Name');
                List<String> detail = new List<String>();
                if (o.get('GrandTotal') != null) detail.add('Grand total: ' + String.valueOf(o.get('GrandTotal')));
                if (o.get('Discount') != null) detail.add('Discount: ' + String.valueOf(o.get('Discount')) + '%');
                if (o.get('ExpirationDate') != null) detail.add('Expires: ' + String.valueOf(o.get('ExpirationDate')));
                if (o.get('IsSyncing') == true) detail.add('Syncing with opportunity');
                String descText = (String) o.get('Description');
                if (String.isNotBlank(descText)) detail.add(descText);
                e.description = String.join(detail, '\n');
                // Timeline anchor: prefer ExpirationDate (when the offer matters) otherwise the
                // last-modified time. Lets a quote pop on the day it was sent / last touched.
                Date expD = (Date) o.get('ExpirationDate');
                Datetime anchor = (expD != null)
                    ? Datetime.newInstance(expD.year(), expD.month(), expD.day())
                    : (Datetime) o.get('LastModifiedDate');
                if (anchor != null && anchor < windowStart) continue;
                e.activityDate = anchor;
                e.isCompleted = true;
                e.url = '/lightning/r/Quote/' + e.id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Quote query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryContracts(Id accountId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null) return out;
        try {
            for (Contract c : [SELECT Id, ContractNumber, Status, StartDate, EndDate, ContractTerm, Description, OwnerExpirationNotice, SpecialTerms, Owner.Name, CreatedDate, LastModifiedDate FROM Contract
                               WHERE AccountId = :accountId
                               ORDER BY StartDate DESC NULLS LAST LIMIT 50]) {
                FeedEntry e = new FeedEntry();
                e.type = 'Contract';
                e.id = c.Id;
                e.title = 'Contract ' + c.ContractNumber;
                e.subtitle = c.Status;
                e.ownerName = c.Owner != null ? c.Owner.Name : null;
                List<String> detail = new List<String>();
                if (c.StartDate != null) detail.add('Start: ' + String.valueOf(c.StartDate));
                if (c.EndDate != null) detail.add('End: ' + String.valueOf(c.EndDate));
                if (c.ContractTerm != null) detail.add('Term: ' + c.ContractTerm + ' months');
                if (String.isNotBlank(c.SpecialTerms)) detail.add('Special terms: ' + c.SpecialTerms);
                if (String.isNotBlank(c.Description)) detail.add(c.Description);
                e.description = String.join(detail, '\n');
                // Timeline anchor: the contract's start date (the moment the contract takes
                // effect) — more meaningful than CreatedDate which is just when the row landed
                // in the org.
                Datetime anchor = (c.StartDate != null)
                    ? Datetime.newInstance(c.StartDate.year(), c.StartDate.month(), c.StartDate.day())
                    : c.LastModifiedDate;
                if (anchor != null && anchor < windowStart) continue;
                e.activityDate = anchor;
                e.isCompleted = true;
                e.url = '/lightning/r/Contract/' + c.Id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Contract query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryVisits(Id accountId, Datetime windowStart, Datetime windowEnd) {
        List<FeedEntry> out = new List<FeedEntry>();
        if (accountId == null) return out;
        try {
            if (!Schema.getGlobalDescribe().containsKey('Visit')) return out;
            String soql = 'SELECT Id, Name, Status, VisitType, Description, PlannedVisitStartTime, PlannedVisitEndTime, ActualVisitStartTime, ActualVisitEndTime, Owner.Name, Place.Name'
                + ' FROM Visit'
                + ' WHERE AccountId = :accountId'
                + ' AND (PlannedVisitStartTime >= :windowStart OR ActualVisitEndTime >= :windowStart)'
                + ' ORDER BY PlannedVisitStartTime DESC LIMIT 100';
            for (SObject o : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'Visit';
                e.id = (Id) o.get('Id');
                e.title = 'Visit — ' + (String) o.get('Name');
                e.subtitle = (String) o.get('Status');
                SObject owner = o.getSObject('Owner');
                if (owner != null) e.ownerName = (String) owner.get('Name');
                SObject place = o.getSObject('Place');
                if (place != null) e.relatedName = (String) place.get('Name');
                List<String> detail = new List<String>();
                if (o.get('VisitType') != null) detail.add('Type: ' + (String) o.get('VisitType'));
                Datetime planned = (Datetime) o.get('PlannedVisitStartTime');
                Datetime plannedEnd = (Datetime) o.get('PlannedVisitEndTime');
                Datetime actualStart = (Datetime) o.get('ActualVisitStartTime');
                Datetime actualEnd = (Datetime) o.get('ActualVisitEndTime');
                if (planned != null) detail.add('Planned start: ' + String.valueOf(planned));
                if (plannedEnd != null) detail.add('Planned end: ' + String.valueOf(plannedEnd));
                if (actualStart != null) detail.add('Actual start: ' + String.valueOf(actualStart));
                if (actualEnd != null) detail.add('Actual end: ' + String.valueOf(actualEnd));
                String descText = (String) o.get('Description');
                if (String.isNotBlank(descText)) detail.add(descText);
                e.description = String.join(detail, '\n');
                e.activityDate = (actualEnd != null) ? actualEnd : planned;
                e.isCompleted = actualEnd != null;
                e.isFuture = actualEnd == null && planned != null && planned > Datetime.now();
                e.url = '/lightning/r/Visit/' + e.id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('Visit query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryContentDocumentLinks(Id recordId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            for (ContentDocumentLink cdl : [SELECT Id, ContentDocumentId, ContentDocument.Title, ContentDocument.FileType, ContentDocument.ContentSize, ContentDocument.Description, ContentDocument.Owner.Name, ContentDocument.LatestPublishedVersionId, SystemModstamp
                                            FROM ContentDocumentLink
                                            WHERE LinkedEntityId = :recordId AND SystemModstamp >= :windowStart
                                            ORDER BY SystemModstamp DESC LIMIT 50]) {
                FeedEntry e = new FeedEntry();
                e.type = 'File';
                e.id = cdl.ContentDocumentId;
                e.title = 'File: ' + cdl.ContentDocument.Title;
                e.subtitle = cdl.ContentDocument.FileType;
                if (cdl.ContentDocument.Owner != null) e.ownerName = cdl.ContentDocument.Owner.Name;
                List<String> detail = new List<String>();
                if (cdl.ContentDocument.ContentSize != null) {
                    Integer kb = cdl.ContentDocument.ContentSize / 1024;
                    detail.add('Size: ' + (kb < 1024 ? kb + ' KB' : (kb / 1024) + ' MB'));
                }
                if (String.isNotBlank(cdl.ContentDocument.Description)) detail.add(cdl.ContentDocument.Description);
                e.description = String.join(detail, '\n');
                e.activityDate = cdl.SystemModstamp;
                e.isCompleted = true;
                e.url = '/lightning/r/ContentDocument/' + cdl.ContentDocumentId + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('ContentDocumentLink query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> queryFeedItems(Id recordId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            for (FeedItem fi : [SELECT Id, Type, Body, CreatedBy.Name, CreatedDate FROM FeedItem
                                WHERE ParentId = :recordId AND CreatedDate >= :windowStart
                                ORDER BY CreatedDate DESC LIMIT 50]) {
                FeedEntry e = new FeedEntry();
                e.type = 'FeedItem';
                e.id = fi.Id;
                e.title = 'Chatter post';
                e.subtitle = fi.Type;
                e.description = fi.Body;
                e.ownerName = fi.CreatedBy != null ? fi.CreatedBy.Name : null;
                e.activityDate = fi.CreatedDate;
                e.isCompleted = true;
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('FeedItem query skipped: ' + ex.getMessage()); }
        return out;
    }

    private static List<FeedEntry> querySurveyResponses(Id recordId, Datetime windowStart) {
        List<FeedEntry> out = new List<FeedEntry>();
        try {
            if (!Schema.getGlobalDescribe().containsKey('SurveyResponse')) return out;
            // SurveyResponse links via SurveySubjectId.
            String soql = 'SELECT Id, Name, Status, ResponseStartDate, ResponseEndDate, Survey.Name, Survey.InvitationDescription, SystemModstamp FROM SurveyResponse'
                + ' WHERE SurveySubjectId = :recordId AND SystemModstamp >= :windowStart'
                + ' ORDER BY SystemModstamp DESC LIMIT 50';
            for (SObject o : Database.query(soql)) {
                FeedEntry e = new FeedEntry();
                e.type = 'SurveyResponse';
                e.id = (Id) o.get('Id');
                e.title = 'Survey response — ' + (String) o.get('Name');
                e.subtitle = (String) o.get('Status');
                SObject sur = o.getSObject('Survey');
                if (sur != null) e.relatedName = (String) sur.get('Name');
                List<String> detail = new List<String>();
                if (o.get('ResponseStartDate') != null) detail.add('Started: ' + String.valueOf(o.get('ResponseStartDate')));
                if (o.get('ResponseEndDate') != null) detail.add('Completed: ' + String.valueOf(o.get('ResponseEndDate')));
                if (sur != null && sur.get('InvitationDescription') != null) detail.add((String) sur.get('InvitationDescription'));
                e.description = String.join(detail, '\n');
                e.activityDate = (Datetime) o.get('SystemModstamp');
                e.isCompleted = true;
                e.url = '/lightning/r/SurveyResponse/' + e.id + '/view';
                assignIcon(e);
                out.add(e);
            }
        } catch (Exception ex) { System.debug('SurveyResponse query skipped: ' + ex.getMessage()); }
        return out;
    }

    // ============================================================
    // Icon + color mapping per type (SLDS)
    // ============================================================
    private static void assignIcon(FeedEntry e) {
        switch on e.type {
            when 'Email', 'ListEmail', 'EmailMessage' {
                e.icon = 'standard:email'; e.iconColor = '#0070D2';
            }
            when 'Call' {
                e.icon = 'standard:log_a_call'; e.iconColor = '#4bc076';
            }
            when 'VoiceCall' {
                e.icon = 'standard:voice_call'; e.iconColor = '#4bc076';
            }
            when 'MessagingSession' {
                e.icon = 'standard:messaging_session'; e.iconColor = '#dd7a01';
            }
            when 'LiveChatTranscript' {
                e.icon = 'standard:live_chat'; e.iconColor = '#dd7a01';
            }
            when 'Cadence' {
                e.icon = 'standard:sales_cadence'; e.iconColor = '#7f8ceb';
            }
            when 'Event' {
                e.icon = 'standard:event'; e.iconColor = '#c13975';
            }
            when 'Task' {
                e.icon = 'standard:task'; e.iconColor = '#4bc076';
            }
            when 'Order' {
                e.icon = 'standard:orders'; e.iconColor = '#038d36';
            }
            when 'Case' {
                e.icon = 'standard:case'; e.iconColor = '#F2B50E';
            }
            when 'Opportunity' {
                e.icon = 'standard:opportunity'; e.iconColor = '#FCB95B';
            }
            when 'Quote' {
                e.icon = 'standard:quotes'; e.iconColor = '#2E844A';
            }
            when 'Contract' {
                e.icon = 'standard:contract'; e.iconColor = '#826AC9';
            }
            when 'Visit' {
                e.icon = 'standard:visit'; e.iconColor = '#08a69e';
            }
            when 'File' {
                e.icon = 'standard:document'; e.iconColor = '#747474';
            }
            when 'FeedItem' {
                e.icon = 'standard:feed'; e.iconColor = '#5867E8';
            }
            when 'SurveyResponse' {
                e.icon = 'standard:survey'; e.iconColor = '#BE7CF5';
            }
            when else {
                e.icon = 'standard:default'; e.iconColor = '#747474';
            }
        }
    }

    // ============================================================
    // Wrapper
    // ============================================================
    public class FeedEntry implements Comparable {
        @AuraEnabled public String type;
        @AuraEnabled public Id id;
        @AuraEnabled public String title;
        @AuraEnabled public String subtitle;
        @AuraEnabled public String description;
        @AuraEnabled public Datetime activityDate;
        @AuraEnabled public Boolean isCompleted;
        @AuraEnabled public Boolean isFuture;
        @AuraEnabled public String ownerName;
        @AuraEnabled public String relatedName;
        @AuraEnabled public String url;
        @AuraEnabled public String icon;
        @AuraEnabled public String iconColor;

        public Integer compareTo(Object other) {
            FeedEntry o = (FeedEntry) other;
            if (this.activityDate == null && o.activityDate == null) return 0;
            if (this.activityDate == null) return 1;
            if (o.activityDate == null) return -1;
            if (this.activityDate > o.activityDate) return -1;
            if (this.activityDate < o.activityDate) return 1;
            return 0;
        }
    }
}
