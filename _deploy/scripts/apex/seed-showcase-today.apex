// Seed "aujourd'hui" : visites du jour + tâches du jour (alimente Tournée du jour / Checklist). Idempotent (marker).
String MARK = '[seed:today]';
Id uid = UserInfo.getUserId();
Map<String, Account> accs = new Map<String, Account>();
for (Account a : [SELECT Id, Name FROM Account WHERE Name IN ('Carrefour FR','Monoprix','Franprix')]) accs.put(a.Name, a);
if (accs.isEmpty()) return;
Date d = Date.today();
Datetime dayStart = Datetime.newInstance(d, Time.newInstance(0,0,0,0));
Datetime dayEnd = dayStart.addDays(1);
if ([SELECT COUNT() FROM Visit__c WHERE PlannedStartDateTime__c >= :dayStart AND PlannedStartDateTime__c < :dayEnd] == 0) {
    List<Visit__c> vs = new List<Visit__c>();
    String[][] plan = new String[][]{
        new String[]{'Carrefour FR','9','Carrefour Market - Paris 11'},
        new String[]{'Monoprix','11','Monoprix - Lyon Part-Dieu'},
        new String[]{'Franprix','14','Franprix - Marseille Prado'},
        new String[]{'Carrefour FR','16','Carrefour City - Paris 15'}
    };
    for (String[] p : plan) {
        Account a = accs.get(p[0]); if (a == null) continue;
        Datetime s = Datetime.newInstance(d, Time.newInstance(Integer.valueOf(p[1]),0,0,0));
        vs.add(new Visit__c(Account__c = a.Id, VisitState__c = 'Planned', PlannedStartDateTime__c = s,
            PlannedEndDateTime__c = s.addHours(1), Location__c = p[2], Notes__c = 'Visite magasin : relevé linéaire et réassort. ' + MARK, OwnerId = uid));
    }
    insert vs;
    System.debug('Visits today: ' + vs.size());
}
if ([SELECT COUNT() FROM Task WHERE Subject LIKE 'Terrain :%' AND ActivityDate = :d] == 0) {
    List<Task> ts = new List<Task>();
    String[] subj = new String[]{'Terrain : vérifier les prix en rayon','Terrain : photographier le linéaire','Terrain : relancer la commande de réassort','Terrain : mettre à jour le planogramme'};
    for (String s : subj) ts.add(new Task(Subject = s, ActivityDate = d, Status = 'Not Started', Priority = 'Normal', OwnerId = uid, WhatId = accs.values()[0].Id));
    insert ts;
    System.debug('Tasks today: ' + ts.size());
}

// Events du jour (alimente l'agenda / Tournée du jour)
Datetime evStart = Datetime.newInstance(d, Time.newInstance(0,0,0,0));
Datetime evEnd = evStart.addDays(1);
if ([SELECT COUNT() FROM Event WHERE StartDateTime >= :evStart AND StartDateTime < :evEnd AND Subject LIKE 'Visite :%'] == 0) {
    List<Event> es = new List<Event>();
    String[][] ep = new String[][]{
        new String[]{'Carrefour FR','9','Visite : Carrefour Market Paris 11'},
        new String[]{'Monoprix','11','Visite : Monoprix Lyon Part-Dieu'},
        new String[]{'Franprix','14','Visite : Franprix Marseille Prado'},
        new String[]{'Carrefour FR','16','Visite : Carrefour City Paris 15'}
    };
    for (String[] p : ep) {
        Account a = accs.get(p[0]); if (a == null) continue;
        Datetime s = Datetime.newInstance(d, Time.newInstance(Integer.valueOf(p[1]),0,0,0));
        es.add(new Event(Subject = p[2], WhatId = a.Id, StartDateTime = s, EndDateTime = s.addHours(1), OwnerId = uid, Location = p[2].substringAfter(': ')));
    }
    insert es;
    System.debug('Events today: ' + es.size());
}
