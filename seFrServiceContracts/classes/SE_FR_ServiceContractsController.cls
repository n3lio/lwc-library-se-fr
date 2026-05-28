/**
 * Returns active service contracts for an Account, with the count of open work orders
 * per contract — used by the seFrServiceContracts LWC on Account record pages.
 *
 * Prerequisites (custom fields to deploy alongside this component):
 *   - ServiceContract.Metier__c (Picklist) — trade/category label
 *   - ServiceContract.SLA_Heures__c (Number) — SLA commitment in hours
 *   - ServiceContract.Email_Prestataire__c (Email) — contractor email
 *   - ServiceContract.Perimetre_Couvert__c (TextArea) — scope description
 *   - WorkOrder.Statut_Intervention__c (Picklist) — intervention status
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
    public static List<ContractDTO> getContracts(Id accountId) {
        if (accountId == null) return new List<ContractDTO>();

        List<ServiceContract> contracts = [
            SELECT Id, Name, ContractNumber, Metier__c, SLA_Heures__c,
                   Email_Prestataire__c, Perimetre_Couvert__c,
                   StartDate, EndDate
            FROM ServiceContract
            WHERE AccountId = :accountId
              AND Metier__c != null
            ORDER BY Metier__c ASC
        ];
        if (contracts.isEmpty()) return new List<ContractDTO>();

        Set<Id> ids = new Map<Id, ServiceContract>(contracts).keySet();
        Map<Id, Integer> openByContract = new Map<Id, Integer>();
        for (AggregateResult ag : [
            SELECT ServiceContractId scId, COUNT(Id) c
            FROM WorkOrder
            WHERE ServiceContractId IN :ids
              AND Statut_Intervention__c IN ('Signalée','Mandatée','Planifiée','Reportée','Bloquée')
            GROUP BY ServiceContractId
        ]) {
            openByContract.put((Id) ag.get('scId'), Integer.valueOf(ag.get('c')));
        }

        List<ContractDTO> out = new List<ContractDTO>();
        for (ServiceContract c : contracts) {
            ContractDTO d = new ContractDTO();
            d.id              = c.Id;
            d.name            = c.Name;
            d.contractNumber  = c.ContractNumber;
            d.metier          = c.Metier__c;
            d.slaHeures       = c.SLA_Heures__c;
            d.email           = c.Email_Prestataire__c;
            d.perimetre       = c.Perimetre_Couvert__c;
            d.startDate       = c.StartDate;
            d.endDate         = c.EndDate;
            d.openWorkOrders  = openByContract.containsKey(c.Id) ? openByContract.get(c.Id) : 0;
            out.add(d);
        }
        return out;
    }
}
