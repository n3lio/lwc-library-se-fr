// Remplit tous les champs affichés dans les Record Details (layouts Showcase) : Contact, Account, Visit__c.
// Idempotent : réécrit les mêmes valeurs. sf apex run -o cco-fr-de -f _deploy/scripts/apex/seed-showcase-details.apex

// ---------- Accounts ----------
Map<String, Map<String, Object>> accData = new Map<String, Map<String, Object>>{
  'Carrefour FR' => new Map<String, Object>{'Rating'=>'Hot','Ownership'=>'Public','NumberOfEmployees'=>105000,'AccountNumber'=>'CAR-0001','Type'=>'Customer - Direct',
     'CustomerPriority__c'=>'High','SLA__c'=>'Platinum','Active__c'=>'Yes','UpsellOpportunity__c'=>'Yes','NumberofLocations__c'=>999,'SLASerialNumber__c'=>'CAR-7781','sla'=>365,
     'BillingStreet'=>'93 avenue de Paris','BillingPostalCode'=>'91300','BillingCity'=>'Massy','ShippingStreet'=>'Plateforme logistique, ZAC des Portes','ShippingPostalCode'=>'77290','ShippingCity'=>'Mitry-Mory',
     'Description'=>'Distributeur majeur, compte stratégique. Négociation annuelle des linéaires MDD et promotions croisées. Forte appétence pour les offres de drive-to-store.'},
  'Monoprix' => new Map<String, Object>{'Rating'=>'Warm','Ownership'=>'Subsidiary','NumberOfEmployees'=>21000,'AccountNumber'=>'MON-0002','Type'=>'Customer - Direct',
     'CustomerPriority__c'=>'Medium','SLA__c'=>'Gold','Active__c'=>'Yes','UpsellOpportunity__c'=>'Maybe','NumberofLocations__c'=>850,'SLASerialNumber__c'=>'MON-4420','sla'=>270,
     'BillingStreet'=>'14 rue Marc Bloch','BillingPostalCode'=>'92110','BillingCity'=>'Clichy','ShippingStreet'=>'Entrepôt régional Rhône-Alpes','ShippingPostalCode'=>'69800','ShippingCity'=>'Saint-Priest',
     'Description'=>'Enseigne de proximité urbaine premium. Fort sujet sur l\'offre bio et les nouveautés en exclusivité.'},
  'Franprix' => new Map<String, Object>{'Rating'=>'Warm','Ownership'=>'Subsidiary','NumberOfEmployees'=>9000,'AccountNumber'=>'FRA-0003','Type'=>'Customer - Direct',
     'CustomerPriority__c'=>'Medium','SLA__c'=>'Silver','Active__c'=>'Yes','UpsellOpportunity__c'=>'Yes','NumberofLocations__c'=>900,'SLASerialNumber__c'=>'FRA-1093','sla'=>180,
     'BillingStreet'=>'1 rue d\'Alésia','BillingPostalCode'=>'75014','BillingCity'=>'Paris','ShippingStreet'=>'Entrepôt Marseille Nord','ShippingPostalCode'=>'13015','ShippingCity'=>'Marseille',
     'Description'=>'Réseau de magasins de proximité intégrés et franchisés. Besoin de réassort rapide et de PLV adaptée aux petites surfaces.'}
};
List<Account> accs = [SELECT Id, Name FROM Account WHERE Name IN :accData.keySet()];
for (Account a : accs) {
  Map<String, Object> d = accData.get(a.Name);
  for (String k : d.keySet()) {
    if (k == 'sla') { a.SLAExpirationDate__c = Date.today().addDays((Integer) d.get(k)); continue; }
    a.put(k, d.get(k));
  }
  a.BillingCountry = 'France'; a.ShippingCountry = 'France';
}
update accs;

