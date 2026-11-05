// =============================================================================
// CCO FR Showcase — Seed data
// =============================================================================
// Idempotent. Running user becomes owner of all seeded records.
// Run with:
//   sf apex run -f _deploy/scripts/apex/seed-showcase-data.apex -o cco-fr-de
// =============================================================================

Id runningUserId = UserInfo.getUserId();

// ---------- Accounts (upsert by Name) ---------------------------------------
List<Account> accountsToUpsert = new List<Account>{
    new Account(Name = 'Carrefour FR', BillingCity = 'Paris', BillingCountry = 'France',
                BillingLatitude = 48.8566, BillingLongitude = 2.3522,
                Industry = 'Retail', Type = 'Customer - Direct',
                AnnualRevenue = 85000000000.0, Phone = '+33 1 40 64 76 00',
                Website = 'https://www.carrefour.fr', OwnerId = runningUserId),
    new Account(Name = 'Monoprix', BillingCity = 'Lyon', BillingCountry = 'France',
                BillingLatitude = 45.7640, BillingLongitude = 4.8357,
                Industry = 'Retail', Type = 'Customer - Direct',
                AnnualRevenue = 5000000000.0, Phone = '+33 1 78 99 90 00',
                Website = 'https://www.monoprix.fr', OwnerId = runningUserId),
    new Account(Name = 'Franprix', BillingCity = 'Marseille', BillingCountry = 'France',
                BillingLatitude = 43.2965, BillingLongitude = 5.3698,
                Industry = 'Retail', Type = 'Customer - Direct',
                AnnualRevenue = 1500000000.0, Phone = '+33 1 55 61 11 11',
                Website = 'https://www.franprix.fr', OwnerId = runningUserId)
};
Map<String, Account> existingByName = new Map<String, Account>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('Carrefour FR','Monoprix','Franprix')]) {
    existingByName.put(a.Name, a);
}
List<Account> toInsert = new List<Account>();
for (Account a : accountsToUpsert) {
    if (existingByName.containsKey(a.Name)) {
        a.Id = existingByName.get(a.Name).Id;
    } else {
        toInsert.add(a);
    }
}
if (!toInsert.isEmpty()) insert toInsert;
Map<String, Id> accIdByName = new Map<String, Id>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('Carrefour FR','Monoprix','Franprix')]) {
    accIdByName.put(a.Name, a.Id);
}
System.debug('Accounts: ' + accIdByName);

// ---------- Contacts (3 per account, upsert by LastName+AccountId) ----------
List<Contact> contactsToCreate = new List<Contact>();
Map<String, List<String[]>> contactsByAcc = new Map<String, List<String[]>>{
    'Carrefour FR' => new List<String[]>{
        new String[]{'Alexandre','Dupont','Directeur Achats','a.dupont@carrefour.fr','+33 6 10 20 30 40'},
        new String[]{'Marie','Lefèvre','Responsable Catégorie','m.lefevre@carrefour.fr','+33 6 11 21 31 41'},
        new String[]{'Nicolas','Garcia','Acheteur Senior','n.garcia@carrefour.fr','+33 6 12 22 32 42'}
    },
    'Monoprix' => new List<String[]>{
        new String[]{'Camille','Rousseau','Buyer','c.rousseau@monoprix.fr','+33 6 13 23 33 43'},
        new String[]{'Thomas','Lambert','Chef de rayon','t.lambert@monoprix.fr','+33 6 14 24 34 44'},
        new String[]{'Sophie','Moreau','Category Manager','s.moreau@monoprix.fr','+33 6 15 25 35 45'}
    },
    'Franprix' => new List<String[]>{
        new String[]{'Lucas','Bernard','Store Manager','l.bernard@franprix.fr','+33 6 16 26 36 46'},
        new String[]{'Léa','Martin','Buyer','l.martin@franprix.fr','+33 6 17 27 37 47'},
        new String[]{'Hugo','Petit','Directeur Régional','h.petit@franprix.fr','+33 6 18 28 38 48'}
    }
};
Set<String> existingContactKeys = new Set<String>();
for (Contact c : [SELECT FirstName, LastName, AccountId FROM Contact WHERE AccountId IN :accIdByName.values()]) {
    existingContactKeys.add(c.FirstName + '|' + c.LastName + '|' + c.AccountId);
}
for (String accName : contactsByAcc.keySet()) {
    Id accId = accIdByName.get(accName);
    for (String[] row : contactsByAcc.get(accName)) {
        String key = row[0] + '|' + row[1] + '|' + accId;
        if (existingContactKeys.contains(key)) continue;
        contactsToCreate.add(new Contact(
            FirstName = row[0], LastName = row[1], Title = row[2],
            Email = row[3], Phone = row[4], AccountId = accId,
            MailingCity = 'Paris', MailingCountry = 'France',
            OwnerId = runningUserId
        ));
    }
}
if (!contactsToCreate.isEmpty()) insert contactsToCreate;
System.debug('Contacts créés: ' + contactsToCreate.size());

