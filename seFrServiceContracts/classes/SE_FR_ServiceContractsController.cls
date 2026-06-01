/**
 * Returns active service contracts for an Account, with the count of open work orders
 * per contract — used by the seFrServiceContracts LWC on Account record pages.
 *
 * Works in two modes:
 *   STANDARD (no custom fields needed) — queries Name, ContractNumber, StartDate, EndDate,
 *   Description + WorkOrder.Status for open WO count. Ready to use on any SDO.
 *
 *   FULL (optional custom fields) — if Metier__c, SLA_Heures__c, Email_Prestataire__c,
 *   Perimetre_Couvert__c exist on ServiceContract and Statut_Intervention__c exists on
 *   WorkOrder, the component displays category badges, SLA formatting, contractor email
 *   and scope. See README for setup instructions.
 */
public with sharing class SE_FR_ServiceContractsController {

    public class ContractDTO {
        @AuraEnabled public Id      id;
        @AuraEnabled public String  name;
        @AuraEnabled public String  contractNumber;
        @AuraEnabled public String  metier;
        @AuraEnabled public Decimal slaHeures;
        @AuraEnabled public String  email;
        @AuraEnabled public String  perimetre;
        @AuraEnabled public Date    startDate;
        @AuraEnabled public Date    endDate;
        @AuraEnabled public Integer openWorkOrders;
    }

    @AuraEnabled(cacheable=true)
    public static List<ContractDTO> getContracts(Id recordId) {
        if (recordId == null) return new List<ContractDTO>();

        // Resolve the recordId to a list of ServiceContract Ids depending on the host object.
        // Some hosts (Account, Case, Contact, Opportunity) walk to the parent Account; WorkOrder
        // can either point directly to a ServiceContract OR carry an AccountId we walk to.
        Id accountId = null;
        Set<Id> directContractIds = new Set<Id>();
        String objectType = recordId.getSObjectType().getDescribe().getName();

        if (objectType == 'Account') {
            accountId = recordId;
        } else if (objectType == 'Case') {
            for (Case c : [SELECT AccountId FROM Case WHERE Id = :recordId LIMIT 1]) accountId = c.AccountId;
        } else if (objectType == 'Contact') {
            for (Contact c : [SELECT AccountId FROM Contact WHERE Id = :recordId LIMIT 1]) accountId = c.AccountId;
        } else if (objectType == 'Opportunity') {
            for (Opportunity o : [SELECT AccountId FROM Opportunity WHERE Id = :recordId LIMIT 1]) accountId = o.AccountId;
        } else if (objectType == 'WorkOrder') {
            for (WorkOrder w : [SELECT AccountId, ServiceContractId FROM WorkOrder WHERE Id = :recordId LIMIT 1]) {
                accountId = w.AccountId;
                if (w.ServiceContractId != null) directContractIds.add(w.ServiceContractId);
            }
        } else {
            // Future-friendly: try a generic OwnerId-less AccountId resolution if the object exposes one.
            try {
                List<SObject> generic = Database.query('SELECT AccountId FROM ' + String.escapeSingleQuotes(objectType) + ' WHERE Id = :recordId LIMIT 1');
                if (!generic.isEmpty()) accountId = (Id) generic[0].get('AccountId');
            } catch (Exception ignored) {
                // Object has no AccountId field — return empty.
            }
        }

        if (accountId == null && directContractIds.isEmpty()) return new List<ContractDTO>();

        // Detect custom fields on ServiceContract
        Map<String, Schema.SObjectField> scFields = Schema.SObjectType.ServiceContract.fields.getMap();
        Boolean hasMetier    = scFields.containsKey('metier__c');
        Boolean hasSla       = scFields.containsKey('sla_heures__c');
        Boolean hasEmail     = scFields.containsKey('email_prestataire__c');
        Boolean hasPerimetre = scFields.containsKey('perimetre_couvert__c');

        // Build dynamic SOQL for ServiceContract
        List<String> fields = new List<String>{
            'Id', 'Name', 'ContractNumber', 'StartDate', 'EndDate', 'Description'
        };
        if (hasMetier)    fields.add('Metier__c');
        if (hasSla)       fields.add('SLA_Heures__c');
        if (hasEmail)     fields.add('Email_Prestataire__c');
        if (hasPerimetre) fields.add('Perimetre_Couvert__c');

        // WHERE clause: AccountId match OR direct contract id match (for WorkOrder).
        String whereClause;
        if (accountId != null && !directContractIds.isEmpty()) {
            whereClause = '(AccountId = :accountId OR Id IN :directContractIds)';
        } else if (accountId != null) {
            whereClause = 'AccountId = :accountId';
        } else {
            whereClause = 'Id IN :directContractIds';
        }

        String soql = 'SELECT ' + String.join(fields, ', ')
            + ' FROM ServiceContract'
            + ' WHERE ' + whereClause
            + ' ORDER BY ' + (hasMetier ? 'Metier__c ASC NULLS LAST, Name ASC' : 'Name ASC');

        List<SObject> contracts = Database.query(soql);
        if (contracts.isEmpty()) return new List<ContractDTO>();

        // Count open work orders per contract
        Set<Id> ids = new Map<Id, SObject>(contracts).keySet();
        Map<Id, Integer> openByContract = new Map<Id, Integer>();

        Map<String, Schema.SObjectField> woFields = Schema.SObjectType.WorkOrder.fields.getMap();
        Boolean hasStatutIntervention = woFields.containsKey('statut_intervention__c');

        String woFilter;
        if (hasStatutIntervention) {
            woFilter = 'Statut_Intervention__c IN (\'Signalée\',\'Mandatée\',\'Planifiée\',\'Reportée\',\'Bloquée\')';
        } else {
            // Fallback to standard Status — count non-closed/non-completed
            woFilter = 'Status NOT IN (\'Completed\',\'Closed\',\'Canceled\')';
        }

        String woSoql = 'SELECT ServiceContractId scId, COUNT(Id) c'
            + ' FROM WorkOrder'
            + ' WHERE ServiceContractId IN :ids AND ' + woFilter
            + ' GROUP BY ServiceContractId';

        for (AggregateResult ag : Database.query(woSoql)) {
            openByContract.put((Id) ag.get('scId'), Integer.valueOf(ag.get('c')));
        }

        // Build DTOs
        List<ContractDTO> out = new List<ContractDTO>();
        for (SObject c : contracts) {
            ContractDTO d = new ContractDTO();
            d.id              = (Id) c.get('Id');
            d.name            = (String) c.get('Name');
            d.contractNumber  = (String) c.get('ContractNumber');
            d.startDate       = (Date) c.get('StartDate');
            d.endDate         = (Date) c.get('EndDate');
            d.metier          = hasMetier ? (String) c.get('Metier__c') : null;
            d.slaHeures       = hasSla ? (Decimal) c.get('SLA_Heures__c') : null;
            d.email           = hasEmail ? (String) c.get('Email_Prestataire__c') : null;
            d.perimetre       = hasPerimetre ? (String) c.get('Perimetre_Couvert__c') : (String) c.get('Description');
            d.openWorkOrders  = openByContract.containsKey(d.id) ? openByContract.get(d.id) : 0;
            out.add(d);
        }
        return out;
    }
}