// ---------- Contacts ----------
// LastName => {Department, LeadSource, Birthdate, Level, Languages, Mobile, Home, OtherCity, Description, reportsToLastName}
Map<String, List<String>> cData = new Map<String, List<String>>{
  'Dupont'   => new List<String>{'Achats','Partner Referral','1978-04-12','Primary','Français, Anglais','+33 6 10 20 30 40','+33 1 45 20 10 01','Décideur final sur les référencements MDD. Préfère les points téléphoniques le mardi matin.',''},
  'Lefèvre'  => new List<String>{'Catégorie','Web','1984-09-03','Secondary','Français, Anglais','+33 6 11 21 31 41','+33 1 45 20 10 02','Pilote la catégorie épicerie et boissons. Très data-driven, demande des chiffres de rotation.','Dupont'},
  'Garcia'   => new List<String>{'Achats','Trade Show','1990-01-27','Tertiary','Français, Espagnol','+33 6 12 22 32 42','+33 1 45 20 10 03','Acheteur senior frais et crémerie. Contact opérationnel sur les commandes.','Dupont'},
  'Rousseau' => new List<String>{'Achats','Phone Inquiry','1986-06-18','Primary','Français, Anglais','+33 6 13 23 33 43','+33 4 72 00 10 04','Buyer en charge des nouveautés. Aime tester en magasin pilote avant généralisation.',''},
  'Lambert'  => new List<String>{'Magasin','Other','1981-11-09','Tertiary','Français','+33 6 14 24 34 44','+33 4 72 00 10 05','Chef de rayon magasin phare de Lyon. Remonte les ruptures en direct.','Rousseau'},
  'Moreau'   => new List<String>{'Catégorie','Partner Referral','1983-02-21','Primary','Français, Anglais, Italien','+33 6 15 25 35 45','+33 4 72 00 10 06','Category Manager bio et local. Sponsor naturel des opérations promotionnelles.',''},
  'Bernard'  => new List<String>{'Exploitation','Web','1987-07-30','Secondary','Français','+33 6 16 26 36 46','+33 4 91 00 10 07','Store manager d\'un magasin franchisé. Sensible à la PLV et à la facilité de réassort.','Petit'},
  'Martin'   => new List<String>{'Achats','Trade Show','1992-12-05','Tertiary','Français, Anglais','+33 6 17 27 37 47','+33 4 91 00 10 08','Buyer junior. En apprentissage des catalogues, très réactive.','Petit'},
  'Petit'    => new List<String>{'Direction régionale','Partner Referral','1975-03-14','Primary','Français, Anglais','+33 6 18 28 38 48','+33 4 91 00 10 09','Directeur régional PACA. Arbitre les budgets promotionnels.',''}
};
List<Contact> cons = [SELECT Id, LastName, AccountId, Account.BillingCity, Account.BillingStreet, Account.BillingPostalCode FROM Contact WHERE LastName IN :cData.keySet() AND Account.Name IN ('Carrefour FR','Monoprix','Franprix')];
Map<String, Id> idByLast = new Map<String, Id>();
for (Contact c : cons) idByLast.put(c.LastName, c.Id);
for (Contact c : cons) {
  List<String> d = cData.get(c.LastName);
  c.Department = d[0]; c.LeadSource = d[1]; c.Birthdate = Date.valueOf(d[2]); c.Level__c = d[3]; c.Languages__c = d[4];
  c.MobilePhone = d[5]; c.HomePhone = d[6]; c.Description = d[7];
  if (String.isNotBlank(d[8]) && idByLast.containsKey(d[8])) c.ReportsToId = idByLast.get(d[8]);
  c.MailingStreet = c.Account.BillingStreet; c.MailingPostalCode = c.Account.BillingPostalCode; c.MailingCity = c.Account.BillingCity; c.MailingCountry = 'France';
  c.OtherCity = 'Paris'; c.OtherStreet = '12 rue de la Paix'; c.OtherPostalCode = '75002'; c.OtherCountry = 'France';
}
update cons;

// ---------- Visits ----------
List<Visit__c> visits = [SELECT Id, VisitState__c, Account__r.Name, PlannedStartDateTime__c, PlannedEndDateTime__c, CheckInDateTime__c, CheckOutDateTime__c FROM Visit__c WHERE Account__r.Name IN ('Carrefour FR','Monoprix','Franprix')];
for (Visit__c v : visits) {
  String acc = v.Account__r.Name;
  if (v.PlannedStartDateTime__c == null) { v.PlannedStartDateTime__c = Datetime.now().addDays(7); v.PlannedEndDateTime__c = v.PlannedStartDateTime__c.addHours(2); }
  if (v.VisitState__c == 'Completed') {
    if (v.CheckInDateTime__c == null) v.CheckInDateTime__c = v.PlannedStartDateTime__c.addMinutes(5);
    if (v.CheckOutDateTime__c == null) v.CheckOutDateTime__c = v.PlannedEndDateTime__c.addMinutes(-10);
    v.Location__c = acc + ' - Magasin pilote';
    v.Notes__c = 'Revue du linéaire boissons et épicerie : 3 ruptures constatées (Evian 1,5L, Nutella 400g, Perrier citron). Part de linéaire en hausse sur les snacks. Demande de PLV supplémentaire pour la rentrée, interlocuteur réceptif à une promo croisée MDD x marque nationale.';
    v.Summary__c = '• Linéaire conforme à 92 % du planogramme\n• 3 ruptures à réassortir sous 48 h\n• PLV rentrée à livrer avant le 15\n• Prochaine étape : valider la promo croisée avec le category manager';
  } else if (v.VisitState__c == 'Planned') {
    v.Location__c = acc + ' - Entrepôt régional';
    v.Notes__c = 'RDV préparatoire campagne Q4 : valider le planning promotionnel, les volumes de réassort et les besoins en PLV.';
  }
}
update visits;
System.debug('DETAILS SEED OK: accounts=' + accs.size() + ' contacts=' + cons.size() + ' visits=' + visits.size());