// ---------- Opportunities (2 open per account) -------------------------------
List<Opportunity> oppsToCreate = new List<Opportunity>();
Map<Id, Integer> oppCountByAcc = new Map<Id, Integer>();
for (Opportunity o : [SELECT AccountId FROM Opportunity WHERE AccountId IN :accIdByName.values() AND IsClosed = false]) {
    Integer n = oppCountByAcc.get(o.AccountId);
    oppCountByAcc.put(o.AccountId, (n == null ? 1 : n+1));
}
for (String accName : accIdByName.keySet()) {
    Id accId = accIdByName.get(accName);
    Integer existing = oppCountByAcc.get(accId) == null ? 0 : oppCountByAcc.get(accId);
    if (existing >= 2) continue;
    Integer toCreateCount = 2 - existing;
    List<String[]> templates = new List<String[]>{
        new String[]{'Référencement MDD 2026 - ' + accName,'Prospecting','45000','60'},
        new String[]{'Déploiement linéaire Q4 - ' + accName,'Proposal/Price Quote','120000','75'}
    };
    for (Integer i = 0; i < toCreateCount && i < templates.size(); i++) {
        String[] t = templates[i];
        oppsToCreate.add(new Opportunity(
            Name = t[0], StageName = t[1],
            Amount = Decimal.valueOf(t[2]), Probability = Integer.valueOf(t[3]),
            CloseDate = Date.today().addMonths(2 + i),
            AccountId = accId, OwnerId = runningUserId
        ));
    }
}
if (!oppsToCreate.isEmpty()) insert oppsToCreate;
System.debug('Opportunities créées: ' + oppsToCreate.size());

// ---------- Cases (2 open per account) --------------------------------------
List<Case> casesToCreate = new List<Case>();
Map<Id, Integer> caseCountByAcc = new Map<Id, Integer>();
for (Case c : [SELECT AccountId FROM Case WHERE AccountId IN :accIdByName.values() AND IsClosed = false]) {
    Integer n = caseCountByAcc.get(c.AccountId);
    caseCountByAcc.put(c.AccountId, (n == null ? 1 : n+1));
}
for (String accName : accIdByName.keySet()) {
    Id accId = accIdByName.get(accName);
    Integer existing = caseCountByAcc.get(accId) == null ? 0 : caseCountByAcc.get(accId);
    if (existing >= 2) continue;
    Integer toCreateCount = 2 - existing;
    List<String[]> templates = new List<String[]>{
        new String[]{'Livraison incomplète du dernier Order','High','New','Phone'},
        new String[]{'Demande de refacturation Promo Été','Medium','Working','Email'}
    };
    for (Integer i = 0; i < toCreateCount && i < templates.size(); i++) {
        String[] t = templates[i];
        casesToCreate.add(new Case(
            Subject = t[0] + ' - ' + accName,
            Priority = t[1], Status = t[2], Origin = t[3],
            Description = 'Case généré par le seed Showcase CCO FR.',
            AccountId = accId, OwnerId = runningUserId
        ));
    }
}
if (!casesToCreate.isEmpty()) insert casesToCreate;
System.debug('Cases créés: ' + casesToCreate.size());

// ---------- Leads (2) --------------------------------------------------------
List<String[]> leadTemplates = new List<String[]>{
    new String[]{'Chloé','Durand','Casino Group','Head of Procurement','c.durand@casino.fr','Hot','Open - Not Contacted'},
    new String[]{'Antoine','Girard','Système U','Chief Buyer','a.girard@systeme-u.fr','Warm','Working - Contacted'}
};
Set<String> existingLeadEmails = new Set<String>();
for (Lead l : [SELECT Email FROM Lead WHERE Email IN ('c.durand@casino.fr','a.girard@systeme-u.fr')]) {
    existingLeadEmails.add(l.Email);
}
List<Lead> leadsToCreate = new List<Lead>();
for (String[] t : leadTemplates) {
    if (existingLeadEmails.contains(t[4])) continue;
    leadsToCreate.add(new Lead(
        FirstName = t[0], LastName = t[1], Company = t[2], Title = t[3],
        Email = t[4], Rating = t[5], Status = t[6],
        City = 'Paris', Country = 'France', OwnerId = runningUserId
    ));
}
if (!leadsToCreate.isEmpty()) insert leadsToCreate;
System.debug('Leads créés: ' + leadsToCreate.size());

