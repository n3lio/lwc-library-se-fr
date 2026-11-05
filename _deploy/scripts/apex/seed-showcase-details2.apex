// Record Details — Lead / Opportunity / Case / Order. Idempotent.
// sf apex run -o cco-fr-de -f _deploy/scripts/apex/seed-showcase-details2.apex
Map<String, Map<String,Object>> leadData = new Map<String, Map<String,Object>>{
 'c.durand@casino.fr' => new Map<String,Object>{'Industry'=>'Retail','AnnualRevenue'=>9000000000.0,'NumberOfEmployees'=>45000,'Phone'=>'+33 4 77 45 45 45','MobilePhone'=>'+33 6 20 30 40 50','Website'=>'https://www.groupe-casino.fr','LeadSource'=>'Web','ProductInterest__c'=>'GC5000 series','CurrentGenerators__c'=>'Solution interne + Excel','NumberofLocations__c'=>999,'SICCode__c'=>'5411','Primary__c'=>'Yes','Street'=>'1 Esplanade de France','PostalCode'=>'42000','City'=>'Saint-Étienne','Description'=>'Responsable des achats groupe, rencontrée au salon Marca. Cherche à moderniser le suivi des promotions en magasin.'},
 'a.girard@systeme-u.fr' => new Map<String,Object>{'Industry'=>'Retail','AnnualRevenue'=>27000000000.0,'NumberOfEmployees'=>70000,'Phone'=>'+33 2 40 12 12 12','MobilePhone'=>'+33 6 21 31 41 51','Website'=>'https://www.magasins-u.com','LeadSource'=>'Partner Referral','ProductInterest__c'=>'GC3000 series','CurrentGenerators__c'=>'Outil historique d\'un éditeur tiers','NumberofLocations__c'=>999,'SICCode__c'=>'5411','Primary__c'=>'No','Street'=>'Rue Anatole France','PostalCode'=>'44800','City'=>'Saint-Herblain','Description'=>'Introduit par un partenaire intégrateur. Projet de référentiel produits commun entre coopérateurs.'}
};
List<Lead> leads = [SELECT Id, Email FROM Lead WHERE Email IN :leadData.keySet()];
for (Lead l : leads) { Map<String,Object> d = leadData.get(l.Email); for (String k : d.keySet()) l.put(k, d.get(k)); l.Country = 'France'; }
update leads;

List<String> competitors = new List<String>{'Éditeur local de merchandising','Solution interne','Éditeur sectoriel spécialisé'};
List<String> nexts = new List<String>{'Envoyer la proposition commerciale','Atelier de cadrage avec les achats','Démo terrain en magasin pilote','Valider le budget avec la direction'};
List<String> deliv = new List<String>{'In progress','Yet to begin','Completed'};
List<String> types = new List<String>{'Existing Customer - Upgrade','Existing Customer - Replacement','New Customer'};
List<String> sources = new List<String>{'Web','Partner Referral','Phone Inquiry'};
List<Opportunity> opps = [SELECT Id, Name FROM Opportunity WHERE Account.Name IN ('Carrefour FR','Monoprix','Franprix') ORDER BY Name];
Integer i = 0;
for (Opportunity o : opps) {
  o.Type = types[Math.mod(i,3)]; o.LeadSource = sources[Math.mod(i,3)]; o.NextStep = nexts[Math.mod(i,4)];
  o.MainCompetitors__c = competitors[Math.mod(i,3)]; o.CurrentGenerators__c = 'Outils internes et tableurs';
  o.DeliveryInstallationStatus__c = deliv[Math.mod(i,3)];
  o.OrderNumber__c = 'ORD' + String.valueOf(10000 + i * 7); o.TrackingNumber__c = 'TRK' + String.valueOf(900000 + i * 13);
  o.Description = 'Opportunité de développement : ' + o.Name + '. Enjeux : visibilité linéaire, rotation des références et efficacité des promotions.';
  i++;
}
update opps;

List<String> prods = new List<String>{'GC1040','GC3020','GC5040'}; List<String> reasons = new List<String>{'Installation','Performance','Feedback'};
List<String> ctypes = new List<String>{'Mechanical','Electronic','Other'};
List<Case> cases = [SELECT Id, Subject, Account.Name, AccountId FROM Case WHERE Account.Name IN ('Carrefour FR','Monoprix','Franprix') ORDER BY CaseNumber];
Map<Id, Contact> contactByAcc = new Map<Id, Contact>();
for (Contact c : [SELECT Id, AccountId, Name, Email, Phone FROM Contact WHERE Account.Name IN ('Carrefour FR','Monoprix','Franprix') ORDER BY LastName]) if (!contactByAcc.containsKey(c.AccountId)) contactByAcc.put(c.AccountId, c);
i = 0;
for (Case c : cases) {
  Contact ct = contactByAcc.get(c.AccountId);
  c.ContactId = ct.Id; c.SuppliedName = ct.Name; c.SuppliedEmail = ct.Email; c.SuppliedPhone = ct.Phone; c.SuppliedCompany = c.Account.Name;
  c.Product__c = prods[Math.mod(i,3)]; c.Reason = reasons[Math.mod(i,3)]; c.Type = ctypes[Math.mod(i,3)];
  c.EngineeringReqNumber__c = 'ENG-' + String.valueOf(4000 + i); c.SLAViolation__c = (Math.mod(i,3) == 0 ? 'Yes' : 'No'); c.PotentialLiability__c = (Math.mod(i,4) == 0 ? 'Yes' : 'No');
  c.Description = 'Contexte : ' + c.Subject + '. Le client signale un écart entre la commande et la livraison constatée en magasin. Action attendue : rapprochement avec la logistique et retour sous 48 h.';
  i++;
}
update cases;

List<Order> orders = [SELECT Id, Status, Description, Account.BillingStreet, Account.BillingCity, Account.BillingPostalCode, Account.ShippingStreet, Account.ShippingCity, Account.ShippingPostalCode FROM Order WHERE Account.Name IN ('Carrefour FR','Monoprix','Franprix')];
for (Order o : orders) {
  if (o.Status == 'Draft') {
    o.BillingStreet = o.Account.BillingStreet; o.BillingCity = o.Account.BillingCity; o.BillingPostalCode = o.Account.BillingPostalCode; o.BillingCountry = 'France';
    o.ShippingStreet = o.Account.ShippingStreet; o.ShippingCity = o.Account.ShippingCity; o.ShippingPostalCode = o.Account.ShippingPostalCode; o.ShippingCountry = 'France';
    if (String.isBlank(o.Description)) o.Description = 'Commande de réassort magasin, livraison en entrepôt régional sous 72 h.';
  }
}
List<Database.SaveResult> rs = Database.update(orders, false);
Integer ok = 0; for (Database.SaveResult r : rs) if (r.isSuccess()) ok++; else System.debug('ORDERERR ' + r.getErrors()[0].getMessage());
System.debug('DETAILS2 OK leads=' + leads.size() + ' opps=' + opps.size() + ' cases=' + cases.size() + ' orders=' + ok + '/' + orders.size());
