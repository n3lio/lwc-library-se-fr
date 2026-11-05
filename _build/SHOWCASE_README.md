# CCO FR Showcase — Mode d'emploi

Dernière mise à jour : 2026-10-21 20:05 CEST — déploiement intégral réussi dans `cco-fr-de`.

## Le pitch

Une Lightning App unique **`CCO FR Showcase`** qui héberge les **37 composants** de la lib CCO FR, répartis sur **12 pages** et **5 personas**. Tu ouvres l'app, tu cliques un onglet, c'est parlant.

- Org : `cco-fr-de` → `https://orgfarm-032613f3e0-dev-ed.develop.my.salesforce.com`
- User : `lionel.braun.018f8ccfb2c1@agentforce.com`
- App URL : `/lightning/app/CCO_FR_Showcase`

Raccourci pour ouvrir l'app directement :
```bash
sf org open -p /lightning/app/CCO_FR_Showcase -o cco-fr-de
```

## 🚦 Statut du déploiement

Tout est deployé. Un dernier geste manuel (**30 secondes, 1 clic**) :

### Activer la Home page custom

L'override de `standard-home` via metadata CustomApplication est refusé par l'API côté org (bug SF connu sur certains dev-edition farms). Pour que l'onglet "Accueil" de l'app affiche `CCO_FR_Showcase_Home` au lieu du Home par défaut :

1. Ouvrir : `sf org open -p "/visualEditor/appBuilder.app?pageId=0M0gK000009UAw5SAG" -o cco-fr-de`
2. En haut à droite : **Activation** → **App Default** → cocher `CCO FR Showcase` → **Save**

Tant que ce n'est pas fait, l'onglet "Accueil" affiche l'écran Lightning stock. Les 4 autres personas (Field Sales / Télévente / Territoire / Marketing) sont déjà en place sans activation nécessaire — leurs tabs pointent directement sur leur AppPage FlexiPage.

## Parcours de démo recommandé (5 min)

| # | Action | URL / Clic | Ce qu'on montre |
|---|--------|------------|-----------------|
| 1 | Ouvrir l'app | `/lightning/app/CCO_FR_Showcase` | Branding bleu `#003DA5`, 12 tabs |
| 2 | Onglet **Field Sales** | tab | Rep Home + carte comptes à proximité + agenda + tasks |
| 3 | Onglet **Télévente** | tab | Cockpit telesales + Kanban Case par statut |
| 4 | Onglet **Territoire & Pipeline** | tab | Carte Account 360 + Kanban Opp (drag & drop stage) |
| 5 | Onglet **Marketing** | tab | Timeline engagement + segments Data Cloud |
| 6 | **Account Carrefour FR** | `/lightning/r/Account/001gK00001fydfuQAA/view` | Account 360 complet — 24 composants mis en scène |
| 7 | Depuis Carrefour → bouton "Démarrer une visite" | panneau accountActions | Flow visite → ouvre une Visit__c |
| 8 | **Visite exemple V-0000** | `/lightning/r/Visit__c/a00gK00001R8oZ9QAJ/view` | visitSummaryAI + filesGallery |
| 9 | **Contact exemple** | voir onglet Contacts dans Account | contactCard + consentManager |
| 10 | **Opportunity Dickenson Mobile Generators** | `/lightning/r/Opportunity/006gK00000Odzj3QAB/view` | pipelineSnapshot + timelinePhases + subscribersList |
| 11 | **Case** | `/lightning/r/Case/500gK00001MNgPFQA1/view` | serviceContracts + orderSummary + relatedRecordCard |
| 12 | **Lead Bertha Boxer** | `/lightning/r/Lead/00QgK00000TG9S0UAL/view` | consentManager + activeSegments + smartRecommendations |
| 13 | **Order 00000100** | `/lightning/r/Order/801gK00001fydfxQAA/view` | recordHighlights + relatedRecordCard |

## Pages livrées

