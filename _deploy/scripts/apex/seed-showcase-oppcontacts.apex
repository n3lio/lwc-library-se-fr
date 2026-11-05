// CCO FR Showcase — rôles de contact sur les opportunités (Décideur principal). Idempotent.
Set<String> accNames = new Set<String>{'Carrefour FR','Monoprix','Franprix'};
Map<Id, List<Contact>> consByAcc = new Map<Id, List<Contact>>();
for (Contact c : [SELECT Id, AccountId FROM Contact WHERE Account.Name IN :accNames ORDER BY CreatedDate]) {
    if (!consByAcc.containsKey(c.AccountId)) consByAcc.put(c.AccountId, new List<Contact>());
    consByAcc.get(c.AccountId).add(c);
}
Set<Id> hasRole = new Set<Id>();
for (OpportunityContactRole r : [SELECT OpportunityId FROM OpportunityContactRole WHERE Opportunity.Account.Name IN :accNames]) hasRole.add(r.OpportunityId);
List<OpportunityContactRole> toIns = new List<OpportunityContactRole>();
String[] roles = new String[]{'Decision Maker','Influencer','Business User'};
for (Opportunity o : [SELECT Id, AccountId FROM Opportunity WHERE Account.Name IN :accNames]) {
    if (hasRole.contains(o.Id)) continue;
    List<Contact> cs = consByAcc.get(o.AccountId);
    if (cs == null) continue;
    for (Integer i = 0; i < cs.size() && i < 3; i++) {
        toIns.add(new OpportunityContactRole(OpportunityId = o.Id, ContactId = cs[i].Id, Role = roles[i], IsPrimary = (i == 0)));
    }
}
if (!toIns.isEmpty()) insert toIns;
System.debug('OCR créés: ' + toIns.size());
