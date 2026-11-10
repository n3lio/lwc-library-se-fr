# CCO FR Component Library

[![Live site](https://img.shields.io/badge/Site-live-brightgreen)](https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com/)
[![Repo](https://img.shields.io/badge/GitHub-public-blue)](https://github.com/n3lio/lwc-library-se-fr)
[![Components](https://img.shields.io/badge/Components-35-blueviolet)](https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com/components.html)

A reusable catalog of **35 Lightning Web Components** and Apex controllers for **Salesforce Solution Engineers**. Every component is generic: titles, labels, values, filters, picklist options and demo data are exposed as App Builder properties so you can adapt them to any customer context without editing code.

> 🌐 Browse and download from the live site: **https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com/**
> 👥 Audience: Salesforce SE community (EMEA + worldwide). Public for transparency, sharing is welcome.

> ⚠️ **Disclaimer**: maintained by a Salesforce SE on personal time as a community asset. Not an official Salesforce product, not supported by Salesforce. Use at your own risk on demo / SDO orgs.

## Language (EN / FR)

Every component (except `seFrAgentforceHeader`) exposes a **`language`** property in App Builder. Accepted values:

- `en` — English (default). Every UI string (card titles, buttons, headings, toasts, bar labels) comes from the English dictionary baked into the bundle.
- `fr` — French. Same surface, translated.

The language prop only drives **built-in UI text**. Any `@api` property you set explicitly in App Builder (e.g. `cardTitle`, `kpi1Label`, `greetingTemplate`, `penetrationTip`, `strengthsCsv`, `actionPlanCsv`…) wins over the dictionary default — so a French SE demo'ing to a German prospect can still override individual labels in German without switching the whole language.

Behavior summary:
| You set | Result |
|---|---|
| `language=en`, no override | English defaults everywhere |
| `language=fr`, no override | French defaults everywhere |
| `language=fr`, explicit `cardTitle="Synthèse client"` | French everywhere **except** cardTitle which uses your value |

Date/number formatting is controlled by the separate `localeTag` property (e.g. `en-US`, `fr-FR`) — it's independent from `language` so you can demo FR labels with a US currency, or EN labels with a European date format.

## Preparing demo data

Most components in the library render the data they find in the org as-is — they don't ship with mock data that would pollute a customer SDO. On a **fresh** SDO, several components will look empty or underwhelming until the SE seeds a showcase Account.

Per-component prerequisites are listed in each bundle's README under **"Data enrichment prerequisites"**. Typical items:
- `seFrPipelineSnapshot` — 3–5 open Opportunities across different stages.
- `seFrAccountHealth` — `AnnualRevenue`, recent `LastActivityDate`, ≥1 open Opp and ≥1 recent Order.
- `seFrFilesGallery` — at least one `ContentDocumentLink` attached.
- `seFrContactsCarousel` — Contacts with `Title` / `Department` filled.
- `seFrNearbyAccountsMap` — Accounts with `BillingLatitude` / `BillingLongitude` geocoded, reasonably close to the SE's position.
- `seFrMyEvents` / `seFrActivityFeed` — Events on the next 14 days owned by the running user, and the user's timezone set correctly.

## Naming convention

| Artifact | Convention | Example |
|---|---|---|
| LWC folder / JS class | `seFr` + PascalCase | `seFrAccountStrategyPlan`, `SeFrAccountStrategyPlan` |
| Apex class | `SE_FR_` + PascalCase | `SE_FR_AccountWeatherController` |
| App Builder master label | `CCO FR - <Human name>` (simple dashes only) | `CCO FR - Account Strategy Plan` |
| Custom strings in code | French defaults, overridable via `language` or explicit props | `cardTitle = 'Prise de commande'` |

## Component categorization

Each component is tagged along several axes so SEs can navigate the library by **category**, **persona**, **surface** or **mobile-readiness**.

> The four pivots below are auto-generated from `_build/manifest.json`. Edit the source-of-truth frontmatter in each component's README, then run `python3 _build/build_root_readme.py` to refresh.

### By category

<!-- MANIFEST:start by-category -->
| Category | Components |
|---|---|
| **Geo & Field** | `seFrNearbyAccountsMap`, `seFrTerritoryMap`, `seFrVoiceNoteTaker` |
| **Dashboards & KPIs** | `seFrFieldRepHome`, `seFrKpiLauncher`, `seFrMetricTile`, `seFrRevenueDashboard`, `seFrTelesalesRepHome` |
| **Transverse** | `seFrActivityFeed`, `seFrAgentforceHeader`, `seFrContactCard`, `seFrContactsCarousel`, `seFrFilesGallery`, `seFrRecordActions`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrSplashBanner` |
<!-- MANIFEST:end by-category -->

### By persona

<!-- MANIFEST:start by-persona -->
| Persona | Components |
|---|---|
| **Sales (B2B account management)** | `seFrAccountHealth`, `seFrAccountStrategyPlan`, `seFrActivityFeed`, `seFrAlertsRibbon`, `seFrBusinessCardScanner`, `seFrContactCard`, `seFrContactsCarousel`, `seFrCustomerOrders`, `seFrEngagementHistory`, `seFrFilesGallery`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrPipelineSnapshot`, `seFrRecordActions`, `seFrRelatedRecordCard`, `seFrRevenueDashboard`, `seFrSmartRecommendations`, `seFrSubscribersList`, `seFrTerritoryMap`, `seFrTimelinePhases`, `seFrVisitKanban`, `seFrVisitQuickOrder`, `seFrVisitRestockOrder` |
| **Field Sales (rep on the ground)** | `seFrActivityFeed`, `seFrBusinessCardScanner`, `seFrContactCard`, `seFrContactsCarousel`, `seFrFieldRepHome`, `seFrFilesGallery`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrNearbyAccountsMap`, `seFrRecordActions`, `seFrRelatedRecordCard`, `seFrRevenueDashboard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrSubscribersList`, `seFrTerritoryMap`, `seFrVisitCheckIn`, `seFrVisitKanban`, `seFrVisitPlan`, `seFrVisitProductCheck`, `seFrVisitQuickOrder`, `seFrVisitRestockOrder`, `seFrVisitShelfCompliance`, `seFrVisitShelfSpace`, `seFrVisitSummaryAI`, `seFrVoiceNoteTaker` |
| **Telesales (inside sales / contact center)** | `seFrActivityFeed`, `seFrContactCard`, `seFrContactsCarousel`, `seFrCustomerOrders`, `seFrFilesGallery`, `seFrKanbanBoard`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrOrderEntry`, `seFrRecordActions`, `seFrRelatedRecordCard`, `seFrRevenueDashboard`, `seFrSmartRecommendations`, `seFrTelesalesRepHome` |
| **Service (support, case handling)** | `seFrActivityFeed`, `seFrAlertsRibbon`, `seFrConsentManager`, `seFrContactCard`, `seFrContactsCarousel`, `seFrFilesGallery`, `seFrKanbanBoard`, `seFrMetricTile`, `seFrOrderSummary`, `seFrRecordActions`, `seFrRelatedRecordCard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrSubscribersList` |
| **Retail (B2C point of sale)** | `seFrBusinessCardScanner`, `seFrCustomerSalesSummary`, `seFrLeadFirstTouch`, `seFrVisitCheckIn`, `seFrVisitKanban`, `seFrVisitPlan`, `seFrVisitProductCheck`, `seFrVisitQuickOrder`, `seFrVisitRestockOrder`, `seFrVisitShelfCompliance`, `seFrVisitShelfSpace`, `seFrVisitSummaryAI` |
| **Marketing** | `seFrActiveSegments`, `seFrActivityFeed`, `seFrBusinessCardScanner`, `seFrConsentManager`, `seFrContactCard`, `seFrContactsCarousel`, `seFrCustomerSalesSummary`, `seFrEngagementHistory`, `seFrFilesGallery`, `seFrMetricTile`, `seFrRelatedRecordCard`, `seFrSmartRecommendations` |
| **All / Transverse** | `seFrAgentforceHeader`, `seFrKpiLauncher`, `seFrMyEvents`, `seFrMyTasks`, `seFrPromptLauncher`, `seFrRecordHighlights`, `seFrSplashBanner` |

A component can appear in more than one row when it's genuinely multi-persona.
<!-- MANIFEST:end by-persona -->

### By surface

<!-- MANIFEST:start by-surface -->
| Surface | Components |
|---|---|
| **Home Page** | `seFrActiveSegments`, `seFrAgentforceHeader`, `seFrAlertsRibbon`, `seFrBusinessCardScanner`, `seFrEngagementHistory`, `seFrFieldRepHome`, `seFrKanbanBoard`, `seFrKpiLauncher`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrMyEvents`, `seFrMyTasks`, `seFrNearbyAccountsMap`, `seFrPromptLauncher`, `seFrSplashBanner`, `seFrSubscribersList`, `seFrTelesalesRepHome`, `seFrTerritoryMap`, `seFrTimelinePhases`, `seFrVisitSummaryAI` |
| **App Page** | `seFrActiveSegments`, `seFrAlertsRibbon`, `seFrBusinessCardScanner`, `seFrEngagementHistory`, `seFrFieldRepHome`, `seFrKanbanBoard`, `seFrKpiLauncher`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrMyEvents`, `seFrMyTasks`, `seFrNearbyAccountsMap`, `seFrPromptLauncher`, `seFrSplashBanner`, `seFrSubscribersList`, `seFrTelesalesRepHome`, `seFrTerritoryMap`, `seFrTimelinePhases`, `seFrVisitQuickOrder`, `seFrVisitSummaryAI` |
| **Record Page** | `seFrAccountHealth`, `seFrAccountStrategyPlan`, `seFrActiveSegments`, `seFrActivityFeed`, `seFrAlertsRibbon`, `seFrBusinessCardScanner`, `seFrConsentManager`, `seFrContactCard`, `seFrContactsCarousel`, `seFrCustomerOrders`, `seFrCustomerSalesSummary`, `seFrEngagementHistory`, `seFrFilesGallery`, `seFrKanbanBoard`, `seFrKpiLauncher`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrOrderEntry`, `seFrOrderSummary`, `seFrPipelineSnapshot`, `seFrPromptLauncher`, `seFrRecordActions`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrRevenueDashboard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrSplashBanner`, `seFrSubscribersList`, `seFrTimelinePhases`, `seFrVisitCheckIn`, `seFrVisitKanban`, `seFrVisitPlan`, `seFrVisitProductCheck`, `seFrVisitQuickOrder`, `seFrVisitRestockOrder`, `seFrVisitShelfCompliance`, `seFrVisitShelfSpace`, `seFrVisitSummaryAI`, `seFrVoiceNoteTaker` |
<!-- MANIFEST:end by-surface -->

### Mobile-ready

<!-- MANIFEST:start by-mobile -->
| Mobile-ready | Components |
|---|---|
| ✅ **Yes** (29) | `seFrActiveSegments`, `seFrAgentforceHeader`, `seFrBusinessCardScanner`, `seFrConsentManager`, `seFrContactCard`, `seFrEngagementHistory`, `seFrFilesGallery`, `seFrKpiLauncher`, `seFrLeadFirstTouch`, `seFrMetricTile`, `seFrMyTasks`, `seFrNearbyAccountsMap`, `seFrRecordActions`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrSplashBanner`, `seFrSubscribersList`, `seFrTimelinePhases`, `seFrVisitCheckIn`, `seFrVisitPlan`, `seFrVisitProductCheck`, `seFrVisitQuickOrder`, `seFrVisitRestockOrder`, `seFrVisitShelfCompliance`, `seFrVisitShelfSpace`, `seFrVisitSummaryAI`, `seFrVoiceNoteTaker` |
| ⚪ No (18) | `seFrAccountHealth`, `seFrAccountStrategyPlan`, `seFrActivityFeed`, `seFrAlertsRibbon`, `seFrContactsCarousel`, `seFrCustomerOrders`, `seFrCustomerSalesSummary`, `seFrFieldRepHome`, `seFrKanbanBoard`, `seFrMyEvents`, `seFrOrderEntry`, `seFrOrderSummary`, `seFrPipelineSnapshot`, `seFrPromptLauncher`, `seFrRevenueDashboard`, `seFrTelesalesRepHome`, `seFrTerritoryMap`, `seFrVisitKanban` |
<!-- MANIFEST:end by-mobile -->

## Component catalog

<!-- MANIFEST:start catalog -->
| Component | Master label | Tagline | Categories | Targets | Object(s) | Apex |
|---|---|---|---|---|---|---|
| `seFrAccountHealth` | CCO FR - Account Health | Quantitative account health score (0-100) with verdict level and weighted positive / negative signals. | Sales | RecordPage | Account | `SE_FR_AccountHealthController` |
| `seFrAccountStrategyPlan` | CCO FR - Account Strategy Plan | Narrative account plan with editable KPIs, target gauge, SWOT 2x2 and quarterly action plan. | Sales | RecordPage | Account | — |
| `seFrActiveSegments` | CCO FR - Active Segments | Compact panel showing the marketing / Data Cloud segments the record belongs to, as colored badges. | Marketing | AppPage / HomePage / RecordPage | — | — |
| `seFrActivityFeed` | CCO FR - Activity Feed | Unified activity timeline aggregating 16+ Salesforce record types in a single feed with rich filtering. | Transverse | RecordPage | Account / Contact | `SE_FR_ActivityFeedController` |
| `seFrAgentforceHeader` | CCO FR - Agentforce Header | Astro-themed Home page header with a search / dictation box that forwards questions to the Agentforce panel. | Transverse | HomePage | — | — |
| `seFrAlertsRibbon` | CCO FR - Alerts Ribbon | Configurable alerts ribbon combining declarative record-driven rules with always-on static banners. | Service | AppPage / HomePage / RecordPage | Account / Contact / Case / Opportunity / Lead / Order / Contract | — |
| `seFrBusinessCardScanner` | CCO FR - Business Card Scanner | Drop business card photos, get editable lead cards pre-filled by a simulated OCR, then bulk-create the leads. | Retail Execution | AppPage / HomePage / RecordPage | — | — |
| `seFrConsentManager` | CCO FR - Consent Manager | Per-channel GDPR consent toggle panel binding each channel to a boolean field on the current record. | Marketing | RecordPage | Contact / Lead / Account | — |
| `seFrContactCard` | CCO FR - Contact Card | Visual contact card with animated waves, avatar, address, configurable gauges and optional Einstein prompt summary. | Transverse | RecordPage | Contact / Account / Case / Opportunity / Order / Lead | `SE_FR_ContactCardController` + `SE_FR_ImageFileController` |
| `seFrContactsCarousel` | CCO FR - Contacts Carousel | Horizontal carousel of an Account's Contacts with avatars, role badges and quick Email / Call actions. | Transverse | RecordPage | Account | `SE_FR_ContactsCarouselController` + `SE_FR_ImageFileController` |
| `seFrCustomerOrders` | CCO FR - Customer Orders | Last order detail card plus searchable, sortable, filterable order history for an Account or Contact. | Sales | RecordPage | Account / Contact / Visit__c | `SE_FR_CustomerOrdersController` + `Visit__c` |
| `seFrCustomerSalesSummary` | CCO FR - Customer Sales Summary | B2C-leaning sales summary with KPI tiles and breakdowns by Category, Brand and Store. | Marketing | RecordPage | Contact / Account | — |
| `seFrEngagementHistory` | CCO FR - Engagement History | Configurable marketing engagement timeline with colored typed icons and inline search. | Marketing | AppPage / HomePage / RecordPage | Lead / Contact / Account | — |
| `seFrFieldRepHome` | CCO FR - Field Sales - Rep Home | Field Sales rep home page with greeting, KPIs, priority accounts, hot leads, product penetration and campaign calendar. | Dashboards & KPIs | AppPage / HomePage | — | `SE_FR_FieldSalesController` |
| `seFrFilesGallery` | CCO FR - Files Gallery | Visual gallery of files attached to any record with image thumbnails, doctype icons and drag-and-drop upload. | Transverse | RecordPage | — | `SE_FR_FilesGalleryController` |
| `seFrKanbanBoard` | CCO FR - Kanban Board | Generic kanban board with native drag & drop on any whitelisted SObject (Case, Opp, Lead, Order, Task, Account). | Service | AppPage / HomePage / RecordPage | — | `SE_FR_KanbanBoardController` |
| `seFrKpiLauncher` | CCO FR - KPI Launcher | Configurable grid of 3-6 clickable KPI tiles with icon, value, color and link, ready out of the box. | Dashboards & KPIs | AppPage / HomePage / RecordPage | — | — |
| `seFrLeadFirstTouch` | CCO FR - Lead First Touch | Lead "First Touch Capture" mock — drop notes, paste a transcript, get simulated AI meeting notes, then simulated follow-up Tasks and Events. | Retail Execution | AppPage / HomePage / RecordPage | Lead | — |
| `seFrMetricTile` | CCO FR - Metric Tile | Single-metric tile with 4 chart styles (line / area / bar / mini-donut), comparison series, target line and currency formatting. | Dashboards & KPIs | AppPage / HomePage / RecordPage | — | — |
| `seFrMyEvents` | CCO FR - My Events | Today's calendar as a compact vertical timeline that fits a sidebar column, with Google-Calendar-style overlap. | Productivity | AppPage / HomePage | — | `SE_FR_AgendaController` |
| `seFrMyTasks` | CCO FR - My Tasks | Compact 'My Tasks' sidebar panel grouped by due date with one-click completion. | Productivity | AppPage / HomePage | — | `SE_FR_AgendaController` |
| `seFrNearbyAccountsMap` | CCO FR - Nearby Accounts Map | Interactive map of nearby accounts using the browser's geolocation with Haversine distance sort. | Geo & Field | AppPage / HomePage | — | `SE_FR_NearbyAccountsController` |
| `seFrOrderEntry` | CCO FR - Order Entry | Full-grid order entry on an Account or Case with stock, AI-recommended quantities and discounts, persisted as real Order records. | Sales | RecordPage | Account / Case / Visit__c | `SE_FR_OrderEntryController` + `Visit__c` |
| `seFrOrderSummary` | CCO FR - Order Summary | Most recent Order linked to a Case with products, total, delivery info and edit / delete / submit actions. | Service | RecordPage | Case | `SE_FR_OrderSummaryController` |
| `seFrPipelineSnapshot` | CCO FR - Pipeline Snapshot | Account-level pipeline visualization with summary tiles and one column per Opportunity stage. | Sales | RecordPage | Account / Opportunity | `SE_FR_PipelineSnapshotController` |
| `seFrPromptLauncher` | CCO FR - Prompt Launcher | Configurable AI panel running Salesforce Prompt Templates via Invocable Actions, with auto-filled record context. | Productivity | AppPage / HomePage / RecordPage | — | `SE_FR_PromptLauncherController` |
| `seFrRecordActions` | CCO FR - Record Actions | Compact record-page toolbar for Account, Contact, Lead, Opportunity and Case — one primary button (Screen Flow or standard New Task / Event / Case / Opportunity form) + an inline Einstein AI summary. | Transverse | RecordPage | Account / Contact / Opportunity / Case / Lead | `SE_FR_AccountActionsController` + `seFrFlowModal` |
| `seFrRecordHighlights` | CCO FR - Record Highlights | Custom highlights panel with round image, key fields and action buttons, working on 8 standard objects. | Transverse | RecordPage | Account / Contact / Opportunity / Case / Lead / Order / Contract | `SE_FR_ImageFileController` + `SE_FR_RecordHighlightsController` |
| `seFrRelatedRecordCard` | CCO FR - Related Record Card | Vertical sidebar card showing the counterpart record (Contact / Account) with key fields and avatar. | Transverse | RecordPage | Account / Contact / Case / Opportunity / Order | `SE_FR_ImageFileController` + `SE_FR_RelatedRecordCardController` |
| `seFrRevenueDashboard` | CCO FR - Revenue Dashboard | 3-year revenue mini-dashboard with KPI tiles and a side-by-side monthly bar chart. | Dashboards & KPIs | RecordPage | Account | — |
| `seFrServiceContracts` | CCO FR - Service Contracts | Active service contracts per Account with deadline countdown, trade badge, SLA and open work order counter. | Service | RecordPage | Account / Case / Contact / Opportunity / WorkOrder | `SE_FR_ServiceContractsController` |
| `seFrSmartRecommendations` | CCO FR - Smart Recommendations | Context-aware Next Best Action panel with 1-6 recommendations, relevance score and per-card overrides. | Productivity | RecordPage | Account / Contact / Case / Order / Opportunity / Lead | — |
| `seFrSplashBanner` | CCO FR - Splash Banner | Welcome banner with 8 animated background styles (waves, aurora, mesh, orbs, conic, geometric, constellation, grid) in pure CSS / SVG. | Transverse | AppPage / HomePage / RecordPage | — | — |
| `seFrSubscribersList` | CCO FR - Subscribers List | Live account team panel with profile photos, roles and record navigation. | Service | AppPage / HomePage / RecordPage | — | `SE_FR_SubscribersListController` |
| `seFrTelesalesRepHome` | CCO FR - Telesales - Rep Home | Telesales rep home page with KPIs, live cases and orders tables, calls to make and 3 mini charts. | Dashboards & KPIs | AppPage / HomePage | — | `SE_FR_TelesalesController` |
| `seFrTerritoryMap` | CCO FR - Territory Map | Interactive territory map with geocoded Accounts, pipeline color coding, sidebar filters and CSV export. | Geo & Field | AppPage / HomePage | — | `SE_FR_TerritoryMapController` |
| `seFrTimelinePhases` | CCO FR - Timeline Phases | Horizontal multi-phase timeline with date axis, 'Today' marker and done / pending state per phase. | Productivity | AppPage / HomePage / RecordPage | — | — |
| `seFrVisitCheckIn` | CCO FR - Visit Check-In | Check-in / Check-out terrain en un clic sur la visite, avec chrono et récapitulatif de durée. | Retail Execution | RecordPage | Visit__c | `Visit__c` |
| `seFrVisitKanban` | CCO FR - Visit Kanban | Kanban des visites du compte - glisser-deposer pour faire avancer une visite de Planifiee a Terminee. | Retail Execution | RecordPage | Account | `SE_FR_VisitKanbanController` + `seFrFlowModal` + `Visit__c` |
| `seFrVisitPlan` | CCO FR - Visit Plan | Checklist "Plan d'action" sur une visite terrain — démarre, séquence, clôture. | Retail Execution | RecordPage | Visit__c | `Visit__c` |
| `seFrVisitProductCheck` | CCO FR - Visit Product Check | Relevé produits terrain depuis le Standard Pricebook — Présent / Rupture / prix constaté par produit. | Retail Execution | RecordPage | Visit__c | `SE_FR_ProductCheckController` + `Visit__c` |
| `seFrVisitQuickOrder` | CCO FR - Commande rapide (catalogue visuel) | Visual product catalogue with contextual recommendations (out-of-stock, missing products, low shelf share) and a cart with line + global discount. | Retail Execution | AppPage / RecordPage | Visit__c / Account | `Visit__c` |
| `seFrVisitRestockOrder` | CCO FR - Réassort auto (ruptures relevé) | Turns out-of-stock products found during the shelf survey into a Draft restock Order in one click. | Retail Execution | RecordPage | Visit__c / Account | `SE_FR_VisitRestockOrderController` + `Visit__c` |
| `seFrVisitShelfCompliance` | CCO FR - Visit Shelf Compliance | Photos de linéaire sur une visite, galerie et analyse Agentforce (mock en repli). | Retail Execution | RecordPage | Visit__c | `SE_FR_ShelfComplianceController` + `Visit__c` |
| `seFrVisitShelfSpace` | CCO FR - Visit Shelf Space | Relevé linéaire manuel — part de linéaire (PDL) marque vs concurrence par catégorie et segment, avec historique. | Retail Execution | RecordPage | Visit__c | `Visit__c` |
| `seFrVisitSummaryAI` | CCO FR - Resume de Visite IA | Résumé IA (Agentforce / Einstein) d'une visite terrain — synthèse, points clés et actions recommandées. | Retail Execution | AppPage / HomePage / RecordPage | Visit__c / Account | `SE_FR_VisitSummaryController` + `Visit__c` |
| `seFrVoiceNoteTaker` | CCO FR - Voice Note Taker | Dictate a voice note via the Web Speech API and save it as a completed Task linked to the current record. | Geo & Field | RecordPage | Account / Contact / Lead / Opportunity / Visit__c | `SE_FR_VoiceNoteController` + `Visit__c` |
<!-- MANIFEST:end catalog -->

Shared Apex in `_shared_apex/classes/`: `SE_FR_AgendaController`, `SE_FR_ImageFileController`, `SE_FR_NearbyAccountsController`, `SE_FR_VoiceNoteController`. These are not tied to any single component — deploy them once per org if you build further components on top. `SE_FR_ImageFileController` powers the "click to upload image" pattern (Record Highlights, Contact Card, Related Record Card).

## Folder layout

```
SE_FR_Library/
  README.md                         ← this file
  _zips/                            ← ready-to-share zips, one per LWC
    seFrAccountHealth.zip
    seFrAccountStrategyPlan.zip
    … (one per LWC)
  _shared_apex/                     ← reusable Apex not tied to a specific component
    classes/                        ← .cls + .cls-meta.xml
    README.md
  seFrAccountHealth/                ← working folder (editable source)
    README.md                       ← component-level docs + property table
    lwc/seFrAccountHealth/…         ← JS / HTML / CSS / meta.xml
    (classes/ present when the component uses Apex)
  … (more component folders)
```

- The **working folders** are the source of truth — edit files there.
- The **`_zips/`** folder mirrors the SFDX `unpackaged/lwc/<name>/` layout so the existing "Deploy from Zip" workflow in Setup keeps working. Regenerate it after changes with the script used in the implementation log.

## How to install a single component

Each component folder contains its own `README.md`. The matching LWC zip lives in `_zips/<componentName>.zip`. For components that need Apex, deploy Apex first.

1. **Deploy Apex (if any):**
   - Go to Setup → Custom Code → Apex Classes → *New*.
   - Paste the content of each `.cls` file. The `.cls-meta.xml` sibling is only used for source-backed deploys.
   - Alternative: `sf project deploy start -d <component>/classes`.
2. **Deploy the LWC:**
   - Setup → Developer Console → *File > Open > Lightning Component Bundle* — or unzip `<component>.zip` and upload via VS Code / SF CLI.
   - The zip mirrors the SFDX `unpackaged/lwc/<name>/` layout, so `sf project deploy start -d unpackaged` also works.
3. **Drop on a page:**
   - Setup → Lightning App Builder → edit or create a page → drag `SE_FR — <name>` from the Custom palette.
   - Configure properties in the right panel to adapt titles, KPIs, demo data, etc.

## Design principles

- **Lightning base components first.** `lightning-card`, `lightning-button`, `lightning-input`, `lightning-datatable`, `lightning-formatted-*`, etc. are translated by the platform, so we use them wherever possible.
- **Custom strings become properties.** Anything that could reasonably need to be renamed per customer is an `@api` property with an English default.
- **Demo data as JSON / CSV props.** Dashboards that ship with mock KPIs and mock rows accept those as stringified JSON or CSV so SEs can swap the dataset in App Builder.
- **Currency & locale.** Components that format numbers expose `currencyCode` (default `USD`) and `localeTag` (default `en-US`).
- **Standard fields first.** The library uses only Salesforce standard fields: `Product2.Family`, `Order.SalesChannelId`, `Order.EndDate`, `Order.Status = 'Activated'`, `Account.SDO_MAPS_Days_Since_Last_Visit__c` (SDO-standard). No mandatory custom field.
- **Schema-safe Apex.** Where an optional custom field *can* enrich the UI (e.g. `Product2.Image_URL__c`), the Apex checks `Schema.SObjectType.X.fields.getMap()` before referencing it so deploys succeed regardless.

## Known caveats

- **`seFrAgentforceHeader`** depends on a static resource named `astro_agentforce` (image of Astro). Before deploying the LWC:
  1. Setup → **Static Resources** → *New*.
  2. Name: `astro_agentforce`, Cache Control: Public.
  3. Upload a PNG of Astro (the Salesforce mascot) and save.
- **`seFrOrderSummary`** needs at least one `Order` record linked to the Case's Account (or its Contact's Account) to show data; otherwise shows the empty-state message.
- **`seFrOrderEntry`**: the `salesChannelId` property accepts an 18-char Id of a `SalesChannel` record. If left empty, `Order.SalesChannelId` is not set. SDOs usually ship with a few `SalesChannel` records — check `SELECT Id, SalesChannelName FROM SalesChannel` in Developer Console.
- **`seFrConsentManager`** default channel mapping reuses `HasOptedOutOfFax` for "WhatsApp" so the component works on a vanilla org without custom fields. For real consent storage, point `channelsCsv` at proper opt-in/opt-out fields (e.g. `Email|Email_OptIn__c|false`). The running user needs **edit** access on every field listed in `channelsCsv`.

## Version

v2.6 - 2026-05-04. Cleanup round: deprecated bundles (`seFrRetailSalesDashboard`, `seFrFieldSalesDashboard`, `seFrTelesalesDashboard`) deleted from the library and the org now that all showcase FlexiPages point at the new names. Industry relics purged from every active bundle's default content (segments, news, visit motives, action plans, SWOT bullets) — defaults are now industry-agnostic (`Category A/B/C/D`, `Brand A/B/C/D`, generic customer-signals copy). Kanban Board record-page auto-scope made more robust via explicit `recordId` setter + tracked `effectiveFilterClause` (fixes cases where the FlexiPage didn't trigger a re-wire on recordId arrival). Files Gallery: upload button moved out of the card actions slot (was misaligning the title); refresh button remains in the slot.

v2.5 - 2026-05-04. Renamed 3 bundles to reflect their actual scope and dropped one redundant bundle: `seFrAccountHighlights` -> `seFrRecordHighlights` (works on Account/Contact/Opportunity/Case/Lead/Order/Contract/Quote, not just Account); `seFrSalesCockpit` -> `seFrKpiLauncher` (multi-persona launcher, not a sales dashboard); `seFrHealthScore` -> `seFrAccountHealth` (+ Apex class renamed to `SE_FR_AccountHealthController`). `seFrAccountWeather` deleted - overlapped with Account Health, which is kept as the canonical signal component.

v2.4 — 2026-04-30. Renamed 3 bundles for clarity (B2B vs B2C): `seFrRetailSalesDashboard` → `seFrCustomerSalesSummary` (B2C, Contact/Account/Person Account record), `seFrFieldSalesDashboard` → `seFrFieldRepHome` (B2B, Home/App), `seFrTelesalesDashboard` → `seFrTelesalesRepHome` (B2B, Home/App — no longer on Record). Tightened targets across the library. Added B2B/B2C tags to every component description. `seFrMyEvents` refactored for a compact sidebar: auto-trim of empty hours (new `disableAutoTrim` prop), Google-calendar-style side-by-side rendering of overlapping events, compact layout for short events, default `daysAhead=2` / `maxEvents=10` / `upcoming=3`. Old bundles kept as deprecated to not break existing FlexiPages — see `FINAL_CLEANUP.md` for the checklist before publishing.
v2.3 — 2026-04-30. Polished 6 components: `seFrSmartRecommendations` (standard card title; global defaults now editable in App Builder); `seFrRevenueDashboard` (modernized KPI tiles; current-year color configurable with theme-accent default); `seFrActivityFeed` ("Show less" button); `seFrAccountHighlights` (new `recordSource` prop — `current` or `parent` — displays the linked Account when dropped on Contact/Opportunity/Case/Order/Contract/Quote/Lead, or the Parent Account on Account); `seFrAccountStrategyPlan` (full refonte — KPI snapshot + target progress bar + SWOT 2x2 grid + action plan with status pills + strategic notes, all pre-filled and SE-editable inline); `seFrAccountWeather` (full refonte — modern rounded card with weather puck, multi-signal analysis on AnnualRevenue / LastActivityDate / MAPS visits / open Cases / open Opportunities / recent Orders, colored chips, configurable CTA).
v2.2 — 2026-04-30. Split the task list out of `seFrTelesalesDashboard` into a dedicated `seFrMyTasks` sidebar component (fixes the always-disabled completion checkbox) and added `seFrMyEvents`, a Today-timeline calendar view for a sidebar column (live now-line, in-N-min badge, color by `Event.Type`, Join button for Zoom / Teams / Meet / WebEx URLs). Both share a new `SE_FR_AgendaController` in `_shared_apex/` that replaces `SE_FR_TelesalesController`.
v2.1 — 2026-04-29. Added `seFrActiveSegments` (segment badges, CSV-driven), `seFrRetailSalesDashboard` (3 KPIs + 3 bar-chart columns for category / brand / store), and `seFrConsentManager` (per-channel GDPR toggles, CSV-driven — defaults map Email/Phone/WhatsApp onto Contact standard opt-out fields so no custom field is required). All genericized from Krys demo components.
v2 — 2026-04-25. Standardized on Salesforce standard fields (`Family`, `SalesChannelId`, `EndDate`, Order status `Activated`) and removed Entitlement Management dependency. Original demo source: Coup de Pâtes bakery demo.
v1 — 2026-04-24. Initial genericization from 11 demo LWC components.
