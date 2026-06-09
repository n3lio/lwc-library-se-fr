public with sharing class SE_FR_AgendaController {

    // ------------------------------------------------------------------
    // Tasks (used by seFrMyTasks)
    // ------------------------------------------------------------------

    @AuraEnabled(cacheable=true)
    public static List<Task> getMyTasks(String filter, Integer maxRows) {
        Id userId = UserInfo.getUserId();
        Integer limitRows = (maxRows == null || maxRows <= 0) ? 10 : Math.min(maxRows, 50);

        String query = 'SELECT Id, Subject, ActivityDate, Status, Priority, WhoId, Who.Name, WhatId, What.Name '
                     + 'FROM Task WHERE OwnerId = :userId ';

        if (filter == 'Today') {
            query += ' AND ActivityDate = TODAY AND IsClosed = false ';
        } else if (filter == 'Upcoming') {
            query += ' AND ActivityDate >= TODAY AND IsClosed = false ';
        } else if (filter == 'Overdue') {
            query += ' AND ActivityDate < TODAY AND IsClosed = false ';
        } else if (filter == 'Completed') {
            query += ' AND IsClosed = true ';
        } else {
            query += ' AND IsClosed = false ';
        }

        query += ' ORDER BY ActivityDate ASC NULLS LAST LIMIT ' + limitRows;
        return Database.query(query);
    }

    // ------------------------------------------------------------------
    // Events (used by seFrMyEvents)
    // ------------------------------------------------------------------

    @AuraEnabled(cacheable=true)
    public static List<Event> getMyEvents(Integer daysAhead, Integer maxRows) {
        Id userId = UserInfo.getUserId();
        Integer days = (daysAhead == null || daysAhead <= 0) ? 1 : Math.min(daysAhead, 30);
        Integer limitRows = (maxRows == null || maxRows <= 0) ? 20 : Math.min(maxRows, 100);

        DateTime startRange = DateTime.newInstance(Date.today(), Time.newInstance(0, 0, 0, 0));
        DateTime endRange = startRange.addDays(days);

        return [
            SELECT Id, Subject, StartDateTime, EndDateTime, IsAllDayEvent, Location, Description, Type,
                   WhoId, Who.Name, WhatId, What.Name, OwnerId
            FROM Event
            WHERE OwnerId = :userId
              AND StartDateTime < :endRange
              AND EndDateTime >= :startRange
            ORDER BY StartDateTime ASC
            LIMIT :limitRows
        ];
    }
}
