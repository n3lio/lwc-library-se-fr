# CCO FR Component Library — Guide d'utilisation

> **Audience** : Solution Engineers Salesforce qui souhaitent intégrer un ou plusieurs composants de la librairie dans leur org de démo (SDO, IDO, scratch).
> **Format** : un seul document maître à coller dans un Google Doc.
> **Sommaire** : intro → installation → configuration générale → catalogue → fiche par composant → FAQ + troubleshooting → limitations connues → contribuer.

---

## Table des matières

1. [À qui s'adresse ce guide](#à-qui-sadresse-ce-guide)
2. [Ce que contient la librairie](#ce-que-contient-la-librairie)
3. [Installation d'un composant](#installation-dun-composant)
4. [Configuration générale](#configuration-générale)
5. [Mode "data" : Live / Hybrid / Mock](#mode-data--live--hybrid--mock)
6. [Catalogue par persona](#catalogue-par-persona)
7. [Fiches détaillées par composant](#fiches-détaillées-par-composant)
8. [FAQ + troubleshooting](#faq--troubleshooting)
9. [Limites techniques connues](#limites-techniques-connues)
10. [Contribuer](#contribuer)

---

## À qui s'adresse ce guide

Tu es SE Salesforce, tu veux préparer une démo Lightning sans repartir de zéro. Cette librairie te donne **30 composants LWC prêts à l'emploi**, tous bilingues FR/EN, configurables via App Builder, schema-safe (aucun champ custom requis sauf cas explicites). Le guide t'aide à choisir le bon composant pour ton scénario, l'installer, le configurer, et anticiper les pièges classiques.

**Ce guide n'est PAS** :
- une doc Salesforce générale (LWC, Apex, App Builder…) — on suppose ces fondamentaux acquis
- un manuel de design — voir le deck commercial (`_deck/index.html`) pour la vue executive
- un guide de développement de nouveaux composants — voir [Contribuer](#contribuer)

---

## Ce que contient la librairie

```
SE_FR_Library/
├── README.md                  # catalogue maître
├── seFr<Name>/                # un dossier par composant (30 dossiers)
│   ├── lwc/seFr<Name>/        # bundle LWC (js / html / css / js-meta.xml)
│   ├── classes/               # Apex spécifique (optionnel)
│   └── README.md              # doc du composant
├── _shared_apex/classes/      # Apex partagés entre plusieurs composants
├── _zips/                     # un zip par composant, prêt à partager
├── _deploy/                   # dossier sfdx pour déploiement direct
├── _deck/                     # deck commercial HTML + Apps Script
└── _doc/                      # ce guide
```

**Conventions** :
- LWC : `seFr<Name>` (camelCase, pas d'underscore)
- Apex : `SE_FR_<Name>Controller`
- Master label App Builder : `CCO FR - <Human name>`
- Tirets simples uniquement (pas de en-dash / em-dash)
- Texte FR par défaut, override via la prop `language`

---

## Installation d'un composant

### Méthode 1 — SF CLI (recommandée pour SE qui maîtrisent le CLI)

```bash
# Depuis le dossier du composant
cd seFrContactCard
sf project deploy start --source-dir . --target-org <alias_org>
```

Si le composant a une dépendance Apex partagée, déploie aussi `_shared_apex/` une seule fois :

```bash
sf project deploy start --source-dir _shared_apex --target-org <alias_org>
```

### Méthode 2 — Bundle complet via le dossier `_deploy/`

Le dossier `_deploy/force-app/main/default/` contient **tous** les composants déjà synchronisés, prêts à déployer en une commande :

```bash
cd _deploy
sf project deploy start --target-org <alias_org>
```

### Méthode 3 — Claude Code / Cursor / IDE AI

Pointe ton assistant AI sur le dossier `seFr<Name>/` et demande-lui de déployer. Les zips dans `_zips/` peuvent aussi être uploadés via Workbench, l'extension Salesforce Inspector ou un add-on Lightning Studio.

### Vérifier le déploiement

1. Setup → Lightning Components → cherche `seFr<Name>` dans la liste
2. Setup → Apex Classes → cherche `SE_FR_<Name>Controller`
3. App Builder → édite ta page → cherche le composant dans la liste à gauche (`CCO FR - <Name>`)

Si rien n'apparaît côté App Builder, vérifie le `<isExposed>true</isExposed>` dans le `js-meta.xml` du composant + la `apiVersion` (le projet utilise 59.0).

---

## Prérequis techniques

La majorité des composants tournent sans setup org. Quelques composants ont des dépendances spécifiques — résumé ici.

### Composants 100% autonomes (zéro setup)

Ces composants marchent dès le déploiement, aucune config supplémentaire :
`seFrAlertsRibbon`, `seFrSplashBanner`, `seFrAccountStrategyPlan`, `seFrTimelinePhases`, `seFrSmartRecommendations`, `seFrKpiLauncher`, `seFrMetricTile`, `seFrActiveSegments`, `seFrAgentforceHeader`.

### Composants utilisant les fields Salesforce standards

Marchent partout où Salesforce expose les champs standards (la majorité des composants Live).

### Composants dépendants de fields SDO Cust360

Ces composants ont des **defaults** pointant vers des champs custom du SDO (`SDO_Cust360_*`, `SDO_MAPS_*`). Sur une org sans ces champs, ils basculent automatiquement en fallback Mock.

- `seFrContactCard` (image contact, jauges churn / NPS)
- `seFrAccountHealth` (score, signals)
- `seFrRelatedRecordCard` (image contact)
- `seFrNearbyAccountsMap` (champ "days since last visit")

Pour un override : utilise les props `imageFieldApiName`, `scoreFieldApiName`, etc. dans App Builder.

### Composants nécessitant un Named Credential

#### `seFrPromptLauncher` (Prompt Launcher) — Named Credential `Agentforce_API`

Le composant fait un callout REST authentifié vers l'API Salesforce de l'org pour exécuter les Prompt Templates. Sans Named Credential, le callout échoue.

**Pourquoi le nom `Agentforce_API` ?** Convention de la lib (héritage de l'ancien composant Prompt Launcher). En réalité, le NC sert à appeler **n'importe quel endpoint `/services/data/...`** de l'org : Prompt Templates, Agent API si dispo, custom REST APIs.

**Setup en ~10 minutes** (à faire **une fois par org**) :

1. **Connected App**
    - Setup → App Manager → New Connected App → Create a Connected App
    - Name : `Agentforce Internal Client` / API Name : `Agentforce_Internal_Client`
    - Enable OAuth Settings : ✓
    - Callback URL temporaire : `https://login.salesforce.com/services/authcallback/Agentforce_API` (sera mise à jour après l'Auth Provider)
    - OAuth Scopes : `api`, `chatbot_api`, `refresh_token`, `einstein_gpt_api` (si dispo)
    - **Décocher** : Require Proof Key for Code Exchange (PKCE)
    - Cocher : Require Secret for Web Server Flow + Require Secret for Refresh Token Flow
    - Save → patiente 2-10 minutes → Manage Consumer Details → note **Consumer Key** et **Consumer Secret**

2. **Auth Provider**
    - Setup → Auth. Providers → New
    - Provider Type : `Salesforce`
    - Name : `Agentforce Internal Auth`
    - Consumer Key + Consumer Secret de l'étape 1
    - Default Scopes : `api chatbot_api refresh_token`
    - **Décocher** : Use Proof Key for Code Exchange (PKCE) Extension
    - **Décocher** : Include Consumer Secret in SOAP API Responses
    - Distribution State : Local
    - Save → note la **Callback URL** générée

3. **Retour sur la Connected App**
    - Edit Policies → remplace la Callback URL temporaire par celle générée par l'Auth Provider
    - Save

4. **External Credential** (orgs Spring '23+)
    - Setup → Named Credentials → onglet External Credentials → New
    - Label : `Agentforce External Auth` / Name : `Agentforce_External_Auth`
    - Authentication Protocol : OAuth 2.0
    - Authentication Flow Type : Browser Flow
    - Authentication Provider : `Agentforce Internal Auth`
    - Scope : `api chatbot_api refresh_token`
    - Save → Principals → New → Identity Type : Named Principal → Save → Authenticate

5. **Permission Set Mapping**
    - Setup → Permission Sets → New (`Agentforce API Access` / `Agentforce_API_Access`)
    - Section "External Credential Principal Access" → Edit → ajoute `Agentforce External Auth - Default` → Save
    - Manage Assignments → Add Assignments → ton user

6. **Named Credential**
    - Setup → Named Credentials → onglet Named Credentials → New
    - Label : `Agentforce API` / Name : `Agentforce_API` ⚠️ *ce nom doit matcher la prop côté composant*
    - URL : `https://<your-domain>.my.salesforce.com` (Setup → My Domain pour le récupérer)
    - Enabled for Callouts : ✓
    - External Credential : `Agentforce External Auth`
    - Generate Authorization Header : ✓
    - Save

**Test rapide** depuis la Developer Console :

```apex
HttpRequest req = new HttpRequest();
req.setEndpoint('callout:Agentforce_API/services/data/v62.0/actions/custom/generatePromptResponse');
req.setMethod('GET');
HttpResponse res = new Http().send(req);
System.debug(res.getStatusCode() + ' ' + res.getBody().abbreviate(500));
```

→ doit retourner **200** + une liste de prompts. Si **401/403** : revoir l'External Credential / Permission Set Mapping. Si **404** : URL incorrecte. Si **erreur Named Credential not found** : NC manquant.

#### Niveau de difficulté

Setup ~10 min, mais quelques pièges (PKCE coché par défaut, External Credential introuvable sur certaines orgs anciennes, Permission Set mapping fait dans le mauvais sens). Le guide ci-dessus est validé sur les SDOs récentes.

### Composants nécessitant Einstein activé

`seFrContactCard` (bouton "Résumer") et `seFrSmartRecommendations` (mode AI) appellent un Prompt Template — soit via le Named Credential `Agentforce_API` (préféré, comme pour `seFrPromptLauncher`), soit via l'API Apex native `ConnectApi.EinsteinLLM`.

**Permission Sets nécessaires côté user qui exécute le composant** (autres que celui qui a installé) :

| Permset | Pourquoi | Utilisation |
|---|---|---|
| `EinsteinGPTPromptTemplateUser` | Exécution de Prompt Templates depuis l'UI | Tous les SE qui veulent tester l'AI |
| `Agentforce_API_Access` (custom, créé via le guide ci-dessus) | Accès à l'External Credential pour le Named Credential | Tous les SE qui veulent tester l'AI |
| `EinsteinGPTSalesSummaries` (optionnel) | Améliore certains résumés contact / opportunity | Bonus, pas requis |

**Exemples de Prompt Template API names standards SDO** (à utiliser comme valeur de la prop `promptTemplateApiName` côté `seFrContactCard` / `seFrPromptLauncher`) :

- `einstein_gpt__summarizeContact` — résumé Contact (mémo enrichi par AI)
- `einstein_gpt__summarizeRecord` — résumé générique Account / Opportunity / Case
- `einstein_gpt__draftEmailFromTemplate` — draft d'email depuis un template

Les champs lus par le template doivent être visibles côté user (FLS Read), sinon le contexte arrive vide et le template renvoie une réponse vide. Si tu vois "Réponse du prompt vide" : check FLS sur `Contact.Title` / `Department` / `Email` / etc.

**Galères classiques rencontrées pendant la conception** (et leurs résolutions) :
- `We couldn't access the credential(s) Agentforce_External_Auth` → permset `Agentforce_API_Access` non assigné au user.
- Réponse vide silencieuse → permset `EinsteinGPTPromptTemplateUser` non assigné, ou FLS bloquante sur les champs lus par le template.
- `client_credentials only` token (scope `api`, sans `web`) → impossible d'utiliser le token sur frontdoor.jsp ou pour ouvrir une session UI ; passer en JWT Bearer Flow si besoin d'une session UI complète.
- Sandbox.mailgun.org refusé par Gmail (`espblock`) si le mail mentionne un domaine externe (looks like spoofing). Mettre l'email du SE en `Reply-To` header, pas dans le body.

### Composants nécessitant une Static Resource

#### `seFrAgentforceHeader` — image `astro_agentforce`

Le composant affiche l'image d'Astro (mascotte Salesforce) en background. Cette image doit exister comme **Static Resource** dans l'org sous le nom **exact** `astro_agentforce` (pas `astro_agentforce.png`, juste `astro_agentforce` côté Setup → Static Resources → Name field).

**Bonne nouvelle** : depuis la version actuelle de la lib, l'image est **automatiquement embarquée dans le zip** `_zips/seFrAgentforceHeader.zip`. Si tu déploies via le bouton "Déployer dans mon org" du site web, ou via `sf project deploy start -d _deploy/`, l'image est créée automatiquement. **Aucune action manuelle nécessaire**.

**Si tu déploies via une méthode alternative** (drag-drop dans VS Code par exemple) qui ignorerait le sous-dossier `staticresources/` :

1. Setup → Static Resources → New
2. Name : `astro_agentforce`
3. Cache Control : `Public`
4. File : upload une PNG d'Astro (la mascotte Salesforce — récupérable via `_zips/seFrAgentforceHeader.zip` qui contient l'image, ou `Original Assets/IMAGES/astro_agentforce.png` du repo)
5. Save

### Composants utilisant des APIs browser

| Composant | API | Browser supporté |
|---|---|---|
| `seFrVoiceNoteTaker` | `SpeechRecognition` | Chrome (WebKit prefix). Firefox / Safari : support partiel |
| `seFrAgentforceHeader` | `SpeechRecognition` + `navigator.clipboard` | Idem |
| `seFrNearbyAccountsMap` | `navigator.geolocation` | Tous, mais HTTPS requis + permission user |

---

## Configuration générale

### Langue (FR / EN)

**Tous les composants user-facing** ont une prop `language` qui par défaut vaut `'fr'`. Pour basculer en anglais, sélectionne le composant dans App Builder et change la prop à `'en'`.

Comportement :
- `'fr'` → titres, labels, toasts, badges, dictionnaire FR
- `'en'` → équivalent EN
- Les overrides explicites (`cardTitle`, `metricLabel`, etc.) gagnent toujours sur le dictionnaire

### Currency

Composants concernés : `seFrTerritoryMap`, `seFrOrderEntry`, `seFrRevenueDashboard`, `seFrCustomerSalesSummary`, `seFrMetricTile`, `seFrKanbanBoard`.

Default : `EUR`. Override via la prop `currencyCode` (ISO 4217 — `EUR`, `USD`, `GBP`, `JPY`, `CHF`…). Le formatage compact (`38,5 k€`) utilise `Intl.NumberFormat` côté navigateur, donc le rendu suit la locale du navigateur de l'utilisateur.

### Couleurs / theme accent

3 conventions cohabitent pour des raisons historiques (à standardiser en v2) :
- **Variable LWC** : `--lwc-brandAccessible` (par défaut Lightning brand)
- **Variable SLDS** : `--slds-g-color-brand-base-50`
- **Hardcoded** : `#0176d3` (bleu Lightning) ou couleur passée via une prop dédiée (`accentColor`, `colorPrimary`, …)

Pour adapter à un client : modifie le thème Lightning de l'org (Setup → Themes and Branding) — la majorité des composants suivent automatiquement. Pour un override par composant, utilise la prop dédiée.

### Image upload (composants concernés)

Les composants `seFrContactCard`, `seFrRecordHighlights`, `seFrRelatedRecordCard` proposent un click-to-upload d'image **par défaut**. L'image est sauvée comme un **File** standard Salesforce attaché au record courant (avec un préfixe de title `__SE_FR_IMG__` pour la library). Aucun champ custom requis.

Pour désactiver : prop `disableImageReplace = true`.

---

## Mode "data" : Live / Hybrid / Mock

| Mode | Comportement | Composants concernés |
|---|---|---|
| **Live** | Lit / écrit dans des records réels via Apex / LDS | Record Highlights, Related Record Card, Pipeline Snapshot, Activity Feed, Files Gallery, Customer Orders, Revenue Dashboard, Territory Map, Nearby Accounts, Order Entry / Summary, Customer Sales Summary, Kanban, Contacts Carousel, My Tasks / Events, Voice Note Taker, Consent Manager |
| **Hybrid** | Lit du réel quand les champs existent, sinon fallback sur du mock | Contact Card, Account Health, Field Rep Home, Telesales Rep Home |
| **Mock** | 100% props-driven, ignore les données de l'org | Alerts Ribbon, Account Strategy Plan, Timeline Phases, Smart Recommendations (sauf si Einstein wired), KPI Launcher, Metric Tile, Active Segments, Splash Banner, Agentforce Header |

**À retenir** : un composant `Mock` reste utile même sur un org riche en données — il sert à **raconter une histoire** sans dépendre de l'état des records.

---

## Catalogue par persona

### Sales B2B
- **Account 360°** : Record Highlights · Contact Card · Related Record Card · Account Health · Pipeline Snapshot
- **Account engagement** : Activity Feed · Files Gallery · Alerts Ribbon · Account Strategy Plan · Timeline Phases · Smart Recommendations
- **Performance** : Revenue Dashboard · KPI Launcher · Metric Tile

### Field Sales
Field Rep Home · Nearby Accounts Map · Territory Map · My Events · Voice Note Taker

### Customer Operations (Telesales + Service)
Telesales Rep Home · Order Entry · Order Summary · Customer Orders · Customer Sales Summary · Kanban Board · Contacts Carousel

### Marketing
Active Segments · Consent Manager

### Agentforce / AI
Prompt Launcher (beta) · Agentforce Header · cross-références (Smart Recommendations, Contact Card prompt summary, Voice Note Taker)

### Transversal UX
Splash Banner · My Tasks · My Events (cross-ref Field Sales)

---

## Fiches détaillées par composant

### `seFrRecordHighlights` — Record Highlights

**Cible** : Record Page (Account, Contact, Opportunity, Case, Lead, Order, Contract, Quote)

**À quoi ça sert** : Remplacer le panneau Highlights standard par une version visuellement plus riche, avec image ronde, actions chargées dynamiquement depuis le page layout, et liste de champs configurables.

**Props clés** :
| Prop | Default | Description |
|---|---|---|
| `language` | `fr` | Langue UI |
| `recordSource` | `current` | `current` (record courant) ou `parent` (Account parent du record) |
| `accountFieldsList` | `AccountNumber, Industry, Type, Phone` | CSV de champs Account |
| `contactFieldsList` | `Title, Email, Phone, Department` | CSV de champs Contact |
| `imageFieldApiName` | – | URL field sur le record (optionnel) |
| `disableImageReplace` | `false` | Off = avatar cliquable pour upload |
| `maxQuickActions` | `2` | Actions affichées (chargées du layout via `PlatformAction`) |

**Pièges à éviter** :
- Sur un Account, il n'y a pas de lookup `ContactId` natif. Pour afficher un contact lié sur Account, utiliser `seFrRelatedRecordCard` à la place.
- Sur les Records sans page layout actions configurées, fallback sur Edit + Delete par défaut.

---

### `seFrContactCard` — Contact Card

**Cible** : Record Page (Contact, Account, Case, Opportunity, Order, Lead)

**À quoi ça sert** : Affiche le contact dans une carte visuelle avec avatar, jusqu'à 3 jauges (santé, NPS, churn risk…), ligne customer ID optionnelle, et un bouton "Résumer" qui appelle un prompt template Einstein.

**Props clés** :
| Prop | Default | Description |
|---|---|---|
| `language` | `fr` | Langue UI |
| `imageFieldApiName` | `SDO_Cust360_Contact_Picture_URL__c` | URL field sur Contact (par défaut SDO) |
| `disableImageReplace` | `false` | Off = avatar cliquable pour upload |
| `gauge1Label` / `gauge1FieldApiName` / `gauge1Direction` | – | Première jauge (label + champ + sémantique lower/higher better) |
| `gauge2*` / `gauge3*` | – | 2ème et 3ème jauges (mêmes props) |
| `disablePromptSummary` | `false` | Off = bouton Résumer affiché |
| `promptTemplateApiName` | `einstein_gpt__summarizeContact` | Template SDO standard |
| `customerIdFieldApiName` | – | Champ ID client à afficher en ligne dédiée |
| `hideWaves` | `false` | Désactive l'animation de vagues en arrière-plan |

**Pièges à éviter** :
- Si tu poses sur une page Case, le composant résout le `ContactId` du Case automatiquement. Si le Case n'a pas de Contact lié → empty state.
- Le prompt summary nécessite que le template `einstein_gpt__summarizeContact` soit présent dans l'org. Sur un org sans Einstein, le bouton apparaît mais le clic renvoie une erreur côté Apex — toggle `disablePromptSummary = true` pour le cacher.
- L'Apex retourne du HTML brut (pas de Markdown) — le rendu utilise `lwc:dom="manual"` + `innerHTML` pour interpréter les balises.

---

### `seFrRelatedRecordCard` — Related Record Card

**Cible** : Record Page (Account, Contact, Case, Opportunity, Order)

**À quoi ça sert** : Carte verticale affichant le "counterpart naturel" du record courant (Account → primary Contact, Contact/Case/Opp/Order → parent Account).

**Props clés** :
| Prop | Default | Description |
|---|---|---|
| `target` | `auto` | `auto` / `account` / `contact` (force le mode) |
| `fieldsCsv` | – | Override des champs affichés |
| `contactImageFieldApiName` | `SDO_Cust360_Contact_Picture_URL__c` | URL field Contact |
| `accountImageFieldApiName` | – | URL field Account (vide = fallback File) |
| `disableImageReplace` | `false` | Off = avatar cliquable |

**Pièges à éviter** :
- Sur Account, il n'y a pas de "primary contact" natif Salesforce. Le composant prend `Account.PersonContactId` (Person Account) puis le 1er Contact enfant créé. Si l'org a un champ custom `Primary_Contact__c`, repointe via le code Apex (à customiser).
- Sur Order, le contact lié est `Order.BillToContactId`.

---

### `seFrAccountHealth` — Account Health

**Cible** : Record Page Account

**À quoi ça sert** : Score de santé compte (gauge 0-100), 3-5 signaux contributifs avec chips trend, fallback sur des valeurs mockées si les champs SDO n'existent pas.

**Props clés** :
- `scoreFieldApiName` (default = champ SDO Cust360)
- `signalFieldsCsv` (CSV de champs numériques contribuant au score)
- `colorThresholds` (default : 0-50 rouge, 50-75 orange, 75-100 vert)

---

### `seFrPipelineSnapshot` — Pipeline Snapshot

**Cible** : Record Page Account

**À quoi ça sert** : Vue compacte des 3-5 opps ouvertes avec stage, montant, total. Conçu pour la sidebar étroite.

---

### `seFrActivityFeed` — Activity Feed

**Cible** : Record Page (Account, Contact)

**À quoi ça sert** : Timeline unifiée agrégeant 16+ types d'activités et événements business :
- `Task`, `Event`, `EmailMessage`
- `VoiceCall`, `MessagingSession`, `LiveChatTranscript`
- `Order`, `Case`, `Opportunity`, `Quote`, `Contract`
- `Visit`
- `ContentDocumentLink`, `FeedItem`, `SurveyResponse`

**Particularité importante** : utilise des **dates métier significatives** plutôt que `CreatedDate` :
- Order → `EffectiveDate`
- Opportunity → `CloseDate`
- Case → `LastModifiedDate` ou `ClosedDate`
- Quote → `ExpirationDate` ou `LastModifiedDate`
- Contract → `StartDate`

**Props clés** :
- `daysBack` (default 365) / `daysForward` (default 90)
- `includeRelatedContacts` (sur Account, inclut les activités liées aux contacts du compte)

---

### `seFrFilesGallery` — Files Gallery

**Cible** : Record Page (any)

**À quoi ça sert** : Carrousel visuel de fichiers attachés au record. Vraies vignettes images (rendition endpoint), icônes doctype pour PDF/Word/Excel, drag-drop upload, click-to-preview.

**Pièges à éviter** :
- La drag-drop zone est custom-built (pas `lightning-file-upload`) pour avoir un layout propre en sidebar étroite. La taille max d'upload est limitée à 5 Mo (limite Aura/Apex pour le base64).

---

### `seFrAlertsRibbon` — Alerts Ribbon

**Cible** : Record Page · Home Page · App Page

**À quoi ça sert** : Ruban d'alertes configurables. Deux sources :
- **Rule-driven** (Record Page only) : règles évaluées contre les champs du record courant
- **Static** (any page) : alertes toujours affichées

**Variants visuels** : `banner` (pastel + bordure accent — défaut), `solid` (saturé + texte blanc), `minimal` (blanc + barre accent).

**Densités** : `comfortable` (multiline) / `compact` (single line + ellipsis).

**Grammaire des règles** :
```
<field><op><value>|<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>
```
Opérateurs : `=`, `!=`, `>`, `<`, `>=`, `<=`, `contains`, `startsWith`, `endsWith`, `isBlank`, `isNotBlank`.
Sévérités : `info`, `success`, `warning`, `error`.

**Exemple** :
```
AnnualRevenue<500000|warning||Petit compte — prioriser l'upsell|Voir les opps|/lightning/o/Opportunity/list
LastActivityDate isBlank|info||Aucune activité enregistrée||
```

---

### `seFrAccountStrategyPlan` — Account Strategy Plan

**Cible** : Record Page Account

**Mock** : sections éditables inline (objectifs, contacts clés, risques, next steps). Pas d'écriture en base — c'est purement visuel.

---

### `seFrTimelinePhases` — Timeline Phases

**Cible** : Home Page · App Page · Record Page

**Mock** : timeline horizontale phasée. Phases configurables via JSON :
```json
[{"label":"Onboarding","date":"2026-01-15","done":true}, ...]
```

Marker "Today" auto-positionné sur l'axe.

---

### `seFrSmartRecommendations` — Smart Recommendations

**Cible** : Record Page (Account, Contact, Case, Order)

**À quoi ça sert** : Panel de next-best-actions style AI. Par défaut, narratives mockées. Optionnellement wired à un prompt template Einstein pour vraie sortie AI.

---

### `seFrRevenueDashboard` — Revenue Dashboard

**Cible** : Record Page Account

**Live** : graph par mois sur Opportunity / Order, overlay year-over-year, KPI strip en haut.

---

### `seFrKpiLauncher` — KPI Launcher

**Cible** : Home Page · App Page · Record Page

**Mock** (40+ props) : grille de 4-8 tuiles KPI configurables avec valeur, trend, click-through. Le composant le plus tunable de la lib.

---

### `seFrMetricTile` — Metric Tile

**Cible** : Home Page · App Page · Record Page

**Refondu en v2** : 4 chart styles (`line` / `area` / `bar` / `mini-donut`), série secondaire dashed (forecast vs actual), target line horizontale, formatage Intl currency, scaling auto/from-zero/fixed.

**Props clés** :
- `chartStyle` (4 valeurs)
- `seriesJson` + `secondarySeriesJson`
- `currentValue` (numérique → auto-format) ou `currentValueDisplay` (texte manuel)
- `targetValue` + `showTargetLabel`
- `currencyCode`

---

### `seFrFieldRepHome` — Field Sales Rep Home

**Cible** : Home Page · App Page

**Hybrid** : page d'accueil mobile-friendly composant tasks, events, nearby accounts, KPI strip. Pour rep terrain qui démarre sa journée.

---

### `seFrNearbyAccountsMap` — Nearby Accounts Map

**Cible** : Home Page · App Page

**Live** : map interactive des comptes proches de la géoloc du rep. Géoloc browser → fallback sur lat/lng configuré (Place de la Bastille par défaut).

**Logique de tri** : Apex remonte un pool de 200 comptes du running user, puis le LWC trie par distance haversine et garde les `limitCount` plus proches (10 par défaut).

---

### `seFrTerritoryMap` — Territory Map

**Cible** : Home Page · App Page

**Live** : map agrégée du territoire commercial. Pins color-coded par tier de pipeline ouvert (rouge top 20% / orange / vert / gris). 4 KPI tiles. Side panel filtres : Owner / RecordType / Amount range / Stages / Case status / 2 picklist Account configurables (default Type + Industry). Export CSV.

**Props clés** :
- `defaultCenterLatitude` / `defaultCenterLongitude` (default France 46.7°N, 2.5°E)
- `mapHeight` (default 480px)
- `mapWidthRatio` (default 0.66 — map ~ 2/3, liste ~ 1/3)
- `filterFieldAApiName` / `filterFieldBApiName` (default `Type` et `Industry`)

---

### `seFrMyEvents` & `seFrMyTasks`

**Cible** : Home Page · App Page · Record Page

**Live** : agenda compact des events/tasks du running user. Mêmes props (days back/forward), même Apex partagé `SE_FR_AgendaController`.

---

### `seFrVoiceNoteTaker` — Voice Note Taker

**Cible** : Record Page (Account, Contact, Lead, Opportunity)

**Live** : speech-to-text via `window.SpeechRecognition` (browser API). Transcript sauvé comme Note attachée au record. **Chrome only** (Firefox / Safari ont un support partiel).

---

### `seFrTelesalesRepHome` — Telesales Rep Home

**Cible** : Home Page · App Page

**Hybrid** : home page inside-sales avec calls du jour, kanban cases, KPIs, quick actions.

---

### `seFrOrderEntry` — Order Entry

**Cible** : Record Page (Account, Case)

**Live** : formulaire de création d'order rapide avec autocomplete produit, **images produits** (`Product2.Image_URL__c` par défaut), quantités, prix, last-order recall, stock visibility, modale de confirmation.

---

### `seFrOrderSummary` — Order Summary

**Cible** : Record Page Case

**Live** : récap compact d'un order avec line items, totaux, séparateur "OR/OU".

---

### `seFrCustomerOrders` — Customer Orders

**Cible** : Record Page (Account, Contact)

**Live** : liste des orders passés avec **vignettes images produits**, statut, montant, date, click-through.

---

### `seFrCustomerSalesSummary` — Customer Sales Summary

**Cible** : Record Page (Contact, Account incl. Person Account)

**Live** : vue agrégée revenue / basket size / fréquence / top catégories. Auto-detect B2B vs B2C.

---

### `seFrKanbanBoard` — Kanban Board

**Cible** : Home Page · App Page · Record Page

**Live** : kanban drag-drop pour 6 SObjects (Case, Opportunity, Lead, Order, Task, Account). Auto-détecte le scope sur Record Page (`recordScopeField` par défaut `AccountId`).

---

### `seFrContactsCarousel` — Contacts Carousel

**Cible** : Record Page Account

**Live** : carrousel horizontal des contacts du compte avec avatar, role, quick actions.

---

### `seFrActiveSegments` — Active Segments

**Cible** : Home Page · App Page · Record Page

**Mock** : liste visuelle de segments marketing avec audience size + last-updated chip.

---

### `seFrConsentManager` — Consent Manager

**Cible** : Record Page (Contact, Lead, Account)

**Live** : matrice consents (email / phone / WhatsApp). Lit/écrit les **champs Salesforce standards** :
- `HasOptedOutOfEmail`
- `DoNotCall`
- `HasOptedOutOfFax` (utilisé comme stand-in pour WhatsApp opt-out)

Override possible via `channelsCsv` au format `label|fieldApiName|inverted`.

---

### `seFrPromptLauncher` — Prompt Launcher

> Le bundle s'appelle toujours `seFrPromptLauncher` pour préserver les FlexiPages déployées, mais le composant est désormais un **Prompt Launcher** : panneau qui exécute des Salesforce Prompt Templates via le endpoint Invocable Actions. Le SE choisit la liste de prompts à exposer, l'utilisateur clique, le résultat s'affiche avec mise en forme HTML.

**Cible** : Home Page · App Page · Record Page

**Live** — appelle l'endpoint REST `/services/data/v62.0/actions/custom/generatePromptResponse/<DeveloperName>` via un Named Credential.

**Comment ça marche** :
1. Pills cliquables en haut, une par prompt configuré
2. Le composant **filtre les prompts** selon le `objectApiName` du host (Account → "Account summary", Home Page → "Summarize text"…)
3. Si le prompt requiert des inputs business, ils s'affichent en formulaire (text/textarea/number/picklist)
4. Le **record context est auto-injecté** (pas de `recordId` à saisir)
5. Click "Lancer" → réponse formatée HTML, avec boutons Copy / Save as Note

**Catalogue par défaut** :

| Prompt | Affiché sur |
|---|---|
| `einstein_gpt__summarizeAccountDefault` | Account record pages |
| `einstein_gpt__summarizeContact` | Contact record pages |
| `einstein_gpt__summarizeDeal` | Opportunity record pages |
| `einstein_gpt__summarizeLead` | Lead record pages |
| `svc_emp_intelligence__SummarizeRecord` | Case record pages |
| `einstein_gpt__summarizeText` | Partout (input texte libre) |
| `einstein_gpt__refineText` | Partout (input texte libre) |

Le SE peut override via la prop `promptsJson`. Format :

```json
[
    {
        "apiName": "einstein_gpt__summarizeAccountDefault",
        "label": "Account summary",
        "icon": "utility:summarydetail",
        "objects": ["Account"],
        "recordInputName": "Input:Account"
    },
    {
        "apiName": "my_namespace__customPrompt",
        "label": "Custom analysis",
        "icon": "utility:opportunity",
        "objects": ["Account"],
        "recordInputName": "Input:Account",
        "userInputs": [
            { "name": "Input:focus", "label": "Focus area", "type": "text", "required": true }
        ],
        "extraInputs": { "Input:context": "Standalone analysis, no transcript." }
    }
]
```

| Champ | Description |
|---|---|
| `apiName` | DeveloperName du prompt template |
| `label` | Libellé affiché sur le pill |
| `icon` | SLDS utility icon |
| `objects` | Array d'objets compatibles. Vide / omis = visible partout |
| `recordInputName` | Nom de l'input à auto-remplir avec `recordId` du host (ex `Input:Account`) |
| `recordInputType` | `sobject` (défaut, envoie `{Id:'001...'}`) ou `string` (envoie le recordId brut) |
| `userInputs[]` | Inputs business à demander à l'utilisateur (`name`, `label`, `type`, `required`, `options`) |
| `extraInputs` | Inputs cachés requis par le template — Salesforce rejette `""` pour les required, donc utiliser un placeholder genre `"N/A"` |

**Pièges à éviter** :
- L'API rejette les **strings vides** pour les inputs required → toujours mettre un placeholder non-trivial dans `extraInputs`
- Les Prompt Templates avec input typé SObject (la majorité des "summarize") attendent **un objet** `{Id:"..."}`, pas une string
- Le Named Credential **doit exister** dans l'org — voir [Prérequis techniques](#prérequis-techniques)
- Si `cardIcon` est laissé par défaut sur `standard:bot`, l'icône peut ne pas charger sur certaines orgs — override avec un autre standard icon (`standard:einstein_chat`, `standard:announcement`...)

**Format de réponse — auto-détection HTML / Markdown** :
Les Prompt Templates Salesforce renvoient soit du HTML (`<p><strong>…</strong></p>`), soit du Markdown (`**bold**`, listes `- `, headings `#`). Le composant **détecte automatiquement** lequel et rend correctement les deux. Le Markdown est converti en HTML côté client (gras, italique, listes ordonnées / non-ordonnées, headings h1-h3, liens `[text](url)`, code inline, paragraphes, retours à la ligne).

**Hauteur dynamique** :
Le composant **s'adapte à la hauteur de son contenu** par défaut. Pas besoin de configurer de hauteur fixe. Pour borner la hauteur sur des dashboards denses, utilise la prop `maxHeight` (en px) — au-delà, scroll interne. La prop `height` (legacy v1) n'est plus utilisée.

---

---

### `seFrAgentforceHeader` — Agentforce Header

**Cible** : Home Page

**Mock** : hero banner avec mascotte Astro animée + champ speech-to-text + bouton "Send" qui copie le transcript dans le clipboard (à coller dans la fenêtre Agentforce standard pour fluide démo).

---

### `seFrSplashBanner` — Splash Banner

**Cible** : Home Page · App Page · Record Page

**Mock** : welcome banner avec **8 fonds animés** (Waves, Aurora, Mesh, Orbs, Conic, Geometric, Constellation, Grid). Pure CSS/SVG.

---

## FAQ + troubleshooting

### Le composant ne s'affiche pas dans App Builder

1. Vérifie le `<isExposed>true</isExposed>` dans le `js-meta.xml`
2. Vérifie que la cible (`<target>lightning__RecordPage</target>` etc.) correspond au type de page
3. Vérifie que l'objet listé dans `<objects>` correspond au record courant (Record Page only)
4. Hard refresh App Builder (Cmd+Shift+R)

### Je ne vois pas les données attendues

1. **Live** components : vérifie que les records existent et que ton user a la visibility (sharing rules, OWD)
2. **Hybrid** components : vérifie que les champs SDO référencés existent dans ton org. Si non → fallback Mock automatique
3. **Cache LWC** : Salesforce cache les wires `cacheable=true`. Hard refresh (Cmd+Shift+R) ou attends 30 s

### "Je ne vois aucun compte autour de moi" sur Nearby Accounts

L'Apex remonte les **comptes du running user** (filtre `OwnerId = userId`). Si tu n'es pas owner de comptes proches → fallback automatique sur "tous owners". Vérifie que tes comptes ont `BillingLatitude` / `BillingLongitude` non nuls.

### Le résumé Einstein n'apparaît pas sur Contact Card

1. Vérifie que le prompt template `einstein_gpt__summarizeContact` existe dans l'org (Setup → Prompt Builder)
2. Si l'org n'a pas Einstein activé → toggle `disablePromptSummary = true`
3. Le rendu utilise `innerHTML` pour interpréter le HTML retourné par le prompt — si tu vois les balises HTML en clair, vide le cache du browser

### "Le composant ne respecte pas la langue choisie"

5 composants n'avaient pas la prop `language` historiquement (`seFrAccountHealth`, `seFrAgentforceHeader`, `seFrTimelinePhases`, `seFrActiveSegments`, `seFrAlertsRibbon`). Ils ont été ajoutés depuis. Si l'un d'entre eux ne réagit pas, vérifie que tu as bien la dernière version déployée.

### Click-to-upload image ne marche pas

1. L'utilisateur a-t-il les permissions `ContentDocument` (create) + `ContentDocumentLink` ?
2. La taille du fichier dépasse-t-elle 3 Mo (limite hard-codée pour les images, payload base64 Aura) ?
3. Le navigateur supporte-t-il `FileReader` (oui pour Chrome/Firefox/Safari récents)

### Drag-drop ne marche pas sur Kanban

`disableDragDrop = true` ? Sinon vérifie que le user a `Edit` sur le champ `groupByField` (par défaut `Status`).

### CSV export ne télécharge rien sur Territory Map

Locker / Lightning Container peut bloquer les Blob URLs. La v2 utilise un data URL + dispatch d'un `MouseEvent` synthétique sur un anchor attaché à `document.body`. Si tu vois encore le bug, vérifie que tu as la dernière version déployée.

### Le speech-to-text ne marche pas sur Voice Note Taker / Agentforce Header

Le browser API `SpeechRecognition` n'est implémenté que dans Chrome (préfixée `webkitSpeechRecognition`). Firefox et Safari n'ont qu'un support partiel. Demande à l'utilisateur d'utiliser Chrome.

---

## Limites techniques connues

### Plateforme Salesforce

| Limite | Workaround |
|---|---|
| `@AuraEnabled` méthodes ne supportent pas plus de 6 Mo de payload | Image upload limitée à 3 Mo (base64 = 4 Mo en transit) |
| `cacheable=true` wires skip quand un param est `undefined` | Composants concernés (Kanban, ContactCard) utilisent imperative Apex calls dans `connectedCallback` + dedup key |
| `CreatedDate` / `LastModifiedDate` sont read-only sans la perm "Set Audit Fields upon Record Creation" | Activity Feed utilise les **dates métier** (CloseDate, EffectiveDate, StartDate) au lieu de CreatedDate |
| Person Accounts ne permettent pas d'updater `Name` (calculé) | Les scripts d'update accounts excluent ce champ explicitement |
| `lightning-file-upload` est dans son propre shadow DOM, son CSS est inaccessible depuis le LWC parent | Files Gallery embarque sa propre dropzone custom + `<input type="file">` natif |
| `lightning-card` ajoute une chrome avec padding inaccessible via CSS variables sur certaines versions | Composants à fond animé (Contact Card) utilisent un chrome custom au lieu de `<lightning-card>` |
| Activated Order / Contract ne permettent pas d'update certains champs (EffectiveDate, StartDate) | Scripts d'update filtrent sur Status = Draft uniquement |
| `lightning/uiRecordActionsApi` n'est pas exposé publiquement | Record Highlights utilise une Apex `PlatformAction` SOQL pour charger les actions du layout |
| AppExchange ne distribue pas les composants utilisant des modules `lightning/*` non-publics | Pas concerné — la lib utilise uniquement des modules publics |

### Apps Script / Slides

| Limite | Workaround |
|---|---|
| `SlidesApp` ne permet pas d'appliquer un layout master custom programmatiquement | Le générateur utilise `TITLE_AND_BODY` par défaut. Re-styling manuel après |
| Pas d'API pour insérer des images / GIFs depuis Drive | Ajout manuel dans Slides UI |
| Pas de tables natives via le générateur | Plain text avec espaces — convertir manuellement |
| 6 minutes max d'exécution par run | OK pour 47 slides |
| Première exécution requiert OAuth interactif | One-time setup |

### Browser / runtime

| Limite | Workaround |
|---|---|
| `SpeechRecognition` API : Chrome only (préfixe webkit) | Voice Note Taker / Agentforce Header recommandent Chrome |
| Geolocation API requiert HTTPS + permission user | Nearby Accounts a un fallback sur lat/lng configuré |
| Locker Service peut bloquer certains patterns DOM | Patterns testés sur Lightning Locker activé — voir audit pour détails |
| `Intl.NumberFormat` `notation: 'compact'` n'est pas supporté sur navigateurs très anciens | Fallback sur rendu standard avec try/catch |

### Multi-langue

| Limite | Workaround |
|---|---|
| Les composants `Mock` props-driven (Alerts Ribbon, KPI Launcher, Active Segments…) n'ont pas de dictionnaire dynamique pour le contenu typé par le SE | Le SE doit re-typer les libellés en App Builder pour chaque langue |
| Custom Labels Salesforce ne sont pas utilisés (volontairement, pour rester déployable sans setup) | OK pour démo, à reconsidérer si productisé |

### Dépendances inter-composants

| Composant | Dépendance |
|---|---|
| `seFrContactCard`, `seFrRecordHighlights`, `seFrRelatedRecordCard` | `SE_FR_ImageFileController` (shared) |
| `seFrMyEvents`, `seFrMyTasks` | `SE_FR_AgendaController` (shared) |
| `seFrNearbyAccountsMap` | `SE_FR_NearbyAccountsController` (shared) |
| `seFrVoiceNoteTaker` | `SE_FR_VoiceNoteController` (shared) |

Le dossier `_shared_apex/classes/` doit être déployé **une seule fois** par org. L'audit (`_deck/AUDIT.md`) liste les composants qui embarquent encore une copie locale (à dédupliquer dans le futur "clean export" dossier).

---

## Contribuer

### Reporter un bug

Pour l'instant : ping Lionel directement (`lionel.braun@salesforce.com`).
Quand le repo GitHub est en ligne (planifié H2 2026) : open issue avec :
- Composant concerné
- Steps to reproduce
- Comportement attendu vs observé
- Screenshot si pertinent
- Org type (SDO / IDO / scratch / other)

### Proposer un nouveau composant

Pré-requis pour qu'un composant soit accepté dans la lib :
- LWC + meta.xml + (optionnel) Apex controller
- Bilingue FR/EN (prop `language`, dictionnaire LABELS)
- Schema-safe (aucun champ custom requis sauf override App Builder explicite)
- Defaults industry-agnostic
- README avec : purpose, targets, props table, demo notes, troubleshooting
- Convention de nommage : `seFr<Name>` LWC, `SE_FR_<Name>Controller` Apex, `CCO FR - <Name>` master label

### Standards de code

- API version 59.0 partout (sauf raison documentée)
- Default `language = 'fr'`
- Pas de slang / informal copy dans les strings user-visible
- Pas de console.log oubliés en prod
- Tirets simples uniquement
- Apex classes `with sharing` par défaut
- Tests Apex : non-requis pour les démos (couverture non vérifiée), mais bienvenue

### Documentation

Chaque composant doit avoir son `README.md` avec la structure suivante :
1. Purpose (1-2 phrases)
2. Targets
3. Quick start (exemple de config)
4. Properties table
5. SE benefits
6. (optionnel) Pièges à éviter / troubleshooting

---

*Document maintenu par Lionel Braun — Solution Engineering France · 2026.*
