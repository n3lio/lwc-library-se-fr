# CCO FR Showcase — Design pages & app

Généré 2026-10-21. Source : `SHOWCASE_INVENTORY.md` (37 composants).

Objectif : UNE Lightning App `CCO FR Showcase` qui expose les 37 composants de la lib répartis sur des pages crédibles, prêtes à démontrer. Lionel ouvre l'app → clique un onglet → c'est vendeur.

## 1. Lightning App `CCO FR Showcase`

- **DeveloperName** : `CCO_FR_Showcase`
- **Label** : `CCO FR Showcase`
- **UtilityBar** : (vide — rien à utiliser pour le moment)
- **NavType** : Standard
- **FormFactors** : Large (desktop)
- **actionOverrides** app-level (= activation Lightning Record Page sans toucher à l'org default) :
  - `standard-home` → `CCO_FR_Showcase_Home`
  - `Account` → `CCO_FR_Showcase_Account`
  - `Contact` → `CCO_FR_Showcase_Contact`
  - `Opportunity` → `CCO_FR_Showcase_Opportunity`
  - `Case` → `CCO_FR_Showcase_Case`
  - `Lead` → `CCO_FR_Showcase_Lead`
  - `Order` → `CCO_FR_Showcase_Order`
  - `Visit__c` → `CCO_FR_Showcase_Visit`
- **tabs** (ordre de navigation) :
  1. standard-home (lands sur `CCO_FR_Showcase_Home`)
  2. CCO FR — Field Sales (AppPage)
  3. CCO FR — Telesales (AppPage)
  4. CCO FR — Territory & Pipeline (AppPage)
  5. CCO FR — Marketing Cockpit (AppPage)
  6. standard-Account
  7. standard-Contact
  8. standard-Opportunity
  9. standard-Case
  10. standard-Lead
  11. standard-Order
  12. Visit__c (object tab)

## 2. Pages & composants

### 2.1 HomePage `CCO_FR_Showcase_Home`
Template : `flexipage:appHomeTemplateDesktop`.
Régions :
- **header** : `seFrSplashBanner` (titre "Bonjour, bienvenue sur CCO FR"), `seFrAgentforceHeader`, `seFrAlertsRibbon` (static, 2 annonces)
- **main** : `seFrKpiLauncher` (preset Standard), `seFrMetricTile` (CA mensuel), `seFrTimelinePhases` (scope fiscal), `seFrEngagementHistory` (home version marketing), `seFrActiveSegments`
- **sidebar** : `seFrMyEvents`, `seFrMyTasks`, `seFrPromptLauncher`, `seFrSubscribersList`

### 2.2 AppPage `CCO_FR_Showcase_FieldSales_Home`
Template : `flexipage:appHomeTemplateDesktop`
- **header** : `seFrSplashBanner` ("Terrain, {name}")
- **main** : `seFrFieldRepHome`, `seFrNearbyAccountsMap`
- **sidebar** : `seFrMyEvents`, `seFrMyTasks`

### 2.3 AppPage `CCO_FR_Showcase_Telesales_Home`
Template : `flexipage:appHomeTemplateDesktop`
- **header** : `seFrSplashBanner` ("Télévente")
- **main** : `seFrTelesalesRepHome`, `seFrKanbanBoard` (Case)
- **sidebar** : `seFrKpiLauncher` (preset Telesales), `seFrMyTasks`

### 2.4 AppPage `CCO_FR_Showcase_Territory_Pipeline`
Template : `flexipage:appHomeTemplateDesktop`
- **header** : `seFrSplashBanner` ("Territoire & Pipeline")
- **main** : `seFrTerritoryMap`, `seFrKanbanBoard` (Opportunity, groupBy StageName, amountField Amount)

### 2.5 AppPage `CCO_FR_Showcase_Marketing`
Template : `flexipage:appHomeTemplateDesktop`
- **header** : `seFrSplashBanner` ("Marketing Cockpit"), `seFrAlertsRibbon` (static)
- **main** : `seFrEngagementHistory`, `seFrActiveSegments`
- **sidebar** : `seFrKpiLauncher`

### 2.6 Account RecordPage `CCO_FR_Showcase_Account`
Template : `flexipage:recordHomeTemplateDesktop` (header + sidebar + main)
- **header** : `seFrRecordHighlights`, `seFrAlertsRibbon` (rules), `seFrActiveSegments`
- **main** (empilé — pas de tabs pour simplifier le XML) :
  - `seFrAccountStrategyPlan`
  - `seFrPipelineSnapshot`
  - `seFrRevenueDashboard`
  - `seFrCustomerSalesSummary`
  - `seFrCustomerOrders`
  - `seFrOrderEntry`
  - `seFrContactsCarousel`
  - `seFrActivityFeed`
  - `seFrEngagementHistory`
  - `seFrVisitSummaryAI`
  - `seFrServiceContracts`
  - `seFrFilesGallery`
  - `seFrTimelinePhases`
- **sidebar** :
  - `seFrAccountActions`
  - `seFrAccountHealth`
  - `seFrMetricTile`
  - `seFrSmartRecommendations`
  - `seFrConsentManager`
  - `seFrVoiceNoteTaker`
  - `seFrSubscribersList`
  - `seFrPromptLauncher`

### 2.7 Contact RecordPage `CCO_FR_Showcase_Contact`
Template : `flexipage:recordHomeTemplateDesktop`
- **header** : `seFrRecordHighlights`, `seFrAlertsRibbon`
- **main** :
  - `seFrContactCard`
  - `seFrCustomerSalesSummary`
  - `seFrActivityFeed`
  - `seFrEngagementHistory`
  - `seFrCustomerOrders`
  - `seFrConsentManager`
  - `seFrFilesGallery`
- **sidebar** :
  - `seFrAccountActions`
  - `seFrRelatedRecordCard` (compte)
  - `seFrActiveSegments`
  - `seFrSmartRecommendations`
  - `seFrVoiceNoteTaker`
  - `seFrPromptLauncher`

### 2.8 Opportunity RecordPage `CCO_FR_Showcase_Opportunity`
Template : `flexipage:recordHomeTemplateDesktop`
- **header** : `seFrRecordHighlights`, `seFrAlertsRibbon`
- **main** :
  - `seFrPipelineSnapshot`
  - `seFrContactCard`
  - `seFrTimelinePhases` (auto = opp cycle)
  - `seFrServiceContracts`
- **sidebar** :
  - `seFrAccountActions`
  - `seFrRelatedRecordCard` (compte)
  - `seFrSubscribersList`
  - `seFrSmartRecommendations`
  - `seFrVoiceNoteTaker`

### 2.9 Case RecordPage `CCO_FR_Showcase_Case`
Template : `flexipage:recordHomeTemplateDesktop`
- **header** : `seFrRecordHighlights`, `seFrAlertsRibbon`
- **main** :
  - `seFrContactCard`
  - `seFrServiceContracts`
  - `seFrOrderSummary`
  - `seFrOrderEntry`
  - `seFrTimelinePhases` (auto = case)
- **sidebar** :
  - `seFrAccountActions`
  - `seFrRelatedRecordCard`
  - `seFrSmartRecommendations`
  - `seFrPromptLauncher`

### 2.10 Lead RecordPage `CCO_FR_Showcase_Lead`
Template : `flexipage:recordHomeTemplateDesktop`
- **header** : `seFrRecordHighlights`, `seFrAlertsRibbon`
- **main** :
  - `seFrContactCard`
  - `seFrEngagementHistory`
  - `seFrConsentManager`
  - `seFrActiveSegments`
- **sidebar** :
  - `seFrAccountActions`
  - `seFrSmartRecommendations`
  - `seFrVoiceNoteTaker`

### 2.11 Order RecordPage `CCO_FR_Showcase_Order`
Template : `flexipage:recordHomeTemplateDesktop`
- **header** : `seFrRecordHighlights`, `seFrAlertsRibbon`
- **main** :
  - `seFrContactCard`
  - `seFrRelatedRecordCard` (compte)
- **sidebar** :
  - `seFrSmartRecommendations`

### 2.12 Visit__c RecordPage `CCO_FR_Showcase_Visit`
Template : `flexipage:recordHomeTemplateDesktop`
- **header** : standard highlights panel (`force:highlightsPanel`)
- **main** :
  - `seFrVisitSummaryAI`
  - `seFrFilesGallery`
- **sidebar** : standard detail panel (`force:detailPanel`)

## 3. Couverture — vérification 37/37

| Composant | Page(s) |
|---|---|
| seFrAccountActions | Account, Contact, Opportunity, Case, Lead sidebar |
| seFrAccountHealth | Account sidebar |
| seFrAccountStrategyPlan | Account main |
| seFrActiveSegments | Home main, Marketing main, Account header, Contact sidebar, Lead main |
| seFrActivityFeed | Account main, Contact main |
| seFrAgentforceHeader | Home header |
| seFrAlertsRibbon | Home header, Marketing header, Account+Contact+Opp+Case+Lead+Order header |
| seFrConsentManager | Account sidebar, Contact main, Lead main |
| seFrContactCard | Contact main, Opp main, Case main, Lead main, Order main |
| seFrContactsCarousel | Account main |
| seFrCustomerOrders | Account main, Contact main |
| seFrCustomerSalesSummary | Account main, Contact main |
| seFrEngagementHistory | Home main, Marketing main, Account main, Contact main, Lead main |
| seFrFieldRepHome | FieldSales Home main |
| seFrFilesGallery | Account main, Contact main, Visit__c main |
| seFrKanbanBoard | Telesales Home main, Territory_Pipeline main |
| seFrKpiLauncher | Home main, Telesales sidebar, Marketing sidebar |
| seFrMetricTile | Home main, Account sidebar |
| seFrMyEvents | Home sidebar, FieldSales Home sidebar |
| seFrMyTasks | Home sidebar, FieldSales Home sidebar, Telesales sidebar |
| seFrNearbyAccountsMap | FieldSales Home main |
| seFrOrderEntry | Account main, Case main |
| seFrOrderSummary | Case main |
| seFrPipelineSnapshot | Account main, Opp main |
| seFrPromptLauncher | Home sidebar, Account sidebar, Contact sidebar, Case sidebar |
| seFrRecordHighlights | Account+Contact+Opp+Case+Lead+Order header |
| seFrRelatedRecordCard | Contact sidebar, Opp sidebar, Case sidebar, Order main |
| seFrRevenueDashboard | Account main |
| seFrServiceContracts | Account main, Opp main, Case main |
| seFrSmartRecommendations | Account sidebar, Contact sidebar, Opp sidebar, Case sidebar, Lead sidebar, Order sidebar |
| seFrSplashBanner | Home header, FieldSales header, Telesales header, Territory header, Marketing header |
| seFrSubscribersList | Home sidebar, Account sidebar, Opp sidebar |
| seFrTelesalesRepHome | Telesales Home main |
| seFrTerritoryMap | Territory_Pipeline main |
| seFrTimelinePhases | Home main, Account main, Opp main, Case main |
| seFrVisitSummaryAI | Account main, Visit__c main |
| seFrVoiceNoteTaker | Account sidebar, Contact sidebar, Opp sidebar, Lead sidebar |

**37/37** ✓

## 4. Seed data (minimal)

Via Anonymous Apex `scripts/seed-showcase-data.apex` :
- 3 Accounts (BtoB) : Carrefour, Monoprix, Franprix
- 3 Contacts par account
- 2 Opportunities ouvertes par account
- 2 Cases ouverts par account
- 2 Leads (prospects)
- 1 Order (Draft) par account
- 2 Visits__c par account (1 Completed avec CheckIn/Out, 1 Planned future)
- Owner = running user (= Lionel)

## 5. Permset

- `CCO_FR_Retail_Exec` (déjà shippé par `seFrRetailExecSchema`) — assigné au running user.
- Optionnel : `CCO_FR_Showcase_App_Access` qui ajoute l'app `CCO_FR_Showcase` visibility.

## 6. Déploiement

```bash
cd ~/Documents/Internal/lwc-library/_deploy
# 1) Deploy nouveau schéma + composants (si pas déjà fait)
sf project deploy start -d force-app -o cco-fr-de

# 2) Assigner le permset
sf org assign permset -n CCO_FR_Retail_Exec -o cco-fr-de

# 3) Exécuter le seed
sf apex run -f scripts/seed-showcase-data.apex -o cco-fr-de

# 4) Ouvrir l'app
sf org open -p /lightning/app/CCO_FR_Showcase -o cco-fr-de
```