| Page | Type | ID FlexiPage | Composants mis en scène |
|---|---|---|---|
| **Showcase Home** | HomePage | `0M0gK000009UAw5SAG` | splashBanner, agentforceHeader, alertsRibbon, kpiLauncher, metricTile, timelinePhases, engagementHistory, activeSegments, myEvents, myTasks, promptLauncher, subscribersList |
| **Field Sales** | AppPage | `0M0gK000009UAw4SAG` | splashBanner, fieldRepHome, nearbyAccountsMap, myEvents, myTasks |
| **Télévente** | AppPage | `0M0gK000009UAwASAW` | splashBanner, telesalesRepHome, kanbanBoard(Case), kpiLauncher, myTasks |
| **Territoire & Pipeline** | AppPage | `0M0gK000009UAwBSAW` | splashBanner, territoryMap, kanbanBoard(Opp) |
| **Marketing** | AppPage | `0M0gK000009UAw7SAG` | splashBanner, alertsRibbon, engagementHistory, activeSegments, kpiLauncher |
| **Account 360** | RecordPage Account | `0M0gK000009UAw1SAG` | 24 composants (voir list ci-dessous) |
| **Contact 360** | RecordPage Contact | `0M0gK000009UAw3SAG` | 15 composants |
| **Opportunity 360** | RecordPage Opp | `0M0gK000009UAw8SAG` | 11 composants |
| **Case Workbench** | RecordPage Case | `0M0gK000009UAw2SAG` | 11 composants |
| **Lead Hub** | RecordPage Lead | `0M0gK000009UAw6SAG` | 9 composants |
| **Order Workbench** | RecordPage Order | `0M0gK000009UAw9SAG` | 5 composants |
| **Visit Workbench** | RecordPage Visit__c | `0M0gK000009UAwCSAW` | 4 composants |

**Total : 37 / 37 composants vitrinés.**

## Données seedées

Via `_deploy/scripts/apex/seed-showcase-data.apex` — idempotent (ré-exécutable sans doublons).

| sObject | Compte | IDs sample |
|---|---|---|
| Account | 3 | Carrefour FR `001gK00001fydfuQAA` · Monoprix `001gK00001fydfvQAA` · Franprix `001gK00001fydfwQAA` |
| Contact | 9 | 3 par Account |
| Opportunity | 6 | ex: Dickenson `006gK00000Odzj3QAB` |
| Case | 6 | ex: `500gK00001MNgPFQA1` |
| Lead | 2 | Bertha Boxer `00QgK00000TG9S0UAL` |
| Order | 3 | Draft, ex: `801gK00001fydfxQAA` |
| Visit__c | 6 | V-0000 `a00gK00001R8oZ9QAJ` |

Tous les records sont owned par le running user (`lionel.braun.018f8ccfb2c1@agentforce.com`).

## Déploiement from scratch (si tu refais l'exercice)

```bash
cd ~/Documents/Internal/lwc-library

# 1. Resync _deploy depuis les bundles de la lib
python3 _build/sync-lwc-bundles-to-deploy.py

cd _deploy

# 2. Deploy LWCs + classes Apex + static resources
sf project deploy start \
  -d force-app/main/default/lwc \
  -d force-app/main/default/classes \
  -d force-app/main/default/staticresources \
  -o cco-fr-de --ignore-conflicts

# 3. Deploy FlexiPages
sf project deploy start -d force-app/main/default/flexipages -o cco-fr-de --ignore-conflicts

# 4. Deploy tabs + app + permset
sf project deploy start \
  -d force-app/main/default/tabs \
  -d force-app/main/default/applications/CCO_FR_Showcase.app-meta.xml \
  -d force-app/main/default/permissionsets/CCO_FR_Showcase_App.permissionset-meta.xml \
  -o cco-fr-de --ignore-conflicts

# 5. Assigner le permset (si running user ≠ admin)
sf org assign permset -n CCO_FR_Showcase_App -o cco-fr-de

# 6. Seed data
sf apex run -f scripts/apex/seed-showcase-data.apex -o cco-fr-de

# 7. Activer la Home page (1 clic UI, cf. section plus haut)

# 8. Ouvrir
sf org open -p /lightning/app/CCO_FR_Showcase -o cco-fr-de
```

