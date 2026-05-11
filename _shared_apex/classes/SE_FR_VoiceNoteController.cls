public with sharing class SE_FR_VoiceNoteController {

    @AuraEnabled
    public static String saveVoiceNoteAsTask(Id accountId, String noteText) {
        return saveVoiceNoteAsTaskWithSubject(accountId, noteText, 'Visit notes (voice dictation)');
    }

    @AuraEnabled
    public static String saveVoiceNoteAsTaskWithSubject(Id accountId, String noteText, String taskSubject) {
        return saveVoiceNoteForRecord(accountId, noteText, taskSubject);
    }

    // Routes the recordId correctly: Contacts go into Task.WhoId, everything else into Task.WhatId.
    @AuraEnabled
    public static String saveVoiceNoteForRecord(Id recordId, String noteText, String taskSubject) {
        if (String.isBlank(noteText)) {
            throw new AuraHandledException('The note is empty.');
        }

        try {
            Task newTask = new Task(
                Subject = String.isNotBlank(taskSubject) ? taskSubject : 'Visit notes (voice dictation)',
                Description = noteText,
                Status = 'Completed',
                ActivityDate = Date.today(),
                Priority = 'Normal'
            );

            if (recordId != null) {
                Schema.SObjectType sot = recordId.getSObjectType();
                String objName = sot != null ? String.valueOf(sot) : null;
                if (objName == 'Contact' || objName == 'Lead') {
                    newTask.WhoId = recordId;
                } else {
                    newTask.WhatId = recordId;
                }
            }

            insert newTask;
            return newTask.Id;

        } catch (Exception e) {
            throw new AuraHandledException('Error saving the note: ' + e.getMessage());
        }
    }
}
