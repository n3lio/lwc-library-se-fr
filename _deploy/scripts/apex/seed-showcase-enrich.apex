// CCO FR Showcase - enrichissement : scores contacts, contrats de service, documents. Idempotent.
Map<String,Integer[]> scores = new Map<String,Integer[]>{
  'Dupont' => new Integer[]{82,91,76}, 'Lefèvre' => new Integer[]{74,63,88}, 'Garcia' => new Integer[]{58,45,52},
  'Rousseau' => new Integer[]{67,80,71}, 'Lambert' => new Integer[]{49,38,60}, 'Moreau' => new Integer[]{88,92,85},
  'Bernard' => new Integer[]{71,55,64}, 'Martin' => new Integer[]{63,77,47}, 'Petit' => new Integer[]{91,84,93}
};
List<Contact> cs = [SELECT Id, LastName FROM Contact WHERE Account.Name IN ('Carrefour FR','Monoprix','Franprix')];
for (Contact c : cs) { Integer[] s = scores.get(c.LastName); if (s != null) { c.put('CCO_Engagement_Score__c', s[0]); c.put('CCO_Activity_Recency__c', s[1]); c.put('CCO_Email_Engagement__c', s[2]); } }
update cs;

Map<String,Contact> heroByAcc = new Map<String,Contact>();
for (Contact c : [SELECT Id, AccountId, Account.Name FROM Contact WHERE Account.Name IN ('Carrefour FR','Monoprix','Franprix') ORDER BY CreatedDate ASC]) if (!heroByAcc.containsKey(c.Account.Name)) heroByAcc.put(c.Account.Name, c);
if ([SELECT COUNT() FROM ServiceContract WHERE Name LIKE '%[seed]%'] == 0) {
  List<ServiceContract> scl = new List<ServiceContract>();
  for (String an : heroByAcc.keySet()) {
    Contact h = heroByAcc.get(an);
    scl.add(new ServiceContract(Name = 'Contrat Premium Support ' + an + ' [seed]', AccountId = h.AccountId, ContactId = h.Id, StartDate = Date.today().addMonths(-8), EndDate = Date.today().addMonths(16), Description = 'Support 24/7, SLA 4h, revue trimestrielle.'));
    scl.add(new ServiceContract(Name = 'Contrat Maintenance Linéaires ' + an + ' [seed]', AccountId = h.AccountId, ContactId = h.Id, StartDate = Date.today().addMonths(-2), EndDate = Date.today().addMonths(10), Description = 'Maintenance mobilier et PLV magasins.'));
  }
  insert scl;
}
if ([SELECT COUNT() FROM ContentVersion WHERE Title LIKE 'Contrat cadre%'] == 0) {
  String[][] docs = new String[][]{
    new String[]{'Contrat cadre 2026 - Carrefour FR','pdf','Contrat cadre de référencement 2026 - conditions commerciales, remises de fin d\'année, calendrier promotionnel.'},
    new String[]{'Plan promo Q4 - Biodentine','pdf','Plan promotionnel Q4 : têtes de gondole, PLV, opérations croisées MDD x marques nationales.'},
    new String[]{'Compte rendu visite magasin','pdf','Compte rendu de visite : relevé linéaire, ruptures constatées, actions convenues.'},
    new String[]{'Tarifs 2026 - grille fournisseur','csv','Reference,Produit,Prix HT\nNUT400,Nutella 400g,4.99\nEVI15,Evian 1,5L,1.49\nCC15,Coca-Cola 1,5L,2.19'}
  };
  List<ContentVersion> cvs = new List<ContentVersion>();
  for (String[] d : docs) {
    Blob b = d[1] == 'pdf' ? Blob.valueOf('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 60>>stream\nBT /F1 14 Tf 50 780 Td (' + d[0] + ') Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF') : Blob.valueOf(d[2]);
    cvs.add(new ContentVersion(Title = d[0], PathOnClient = d[0] + '.' + d[1], VersionData = b, Description = d[2]));
  }
  insert cvs;
  Contact hero = [SELECT Id, AccountId FROM Contact WHERE FirstName='Alexandre' AND LastName='Dupont' LIMIT 1];
  List<ContentDocumentLink> links = new List<ContentDocumentLink>();
  for (ContentVersion cv : [SELECT ContentDocumentId FROM ContentVersion WHERE Id IN :cvs]) {
    links.add(new ContentDocumentLink(ContentDocumentId = cv.ContentDocumentId, LinkedEntityId = hero.Id, ShareType = 'V'));
    links.add(new ContentDocumentLink(ContentDocumentId = cv.ContentDocumentId, LinkedEntityId = hero.AccountId, ShareType = 'V'));
  }
  insert links;
}
System.debug('ENRICH contracts=' + [SELECT COUNT() FROM ServiceContract] + ' docs=' + [SELECT COUNT() FROM ContentVersion WHERE Title LIKE 'Contrat cadre%']);