## Patches Apex appliqués pour que ça compile dans un dev-edition "nu"

Ces 4 classes ont été rendues feature-tolérantes (dynamic access, Schema.getGlobalDescribe guards). Les correctifs sont dans la lib root (source de vérité) :

- `seFrPromptLauncher/classes/SE_FR_PromptLauncherController.cls` — `saveAsNote()` → ContentNote via SObject dynamique.
- `seFrSubscribersList/classes/SE_FR_SubscribersListController.cls` — OpportunityTeamMember queries guardées.
- `seFrTerritoryMap/classes/SE_FR_TerritoryMapController.cls` — RecordType accedé via `getSObject('RecordType')`.
- `seFrOrderEntry/classes/SE_FR_OrderEntryController.cls` — `SalesChannelId` via `put()` avec check du describe.
- `seFrRecordHighlights/lwc/.../.js-meta.xml` — retiré le target `Quote` (sObject absent de dev-edition).

Ces patches ne cassent rien dans les orgs riches en features (SDO) : les guards sont no-op si la feature est présente.

## Composants hors-écran (checks à faire la 1ère fois)

- **seFrAccountHealth** : utilise `Account.SDO_MAPS_Days_Since_Last_Visit__c` — absent de `cco-fr-de`. Le composant skip ce signal silencieusement → score santé OK sur les autres signaux.
- **seFrContactCard / seFrCustomerOrders** : images produits via `Product2.Image_URL__c` — absent → fallback icône. Pas bloquant.
- **seFrPromptLauncher** : Named Credential `Agentforce_API` requise pour appeler les prompts. Si absente, erreur à l'exécution — à configurer en Setup, ou désactiver la propriété "Prompt Launcher" dans la FlexiPage.
- **seFrVisitSummaryAI** : `promptTemplateApiName` vide par défaut → fallback deterministic sur les fields Visit__c (OK out-of-the-box). Pour appeler Einstein, créer un Prompt Template `Input:Visit__c` et renseigner son API name dans la FlexiPage.
- **seFrAgentforceHeader** : nécessite HTTPS pour la dictée (micro) — toujours le cas sur `*.my.salesforce.com`.

## Modifier une page

**Règle absolue** : si tu as changé la page dans l'org via Lightning App Builder, retrieve avant de redeploy.

```bash
sf project retrieve start -m FlexiPage:CCO_FR_Showcase_Account -o cco-fr-de -r _deploy
```

Puis edit → redeploy :

```bash
sf project deploy start -m FlexiPage:CCO_FR_Showcase_Account -o cco-fr-de
```

## Vers l'automatisation (futur MCP server)

Tout ce workflow — resync bundle → compute cibles sObject depuis `*.js-meta.xml <targets>` → composer FlexiPages par persona → patch Apex guards → deploy en ordre → seed data → ouvrir — est à mécaniser dans le futur MCP server "lwc-library-deploy". Les artefacts créés ici (`sync-lwc-bundles-to-deploy.py`, les 12 flexipages, le mapping persona↔composants dans `SHOWCASE_PAGES_DESIGN.md`) servent de base.

## Évolutions futures

- [ ] Résoudre l'override `standard-home` via metadata (actuellement nécessite 1 clic UI).
- [ ] Créer un Prompt Template `Input:Visit__c` pour que seFrVisitSummaryAI appelle Einstein.
- [ ] Configurer la Named Credential `Agentforce_API` → seFrPromptLauncher opérationnel.
- [ ] Report + Dashboard "Pipeline par stage" (seFrKpiLauncher les référence).
- [ ] Intégrer `seFrShelfCompliance` sur Visit__c quand il sera porté.
- [ ] MCP server : automatiser toute cette séquence.