// ---------- Orders (1 Draft per account) ------------------------------------
Map<Id, Integer> orderCountByAcc = new Map<Id, Integer>();
for (Order o : [SELECT AccountId FROM Order WHERE AccountId IN :accIdByName.values()]) {
    Integer n = orderCountByAcc.get(o.AccountId);
    orderCountByAcc.put(o.AccountId, (n == null ? 1 : n+1));
}
List<Order> ordersToCreate = new List<Order>();
for (String accName : accIdByName.keySet()) {
    Id accId = accIdByName.get(accName);
    Integer existing = orderCountByAcc.get(accId) == null ? 0 : orderCountByAcc.get(accId);
    if (existing >= 1) continue;
    ordersToCreate.add(new Order(
        AccountId = accId, Status = 'Draft',
        EffectiveDate = Date.today(), OwnerId = runningUserId
    ));
}
if (!ordersToCreate.isEmpty()) insert ordersToCreate;
System.debug('Orders créés: ' + ordersToCreate.size());

// ---------- Visits__c (2 per account: 1 Completed + 1 Planned future) -------
Map<Id, Integer> visitCountByAcc = new Map<Id, Integer>();
for (Visit__c v : [SELECT Account__c FROM Visit__c WHERE Account__c IN :accIdByName.values()]) {
    Integer n = visitCountByAcc.get(v.Account__c);
    visitCountByAcc.put(v.Account__c, (n == null ? 1 : n+1));
}
List<Visit__c> visitsToCreate = new List<Visit__c>();
for (String accName : accIdByName.keySet()) {
    Id accId = accIdByName.get(accName);
    Integer existing = visitCountByAcc.get(accId) == null ? 0 : visitCountByAcc.get(accId);
    if (existing >= 2) continue;
    // Completed visit (last week)
    if (existing < 1) {
        Datetime plannedStart = Datetime.now().addDays(-7).addHours(-2);
        Datetime plannedEnd   = plannedStart.addHours(2);
        Datetime checkIn      = plannedStart.addMinutes(5);
        Datetime checkOut     = plannedEnd.addMinutes(-10);
        visitsToCreate.add(new Visit__c(
            Account__c = accId, VisitState__c = 'Completed',
            PlannedStartDateTime__c = plannedStart, PlannedEndDateTime__c = plannedEnd,
            CheckInDateTime__c = checkIn, CheckOutDateTime__c = checkOut,
            Location__c = accName + ' - Siège',
            Notes__c = 'Visite de suivi : revue linéaire, remontée stock, demande de PLV supplémentaire pour la rentrée. Interlocuteur réceptif, propose une nouvelle promo croisée MDD × marque nationale.',
            Summary__c = '', OwnerId = runningUserId
        ));
    }
    // Planned future visit (next week)
    Datetime plannedStart2 = Datetime.now().addDays(7).addHours(0);
    Datetime plannedEnd2   = plannedStart2.addHours(2);
    visitsToCreate.add(new Visit__c(
        Account__c = accId, VisitState__c = 'Planned',
        PlannedStartDateTime__c = plannedStart2, PlannedEndDateTime__c = plannedEnd2,
        Location__c = accName + ' - Entrepôt régional',
        Notes__c = 'RDV préparatoire campagne Q4.',
        OwnerId = runningUserId
    ));
}
if (!visitsToCreate.isEmpty()) insert visitsToCreate;
System.debug('Visits créés: ' + visitsToCreate.size());

// ---------- Enrichissement commandes historiques --------------------------
// Pour les CPG Products (Nutella / Évian / etc.), PricebookEntries, et commandes
// historiques multi-mois avec OrderItems, exécuter en complément :
//     sf apex run -o cco-fr-de -f _deploy/scripts/apex/seed-showcase-orders.apex
// Script séparé pour rester sous les limites de l'anonymous Apex (symbol count +
// nested-generics). Idempotent, relançable sans risque.

// ---------- Récap final -----------------------------------------------------
System.debug('=== SEED SHOWCASE RÉCAP ===');
System.debug('Accounts total: ' + [SELECT COUNT() FROM Account WHERE Name IN :accIdByName.keySet()]);
System.debug('Contacts total: ' + [SELECT COUNT() FROM Contact WHERE AccountId IN :accIdByName.values()]);
System.debug('Opps open total: ' + [SELECT COUNT() FROM Opportunity WHERE AccountId IN :accIdByName.values() AND IsClosed = false]);
System.debug('Cases open total: ' + [SELECT COUNT() FROM Case WHERE AccountId IN :accIdByName.values() AND IsClosed = false]);
System.debug('Leads total: ' + [SELECT COUNT() FROM Lead WHERE Email IN ('c.durand@casino.fr','a.girard@systeme-u.fr')]);
System.debug('Orders total: ' + [SELECT COUNT() FROM Order WHERE AccountId IN :accIdByName.values()]);
System.debug('Visits total: ' + [SELECT COUNT() FROM Visit__c WHERE Account__c IN :accIdByName.values()]);
