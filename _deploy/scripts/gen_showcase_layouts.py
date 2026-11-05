#!/usr/bin/env python3
"""Regenerates the layoutSections of the Showcase classic layouts (used by force:detailPanel).
Keeps related lists / flags from the layout retrieved from the org (/tmp/fp)."""
import re, shutil, urllib.parse
SRC = '/tmp/fp/force-app/main/default/layouts/'
DST = '/Users/lionel.braun/Documents/Internal/lwc-library/_deploy/force-app/main/default/layouts/'
R, E, Q = 'Readonly', 'Edit', 'Required'

LAYOUTS = {
 'Contact-Contact Layout': [
  ('Identité', 'TwoColumnsTopToBottom', [[('Name',Q),('Title',E),('AccountId',E),('Department',E),('ReportsToId',E)],
                                         [('OwnerId',E),('Level__c',E),('Languages__c',E),('LeadSource',E),('Birthdate',E)]]),
  ('Coordonnées', 'TwoColumnsTopToBottom', [[('Email',E),('Phone',E)],[('MobilePhone',E),('HomePhone',E)]]),
  ('Engagement marketing', 'TwoColumnsTopToBottom', [[('CCO_Engagement_Score__c',E),('CCO_Activity_Recency__c',E)],[('CCO_Email_Engagement__c',E)]]),
  ('Adresse', 'TwoColumnsTopToBottom', [[('MailingAddress',E)],[('OtherAddress',E)]]),
  ('Notes', 'OneColumn', [[('Description',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
 'Account-Account Layout': [
  ('Identité', 'TwoColumnsTopToBottom', [[('Name',Q),('Type',E),('Industry',E),('ParentId',E),('AccountNumber',E)],
                                         [('OwnerId',E),('Rating',E),('Ownership',E),('NumberOfEmployees',E),('AnnualRevenue',E)]]),
  ('Coordonnées', 'TwoColumnsTopToBottom', [[('Phone',E)],[('Website',E)]]),
  ('Service et contrat', 'TwoColumnsTopToBottom', [[('CustomerPriority__c',E),('SLA__c',E),('SLASerialNumber__c',E),('SLAExpirationDate__c',E)],
                                                   [('Active__c',E),('UpsellOpportunity__c',E),('NumberofLocations__c',E)]]),
  ('Adresses', 'TwoColumnsTopToBottom', [[('BillingAddress',E)],[('ShippingAddress',E)]]),
  ('Notes', 'OneColumn', [[('Description',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
 'Lead-Lead Layout': [
  ('Prospect', 'TwoColumnsTopToBottom', [[('Name',Q),('Company',Q),('Title',E),('Industry',E),('AnnualRevenue',E),('NumberOfEmployees',E)],
                                         [('OwnerId',E),('Status',Q),('Rating',E),('LeadSource',E),('Primary__c',E)]]),
  ('Coordonnées', 'TwoColumnsTopToBottom', [[('Email',E),('Phone',E)],[('MobilePhone',E),('Website',E)]]),
  ('Intérêt commercial', 'TwoColumnsTopToBottom', [[('ProductInterest__c',E),('CurrentGenerators__c',E)],[('NumberofLocations__c',E),('SICCode__c',E)]]),
  ('Adresse', 'OneColumn', [[('Address',E)]]),
  ('Notes', 'OneColumn', [[('Description',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
 'Opportunity-Opportunity Layout': [
  ('Opportunité', 'TwoColumnsTopToBottom', [[('Name',Q),('AccountId',E),('Type',E),('LeadSource',E),('NextStep',E)],
                                           [('OwnerId',E),('StageName',Q),('Amount',E),('CloseDate',Q),('Probability',E)]]),
  ('Concurrence et livraison', 'TwoColumnsTopToBottom', [[('MainCompetitors__c',E),('CurrentGenerators__c',E)],[('DeliveryInstallationStatus__c',E),('OrderNumber__c',E),('TrackingNumber__c',E)]]),
  ('Notes', 'OneColumn', [[('Description',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
 'Case-Case Layout': [
  ('Demande', 'TwoColumnsTopToBottom', [[('CaseNumber',R),('Subject',E),('AccountId',E),('ContactId',E),('ContactPhone',R),('ContactEmail',R)],
                                       [('OwnerId',E),('Status',Q),('Priority',E),('Origin',E),('Type',E),('Reason',E)]]),
  ('Produit et SLA', 'TwoColumnsTopToBottom', [[('Product__c',E),('EngineeringReqNumber__c',E)],[('SLAViolation__c',E),('PotentialLiability__c',E)]]),
  ('Origine web', 'TwoColumnsTopToBottom', [[('SuppliedName',E),('SuppliedEmail',E)],[('SuppliedCompany',E),('SuppliedPhone',E)]]),
  ('Description', 'OneColumn', [[('Description',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
 'Order-Order Layout': [
  ('Commande', 'TwoColumnsTopToBottom', [[('OrderNumber',R),('AccountId',Q),('EffectiveDate',Q),('Type',E)],
                                        [('OwnerId',E),('Status',Q),('TotalAmount',R),('ActivatedDate',R)]]),
  ('Livraison et facturation', 'TwoColumnsTopToBottom', [[('BillingAddress',E)],[('ShippingAddress',E)]]),
  ('Notes', 'OneColumn', [[('Description',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
 'Visit__c-Présentation Visite': [
  ('Visite', 'TwoColumnsTopToBottom', [[('Name',R),('Account__c',Q),('Location__c',E)],[('OwnerId',E),('VisitState__c',Q)]]),
  ('Planification', 'TwoColumnsTopToBottom', [[('PlannedStartDateTime__c',E)],[('PlannedEndDateTime__c',E)]]),
  ('Exécution terrain', 'TwoColumnsTopToBottom', [[('CheckInDateTime__c',E)],[('CheckOutDateTime__c',E)]]),
  ('Compte-rendu', 'OneColumn', [[('Notes__c',E),('Summary__c',E)]]),
  ('Système', 'TwoColumnsTopToBottom', [[('CreatedById',R)],[('LastModifiedById',R)]]),
 ],
}
def sec(label, style, cols):
    out = ['    <layoutSections>','        <customLabel>true</customLabel>','        <detailHeading>true</detailHeading>','        <editHeading>true</editHeading>',f'        <label>{label}</label>']
    for col in cols:
        out.append('        <layoutColumns>')
        for f,b in col:
            out += ['            <layoutItems>',f'                <behavior>{b}</behavior>',f'                <field>{f}</field>','            </layoutItems>']
        out.append('        </layoutColumns>')
    out += [f'        <style>{style}</style>','    </layoutSections>']
    return '\n'.join(out)+'\n'
for name, secs in LAYOUTS.items():
    fn = urllib.parse.quote(name, safe="-_ é").replace('%20',' ') if False else name
    s = open(SRC+name+'.layout-meta.xml').read()
    first = s.index('<layoutSections>'); last = s.rindex('</layoutSections>')+len('</layoutSections>')
    # drop everything between first and last section, insert ours
    new = s[:first].rstrip(' ') + ''.join(sec(*x) for x in secs).rstrip('\n').lstrip(' ') + s[last:]
    new = s[:s.rfind('\n',0,first)+1] + ''.join(sec(*x) for x in secs) + s[last:].lstrip('\n')
    open(DST+name+'.layout-meta.xml','w').write(new)
    print('wrote', name)
