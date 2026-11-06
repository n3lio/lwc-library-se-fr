---
tagline: Photos de linéaire sur une visite, galerie et analyse Agentforce (mock en repli).
categories: [Retail Execution]
personas: [FieldSales, Retail]
chips: [Visit, Shelf, Photo, Agentforce]
dataMode: live
mobileReady: true
originalAuthor: Lionel Braun
originalAuthorEmail: lionel.braun@salesforce.com
maintainedBy: SE FR team
libraryIntegrationDate: 2026-10-23
keyProps:
  - cardTitle
  - cardIcon
  - language
  - maxFiles
seBenefit: Démo prête à l'emploi de conformité linéaire par la photo, avec analyse Agentforce simulée si la vision n'est pas configurée.
releaseStatus: GA
status: active
screenshots: []
---

# seFrVisitShelfCompliance (Visit Shelf Compliance)

Visit__c record page. Upload (lightning-file-upload), gallery of image files linked to the visit, and an Agentforce analysis button.

- App Builder label: `CCO FR - Visit Shelf Compliance`
- Apex (read-only): `SE_FR_ShelfComplianceController` (getPhotos, analyzeShelf). ConnectApi is Apex-only, hence the class.
- Mock-first: without `promptTemplateApiName` (or on any error) a canned 4-line result is shown after 1.5 s.
