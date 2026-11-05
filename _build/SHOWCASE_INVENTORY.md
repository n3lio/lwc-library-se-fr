# CCO FR LWC Library - Showcase Inventory

Généré le 2026-10-21 depuis les `*.js-meta.xml` de `seFr*/lwc/seFr*/` (hors `seFrFlowModal`, interne). 37 composants LWC + bundle schema `seFrRetailExecSchema` (sans LWC).

Les defaults absents du XML sont omis (le composant applique alors son défaut JS, ex: `language` = fr). Persona/catégorie/idée = déductions.

## seFrAccountActions
- **Label** : CCO FR - Account Actions
- **Description** : Compact toolbar for a record page: one configurable primary action (launches a Flow) + optional one-click Einstein AI summary rendered as markdown. Original port from DBI retail-execution demo (dimAccountActions).
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact, Opportunity, Case, Lead)
- **Props** :
  - `language` (String, default `fr`) : 'fr' (default) or 'en'. Controls every visible label.
  - `cardTitle` (String) : Leave empty to use the dictionary default ('Quick actions').
  - `accentColor` (String) : Optional CSS color for the icon badge + primary button. Example: '#003DA5'. Leave empty for neutral theme.
  - `disablePrimaryAction` (Boolean, default `false`) : Turn ON to hide the primary action button entirely (keep only the AI summary).
  - `primaryActionLabel` (String) : Leave empty for dictionary default ('Start visit' / 'Démarrer une visite').
  - `primaryActionIcon` (String, default `utility:routing_offline`) : Example: 'utility:routing_offline' for a field visit, 'utility:new' for a quick create.
  - `primaryActionFlowApiName` (String, default `CCO_FR_Start_Visit`) : Developer name of the Screen Flow launched when the button is clicked. The current record Id is passed as '...
  - `disableAiSummary` (Boolean, default `false`) : Off by default — the AI summary button is shown. Turn ON to hide it.
  - `aiSummaryLabel` (String) : Leave empty for dictionary default ('AI summary' / 'Résumé IA').
  - `promptTemplateApiName` (String, default `einstein_gpt__summarizeAccountDefault`) : Developer name of the Einstein Prompt Template. Default: SDO-shipped Account summary.
  - `promptInputApiName` (String, default `Input:Account`) : Typically 'Input:Account'. Change to 'Input:Contact', 'Input:Opportunity' etc. depending on the host record...
  - `autoRunOnLoad` (Boolean, default `false`) : When ON (and AI summary enabled), the prompt fires as soon as the component mounts — no click needed.
- **Persona** : Sales / FieldSales
- **Catégorie** : Actions rapides + Lancement Flow + Résumé IA
- **Idée showcase** : Header de la page Account "CCO FR - Account 360" pour démarrer une visite (Flow CCO_FR_Start_Visit) et lancer le résumé IA

## seFrAccountHealth
- **Label** : CCO FR - Account Health
- **Description** : B2B - Quantitative account-health gauge (0-100) with a SVG donut, verdict level (Excellent / Healthy / Watch / At risk / Critical) and the list of weighted signals used in the computation.
- **Exposed** : true
- **Targets** : RecordPage (Account)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'.
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:goals`)
  - `revenueThreshold` (Integer, default `500000`) : AnnualRevenue below this counts as a negative signal.
  - `inactivityThresholdDays` (Integer, default `45`)
  - `staleVisitThresholdDays` (Integer, default `60`) : Uses Account.SDO_MAPS_Days_Since_Last_Visit__c - skipped if the field is absent.
- **Persona** : Sales / Manager
- **Catégorie** : Dashboard KPI / Santé compte
- **Idée showcase** : Colonne latérale Account 360 : jauge de santé en tête de page pour qualifier le risque

## seFrAccountStrategyPlan
- **Label** : CCO FR - Account Strategy Plan
- **Description** : B2B - Narrative Account plan: KPIs, target progress, SWOT 2x2, action plan, strategic notes. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Account)
- **Props** :
  - (23 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls card title, section headings, SWOT labels, status pills (Not started / En...
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:goals`)
  - `currencyCode` (String, default `EUR`)
  - `localeTag` (String, default `fr-FR`)
  - `kpiPreviousYearLabel` (String)
  - `kpiPreviousYearValue` (Integer, default `33800`)
  - `kpiRunRateLabel` (String)
  - `kpiRunRateValue` (Integer, default `3200`)
  - `kpiPotentialLabel` (String)
  - `kpiPotentialValue` (Integer, default `75000`)
  - `kpiShareLabel` (String)
  - autres : `kpiShareValue`, `annualTargetLabel`, `annualTargetDefault`, `ytdRevenueLabel`, `ytdRevenueDefault`, `strengthsCsv`, `weaknessesCsv`, `opportunitiesCsv`, `threatsCsv`, `actionPlanCsv`, `strategyNotesDefault`
- **Persona** : Sales / Manager
- **Catégorie** : Plan de compte narratif (SWOT/KPI)
- **Idée showcase** : Onglet "Stratégie" de la page Account 360 pour les key accounts

## seFrActiveSegments
- **Label** : CCO FR - Active Segments
- **Description** : B2B / B2C - Configurable list of Data Cloud / marketing segments, rendered as badges. The card title auto-appends the segment count.
- **Exposed** : true
- **Targets** : RecordPage, AppPage, HomePage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - `language` (String, default `fr`) : Two-letter code - 'en' (default) or 'fr'. Controls the default card title and default segment list. Explici...
  - `cardTitle` (String) : Leave empty to use the dictionary default (‘Active Segments’ / ‘Segments actifs’). Shown as '<title> (N)'.
  - `cardIcon` (String, default `standard:groups`)
  - `segmentsCsv` (String) : Leave empty for the language-appropriate default list. Each item becomes a badge.
  - `colorMode` (String, default `random`) : 'random' (default) = each tag gets a soft pastel from a curated palette. 'custom' = use the customColorsCsv...
  - `customColorsCsv` (String) : Comma-separated hex colors, one per segment. Shorter lists cycle. Ignored unless colorMode = custom.
  - `singleColor` (String, default `#ecebea`) : Applied to every tag when colorMode = single. Defaults to the SLDS-style light grey.
- **Persona** : Marketing / Sales
- **Catégorie** : Marketing engagement / Segments
- **Idée showcase** : Badges de segments Data Cloud sous le highlights sur Account/Contact/Lead ; aussi en Home marketing

## seFrActivityFeed
- **Label** : CCO FR - Activity Feed
- **Description** : Aggregated activity timeline showing Tasks, Events, Emails, SMS/Web, calls, messaging sessions, chats, Orders, Cases, Opportunities, Quotes, Contracts, Visits, Files, Chatter posts and Survey responses for an Account or Contact.
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls card title, filter panel, type/date labels, empty state, action buttons an...
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:activations`)
  - `excludeRelatedContacts` (Boolean, default `false`) : Default: unchecked (related contacts included). Check to scope strictly to the current record.
  - `defaultDaysBack` (Integer, default `365`)
  - `defaultDaysForward` (Integer, default `90`)
  - `sortOldestFirst` (Boolean, default `false`) : Default: unchecked (newest first).
  - `expandedByDefault` (Boolean, default `false`)
  - `enabledActionsCsv` (String, default `LogACall,Email,NewTask,NewEvent,NewVisit`) : Standard quick-action API names triggered from the toolbar. Adjust to match actions available on the object...
  - `initialLimit` (Integer, default `10`) : Max total items shown (upcoming + past combined) before the 'Show more' button appears.
  - `defaultEnabledTypesCsv` (String) : Comma-separated list of type keys enabled by default. Empty = all. Keys: Task, Event, Email, EmailMessage,...
- **Persona** : Sales / Service / FieldSales
- **Catégorie** : Agenda/activités - Timeline 360
- **Idée showcase** : Onglet "Activité" Account/Contact : tout l'historique (tasks, mails, cases, orders)

## seFrAgentforceHeader
- **Label** : CCO FR - Agentforce Header
- **Description** : Home page greeting banner with Astro mascot, a voice-dictation field and a send button. {name} is replaced with the running user's first name. Bilingual FR / EN.
- **Exposed** : true
- **Targets** : HomePage
- **Props** :
  - `language` (String, default `fr`) : 'fr' (default) or 'en'. Controls the default greeting, placeholders and speech locale.
  - `greetingTemplate` (String) : Use {name} to inject the running user's first name. Wrap any word with double asterisks for the highlighted...
  - `highlightColor` (String, default `#0176d3`) : Applied to the **bold** segment of the greeting. Defaults to the CCO FR brand blue.
  - `idlePlaceholder` (String) : Leave empty to use the language default ('Posez-moi une question…' / 'Ask me a question…').
  - `listeningPlaceholder` (String)
  - `speechLocale` (String) : BCP 47 tag (e.g. fr-FR, en-US). Leave empty to use the language default.
- **Persona** : All
- **Catégorie** : Accueil / Assistant IA (greeting + dictée)
- **Idée showcase** : Bandeau d'ouverture de toutes les Home pages persona

## seFrAlertsRibbon
- **Label** : CCO FR - Alerts Ribbon
- **Description** : Configurable alerts ribbon. Two sources: rule-driven alerts evaluated against the current record (Record Page), and static alerts always shown (Home / App Page friendly). 4 severities, 3 visual variants, 2 densities, optional sticky-on-scroll behavior.
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact, Case, Opportunity, Lead, Order, Contract) ; HomePage, AppPage
- **Props** :
  - __Config [RecordPage]__ (11 props)
    - `language` (String, default `fr`) : 'fr' (default) or 'en'.
    - `rulesCsv` (String) : Format: '<field><op><value>|<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>'. Ops: = != > < >= <= contains...
    - `staticAlertsCsv` (String) : Always shown. Format: '<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>'.
    - `visualStyle` (String, default `inline`) : 'inline' (default) renders alerts directly above the page content. 'card' wraps them in a lightning-card ch...
    - `alertVariant` (String, default `banner`) : 'banner' (soft pastel + accent border-left), 'solid' (saturated background), 'minimal' (white background, a...
    - `density` (String, default `comfortable`) : 'comfortable' allows wrap. 'compact' truncates the message with ellipsis.
    - `cardTitle` (String) : Used only when visualStyle = card. Leave empty for the dictionary default.
    - `cardIcon` (String, default `standard:announcement`) : SLDS icon name. Used only when visualStyle = card.
    - `hideDismissButton` (Boolean, default `false`)
    - `maxAlerts` (Integer, default `0`)
    - `stickyOnScroll` (Boolean, default `false`) : When ON, the ribbon stays pinned to the top of the page on scroll.
  - __Config [HomePage, AppPage]__ (10 props)
    - `language` (String, default `fr`)
    - `staticAlertsCsv` (String) : Format: '<severity>|<icon>|<message>|<ctaLabel>|<ctaUrl>'.
    - `visualStyle` (String, default `inline`)
    - `alertVariant` (String, default `banner`)
    - `density` (String, default `comfortable`)
    - `cardTitle` (String)
    - `cardIcon` (String, default `standard:announcement`)
    - `hideDismissButton` (Boolean, default `false`)
    - `maxAlerts` (Integer, default `0`)
    - `stickyOnScroll` (Boolean, default `false`)
- **Persona** : All
- **Catégorie** : Alertes contextuelles
- **Idée showcase** : Ruban d'alertes (crédit bloqué, SLA, contrat expirant) sous le header de Account/Case/Opportunity ; ruban d'annonces en Home

## seFrConsentManager
- **Label** : CCO FR - Consent Manager
- **Description** : B2B / B2C - GDPR / contact-preferences toggle panel. Reads/writes opt-in/opt-out fields on the record. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Contact, Lead, Account)
- **Props** :
  - `language` (String, default `fr`) : 'en' or 'fr'. Controls card title, toggle labels, toast messages, and default channel labels (E-mail / Télé...
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:task2`)
  - `channelsCsv` (String) : One channel per item. Format: label|fieldApiName|inverted. Inverted=true when the field stores opt-OUT. Lea...
  - `toggleActiveLabel` (String)
  - `toggleInactiveLabel` (String)
  - `successMessage` (String)
  - `errorMessage` (String)
- **Persona** : Marketing / Sales
- **Catégorie** : Marketing engagement / Consentement RGPD
- **Idée showcase** : Panneau consentements sur Contact/Lead dans une story "Marketing & RGPD"

## seFrContactCard
- **Label** : CCO FR - Contact Card
- **Description** : B2B / B2C - Visual Contact card (avatar, details, up to 3 gauges) with animated waves + optional Einstein prompt summary. Original author: Charly Ansel.
- **Exposed** : true
- **Targets** : RecordPage (Contact, Account, Case, Opportunity, Order, Lead)
- **Props** :
  - (36 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'fr' (default) or 'en'. Controls every visible label.
  - `cardTitle` (String) : Leave empty to use the dictionary default ('Contact').
  - `hideHeaderOnContact` (Boolean, default `false`) : Off by default. Turn ON to remove the card title + icon when the component is placed on a Contact record pa...
  - `imageFieldApiName` (String, default `SDO_Cust360_Contact_Picture_URL__c`) : Schema-safe: skipped if absent. When the contact has a value in this URL field, it wins over any uploaded f...
  - `disableImageReplace` (Boolean, default `false`) : Off by default - clicking the avatar opens a file picker and uploads the new image as a File on the linked...
  - `imageMode` (String)
  - `showCustomerId` (Boolean, default `false`)
  - `customerIdFieldApiName` (String, default `SDO_Cust360_Id__c`) : Schema-safe: the line is skipped if the field is absent or empty.
  - `gauge1Label` (String, default `Churn risk`) : Leave empty to hide the first gauge.
  - `gauge1FieldApiName` (String, default `SDO_Cust360_ChurnRisk__c`) : Numeric Contact field (0-100). When set and the record has a numeric value, it wins over the static value b...
  - `gauge1Value` (String) : Type a number directly (0-100) to display it without needing a field. Useful for demos. Used as a fallback...
  - `gauge1Icon` (String, default `utility:warning`)
  - autres : `gauge1Direction`, `gauge2Label`, `gauge2FieldApiName`, `gauge2Value`, `gauge2Icon`, `gauge2Direction`, `gauge3Label`, `gauge3FieldApiName`, `gauge3Value`, `gauge3Icon`, `gauge3Direction`, `hideWaves`, `showWaves`, `isDarkBackground`, `backgroundColor`, `backgroundImageUrl`, `waveColorOne`, `waveColorTwo`, `disablePromptSummary`, `enablePromptSummary`, `promptButtonLabel`, `promptTemplateApiName`, `promptInputApiName`, `autoPromptOnLoad`
- **Persona** : Sales / Service
- **Catégorie** : Fiche contact visuelle + Résumé IA
- **Idée showcase** : Carte contact en sidebar sur Case/Opportunity/Order pour donner un visage au client

## seFrContactsCarousel
- **Label** : CCO FR - Contacts Carousel
- **Description** : B2B - Visual carousel of the Contacts linked to an Account. Photo (or initials fallback), title, optional role badge and quick Email/Call actions. Arrows to navigate when there are more than the visible count.
- **Exposed** : true
- **Targets** : RecordPage (Account)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'.
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:contact`)
  - `limitCount` (Integer, default `24`) : Server-side LIMIT (1-100).
  - `orderBy` (String, default `LastActivityDate DESC NULLS LAST`) : Whitelisted: LastActivityDate DESC NULLS LAST | Name ASC | CreatedDate DESC | Title ASC NULLS LAST.
  - `visibleCount` (Integer, default `4`) : Number of cards shown per page in the carousel. Arrows paginate by this amount.
  - `badgesCsv` (String) : Per-contact badge overlay. Format: 'Name=Label|#hex,...'. Match is case-insensitive on Contact.Name.
  - `hideNewContactButton` (Boolean, default `false`)
- **Persona** : Sales / FieldSales
- **Catégorie** : Relations / Contacts clés
- **Idée showcase** : Carrousel de décideurs sur Account 360

## seFrCustomerOrders
- **Label** : CCO FR - Customer Orders
- **Description** : B2B / B2C - Lists the orders linked to an Account or Contact. Top block shows the latest order with its line items; bottom block is a compact history with search / sort / status filter / View all. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls every built-in string (headers, buttons, sort labels, empty states).
  - `cardTitle` (String) : Leave empty for the dictionary default ('Orders' / 'Commandes').
  - `cardIcon` (String, default `standard:orders`)
  - `historyLimit` (Integer, default `10`) : Server-side LIMIT (1-50).
  - `currencyCode` (String, default `EUR`)
  - `localeTag` (String, default `fr-FR`)
  - `statusFilter` (String) : Comma-separated list of Order.Status values. When set, only orders matching these statuses are shown, and a...
  - `defaultSort` (String, default `EffectiveDate DESC`) : One of: EffectiveDate DESC | EffectiveDate ASC | TotalAmount DESC | TotalAmount ASC | OrderNumber ASC | Ord...
  - `productImageFieldApiName` (String, default `Image_URL__c`) : Field on Product2 holding the image URL. Schema-safe - skipped if absent.
  - `productImageFallbackUrl` (String) : Used when the product image field is empty or absent.
  - `hideNewOrderButton` (Boolean, default `false`)
  - `hideViewAllLink` (Boolean, default `false`)
- **Persona** : Telesales / Service / Sales
- **Catégorie** : Commandes / Historique client
- **Idée showcase** : Bloc commandes sur Account/Contact pour le télévendeur et le SAV

## seFrCustomerSalesSummary
- **Label** : CCO FR - Customer Sales Summary
- **Description** : B2C - Customer-level sales summary for a Contact / Person Account / Account record page. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Contact, Account)
- **Props** :
  - (19 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'en' or 'fr'. Controls the default card title, KPI labels, column titles, the stores suffix and the default...
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:performance`)
  - `kpi1Label` (String)
  - `kpi1Value` (String) : Leave empty for the language default ('38 550 €' / '$38,550').
  - `kpi2Label` (String)
  - `kpi2Value` (String) : Leave empty for the language default ('285 €' / '$285').
  - `kpi3Label` (String)
  - `kpi3Value` (String) : Leave empty for the language default ('18').
  - `categoriesTitle` (String)
  - `categoriesIcon` (String, default `standard:product`)
  - `categoriesCsv` (String)
  - autres : `brandsTitle`, `brandsIcon`, `brandsCsv`, `storesTitle`, `storesIcon`, `storesCsv`, `storeVisitsSuffix`
- **Persona** : Retail / Sales / Marketing
- **Catégorie** : Dashboard KPI client (B2C)
- **Idée showcase** : Résumé ventes client sur Contact/Person Account : story retail / clienteling

## seFrEngagementHistory
- **Label** : CCO FR - Engagement History
- **Description** : Marketing and Data - Configurable marketing engagement timeline (Email, SMS, Form, Page View) with live search and typed colored icons. Mock data mode - no Apex, no SOQL. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Lead, Contact, Account) ; AppPage, HomePage
- **Props** :
  - __Config [RecordPage]__ (9 props)
    - `language` (String, default `fr`) : 'fr' (default) or 'en'. Controls card title, search placeholder, event type labels and empty state text.
    - `cardTitle` (String) : Leave empty for the language dictionary default.
    - `cardIcon` (String, default `standard:activations`)
    - `showSearch` (Boolean, default `true`)
    - `searchPlaceholder` (String)
    - `eventTypes` (String, default `Email ouvert|SMS envoye|Formulaire|Email clique|Page vue|Email rejete|Email envoye|SMS clique`) : FR: Email ouvert, Email envoye, Email clique, Email rejete, SMS envoye, SMS clique, Formulaire, Page vue. E...
    - `eventEmails` (String, default `promo-ete@acme.fr|alerte-rdv@acme.fr|inscription-event@acme.fr|bienvenue@acme.fr|page-tarifs@acme.fr|offre-speciale@acme.fr|relance-panier@acme.fr|offre-flash@acme.fr`)
    - `eventLists` (String, default `Campagne Ete 2026|SMS Relance Auto|Webinaire Produit Q2|Nurturing Web|Acquisition SEO|Offre Flash Juin|Campagne Rentree|Promo Weekend`)
    - `eventAges` (String, default `2 j.|4 j.|1 sem.|1 sem. 3 j.|2 sem.|3 sem.|1 mois|1 mois 5 j.`)
  - AppPage, HomePage : mêmes props que ci-dessus
- **Persona** : Marketing
- **Catégorie** : Marketing engagement - Timeline
- **Idée showcase** : Timeline email/SMS/form/page view sur Lead/Contact ; version AppPage "Marketing cockpit"

## seFrFieldRepHome
- **Label** : CCO FR - Field Sales - Rep Home
- **Description** : B2B - Home / App page for a field sales rep. Greeting, 4 KPI tiles, priority accounts (dynamic, filter-configurable), hot leads, product-penetration bars and campaign calendar. Bilingual EN / FR via the language property.
- **Exposed** : true
- **Targets** : HomePage, AppPage
- **Props** :
  - (31 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : Two-letter code - 'en' (default) or 'fr'. Every label below without an explicit value falls back to the lan...
  - `greetingTemplate` (String) : Leave empty for the dictionary default. Use {name} placeholder. Wrap any word with **…** to render it in th...
  - `defaultUserName` (String) : Leave empty for dictionary default ('Rep' / 'Commercial').
  - `highlightColor` (String, default `#0176d3`) : Applied to **bold** segments of the greeting. Defaults to the CCO FR brand blue.
  - `accountRecordType` (String, default `SDO_Account_Simple`) : Leave empty for all record types. SDO default: 'SDO_Account_Simple' (B2B).
  - `accountOwnerScope` (String, default `mine`) : 'mine' | 'all'
  - `accountOrderBy` (String, default `Name`) : Name | LastActivityDate DESC NULLS LAST | AnnualRevenue DESC NULLS LAST | CreatedDate DESC
  - `accountLimit` (Integer, default `6`)
  - `leadRating` (String, default `Hot`) : 'Hot' | 'Warm' | 'Cool' | 'Any'
  - `leadOwnerScope` (String, default `mine`) : 'mine' | 'all'
  - `leadLimit` (Integer, default `6`)
  - `kpi1Label` (String)
  - autres : `kpi1Value`, `kpi1Footer`, `kpi1FooterClass`, `kpi2Label`, `kpi2Value`, `kpi2Footer`, `kpi2FooterClass`, `kpi3Label`, `kpi3Value`, `kpi3Footer`, `kpi3FooterClass`, `kpi4Label`, `kpi4Value`, `kpi4Footer`, `kpi4FooterClass`, `visitMotivesCsv`, `penetrationRowsCsv`, `penetrationTip`, `eventsCsv`
- **Persona** : FieldSales
- **Catégorie** : Home persona - Terrain
- **Idée showcase** : Home "CCO FR - Field Sales Home" : page complète du commercial terrain

## seFrFilesGallery
- **Label** : CCO FR - Files Gallery
- **Description** : B2B / B2C - Visual gallery of files linked to the current record. Image thumbnails via the rendition endpoint, doctype icons for other types, click to open preview, Download link and drag-drop upload.
- **Exposed** : true
- **Targets** : RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - `language` (String, default `fr`)
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:file`)
  - `limitCount` (Integer, default `20`) : Server-side LIMIT (1-100).
  - `visibleCount` (Integer, default `4`) : Number of tiles shown on one row. Chevrons in the header page through the rest.
  - `hideUploadButton` (Boolean, default `false`)
  - `hideDeleteButton` (Boolean, default `false`) : Off by default - each tile shows a delete icon on hover. The user must have delete permission on the file.
- **Persona** : All
- **Catégorie** : Documents / Galerie fichiers
- **Idée showcase** : Galerie photos (vitrine, linéaire) sur Account/Visit__c ; docs sur Case

## seFrKanbanBoard
- **Label** : CCO FR - Kanban Board
- **Description** : Generic kanban board. Any SObject + group-by picklist + display field. Optional drag & drop that updates the group-by field on the record. Whitelisted objects: Case, Opportunity, Lead, Order, Task, Account.
- **Exposed** : true
- **Targets** : HomePage, AppPage ; RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - __Config [HomePage, AppPage]__ (15 props)
    - `language` (String, default `fr`)
    - `cardTitle` (String)
    - `cardIcon` (String, default `standard:kanban`)
    - `sobjectApiName` (String, default `Case`) : Whitelisted: Case | Opportunity | Lead | Order | Task | Account. On a Record Page this drives which object'...
    - `objectApiName` (String) : Legacy alias - use 'SObject to query' above. Kept to avoid breaking existing FlexiPages.
    - `groupByField` (String, default `Status`) : Picklist field used to form the columns.
    - `displayField` (String, default `Subject`) : Field shown as the card title.
    - `secondaryField` (String, default `Priority`)
    - `amountField` (String) : Currency / decimal field summed per column, e.g. 'Amount' on Opportunity.
    - `filterClause` (String, default `IsClosed = false`) : Raw SOQL fragment. Leave empty for no filter. Be cautious - injected as-is.
    - `limitCount` (Integer, default `100`) : Server-side LIMIT (1-500).
    - `maxPerColumn` (Integer, default `6`) : Beyond this cap, a 'Show all (N)' link unfolds the column.
    - `disableDragDrop` (Boolean, default `false`) : Off by default - cards are draggable between columns; dropping updates the group-by field.
    - `currencyCode` (String, default `EUR`)
    - `localeTag` (String, default `fr-FR`)
  - __Config [RecordPage]__ (16 props)
    - (16 props, synthèse : les 12 premières détaillées, reste = noms seuls)
    - `language` (String, default `fr`)
    - `cardTitle` (String)
    - `cardIcon` (String, default `standard:kanban`)
    - `sobjectApiName` (String, default `Case`) : Whitelisted: Case | Opportunity | Lead | Order | Task | Account. On a Record Page this drives which object'...
    - `objectApiName` (String) : Legacy alias - use 'SObject to query' above. Kept to avoid breaking existing FlexiPages.
    - `groupByField` (String, default `Status`) : Picklist field used to form the columns.
    - `displayField` (String, default `Subject`) : Field shown as the card title.
    - `secondaryField` (String, default `Priority`)
    - `amountField` (String) : Currency / decimal field summed per column, e.g. 'Amount' on Opportunity.
    - `filterClause` (String, default `IsClosed = false`) : Raw SOQL fragment. Leave empty for no filter. Be cautious - injected as-is.
    - `recordScopeField` (String, default `AccountId`) : Lookup field on the queried object pointing at the current Record Id. Examples: 'AccountId' for Case / Oppo...
    - `limitCount` (Integer, default `100`) : Server-side LIMIT (1-500).
    - autres : `maxPerColumn`, `disableDragDrop`, `currencyCode`, `localeTag`
- **Persona** : Sales / Telesales / Service / Manager
- **Catégorie** : Pipeline / Kanban générique
- **Idée showcase** : Kanban Opportunity en AppPage "Pipeline" ; Kanban Case en AppPage Service

## seFrKpiLauncher
- **Label** : CCO FR - KPI Launcher
- **Description** : B2B / B2C - Configurable grid of 3 to 6 clickable KPI tiles. Pick a preset (Standard / Field Sales / Telesales / Custom) or override any tile individually. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : HomePage, AppPage, RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - (40 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'fr' (default) or 'en'.
  - `preset` (String, default `Standard`) : Seeds tiles 1-3 with a pre-configured set. Standard = Leads / Opportunities / Accounts. FieldSales = Route...
  - `cardTitle` (String) : Leave empty for the default (‘Cockpit’). The grid is wrapped in a lightning-card when a title is set.
  - `cardIcon` (String, default `standard:metrics`)
  - `kpi1Label` (String) : Leave empty to use the preset value.
  - `kpi1Value` (String)
  - `kpi1Sublabel` (String)
  - `kpi1Icon` (String)
  - `kpi1Color` (String)
  - `kpi1Link` (String)
  - `kpi2Label` (String)
  - `kpi2Value` (String)
  - autres : `kpi2Sublabel`, `kpi2Icon`, `kpi2Color`, `kpi2Link`, `kpi3Label`, `kpi3Value`, `kpi3Sublabel`, `kpi3Icon`, `kpi3Color`, `kpi3Link`, `kpi4Label`, `kpi4Value`, `kpi4Sublabel`, `kpi4Icon`, `kpi4Color`, `kpi4Link`, `kpi5Label`, `kpi5Value`, `kpi5Sublabel`, `kpi5Icon`, `kpi5Color`, `kpi5Link`, `kpi6Label`, `kpi6Value`, `kpi6Sublabel`, `kpi6Icon`, `kpi6Color`, `kpi6Link`
- **Persona** : All
- **Catégorie** : Dashboard KPI / Navigation
- **Idée showcase** : Grille de KPI cliquables en haut des Home (presets Field Sales / Telesales)

## seFrMetricTile
- **Label** : CCO FR - Metric Tile
- **Description** : B2B / B2C - Single KPI tile with inline trend chart. 4 chart styles (line, area, bar, mini-donut), optional comparison series, target line, currency formatting. Bilingual FR / EN.
- **Exposed** : true
- **Targets** : HomePage, AppPage, RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - (25 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'fr' (default) or 'en'.
  - `cardTitle` (String) : Leave empty to use the dictionary default ('Indicateur' / 'Metric').
  - `cardIcon` (String, default `standard:metrics`)
  - `hideCardTitle` (Boolean, default `false`) : Off by default - the tile is wrapped in a lightning-card with a title. Turn on to render the bare tile (no...
  - `metricLabel` (String) : Leave empty for the language default ('CA (12 mois)' / 'Revenue (12 mo.)').
  - `currentValueDisplay` (String) : Large value shown at the top of the tile. Wins over the numeric currentValue when set. Leave empty for the...
  - `currentValue` (String) : Numeric value used to auto-format the headline via Intl.NumberFormat (compact currency). Ignored when 'Head...
  - `currencyCode` (String, default `EUR`) : Used by the numeric formatter. ISO 4217 code (EUR, USD, GBP...).
  - `chartStyle` (String, default `line`) : 'line' (curve only), 'area' (curve + filled area below), 'bar' (vertical bars), 'mini-donut' (radial gauge...
  - `seriesJson` (String) : Array of numbers. 12 points = one per month. Leave empty for a sample up-trend curve. Ignored by 'mini-donu...
  - `secondarySeriesJson` (String) : Optional comparison series (e.g. forecast, target run-rate). Drawn as a dashed line. Ignored by 'mini-donut...
  - `secondarySeriesColor` (String, default `#747474`)
  - autres : `targetValue`, `targetLineColor`, `showTargetLabel`, `scalingMode`, `yMin`, `yMax`, `accentColor`, `donutTrack`, `height`, `width`, `trendDisplay`, `enableTooltip`, `trendPositive`
- **Persona** : All / Manager
- **Catégorie** : Dashboard KPI / Tendance
- **Idée showcase** : Tuile CA + tendance en Home Manager ou RecordPage Account

## seFrMyEvents
- **Label** : CCO FR - My Events
- **Description** : B2B / B2C - Today-timeline view of events for a sidebar column. Auto-trims empty hours, handles overlapping events side-by-side, live now-line, in-N-min badge, Join button for common web-meeting URLs, and a short Upcoming list.
- **Exposed** : true
- **Targets** : HomePage, AppPage, RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - (16 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : Two-letter code - 'en' (default) or 'fr'. Controls all built-in UI strings (headings, buttons, badges). Exp...
  - `cardTitle` (String) : Leave empty to use the dictionary default (‘My Day’ / ‘Ma journée’).
  - `cardIcon` (String, default `standard:event`)
  - `startHour` (Integer, default `8`) : Earliest hour shown when auto-trim is off or when auto-trim can't narrow further.
  - `endHour` (Integer, default `20`) : Latest hour shown (same rule as start hour).
  - `disableAutoTrim` (Boolean, default `false`) : Auto-trim is ON by default - the timeline is bounded to [first event − padding, last event + padding] (clam...
  - `autoTrimPaddingMin` (Integer, default `30`) : Empty-hour margin kept before the first event and after the last event when auto-trim is on. Set to 0 to cr...
  - `daysAhead` (Integer, default `2`) : Today counts as 1. Used to populate the Upcoming list.
  - `maxEvents` (Integer, default `10`)
  - `localeTag` (String, default `fr-FR`)
  - `typeColorsCsv` (String, default `Call|#0176d3,Meeting|#4bca81,Demo|#c13975,Training|#f2a900,Other|#747474`) : Matched against Event.Type (case-insensitive). 'Other' is the fallback.
  - `typesFilterCsv` (String) : Whitelist of Event.Type values to show. Leave empty to include every type. Acts as a static filter - the in...
  - autres : `hideTypeToggles`, `hideNowLine`, `hideJoinButton`, `emptyStateMessage`
- **Persona** : Sales / FieldSales
- **Catégorie** : Agenda/activités - Timeline du jour
- **Idée showcase** : Colonne droite de Home Field Sales : agenda du jour / visites

## seFrMyTasks
- **Label** : CCO FR - My Tasks
- **Description** : B2B / B2C - Compact "My Tasks" panel for a sidebar column. Interactive completion checkbox, filter dropdown, auto-grouping by Overdue / Today / Tomorrow / This week / Later, optional quick actions, and "New task" shortcut.
- **Exposed** : true
- **Targets** : HomePage, AppPage, RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - `language` (String, default `fr`) : Two-letter code - 'en' (default) or 'fr'. Controls all built-in UI strings (headings, buttons, groups, filt...
  - `cardTitle` (String) : Leave empty to use the dictionary default (‘My Tasks’ / ‘Mes tâches’).
  - `cardIcon` (String, default `standard:task`)
  - `defaultFilter` (String, default `Upcoming`) : One of the values in 'Filter options' - use the English key (Today / Mine / Overdue / Upcoming / Completed)...
  - `filterOptionsCsv` (String, default `Today,Mine,Overdue,Upcoming,Completed`) : Built-in keys get translated automatically. Any other value is shown verbatim.
  - `maxTasks` (Integer, default `10`) : Server-side LIMIT (max 50).
  - `localeTag` (String, default `fr-FR`)
  - `showQuickActions` (Boolean, default `false`) : Reveals Log-a-Call / Email buttons when hovering a row.
  - `emptyStateMessage` (String) : Leave empty to use the dictionary default.
- **Persona** : All
- **Catégorie** : Agenda/activités - Tâches
- **Idée showcase** : Colonne droite de Home Telesales/Field : tâches en retard et du jour

## seFrNearbyAccountsMap
- **Label** : CCO FR - Nearby Accounts Map
- **Description** : Interactive map showing nearby accounts from a configurable origin point.
- **Exposed** : true
- **Targets** : HomePage, AppPage
- **Props** :
  - `language` (String, default `fr`) : Two-letter code - 'en' (default) or 'fr'. Controls the default card title, list subtitle, origin marker lab...
  - `cardTitle` (String) : Leave empty for dictionary default (‘Nearby Accounts’ / ‘Comptes à proximité’).
  - `listSubtitle` (String)
  - `limitCount` (Integer, default `10`)
  - `recordTypeName` (String) : Leave empty to include all record types.
  - `originMode` (String, default `auto`) : 'auto' = use the browser's geolocation (HTTPS required; user is prompted once). Falls back to the lat/lng b...
  - `originLatitude` (String, default `48.859215`) : Decimal degrees. Used when 'manual' is selected or when geolocation is denied. Defaults to central Paris (1...
  - `originLongitude` (String, default `2.379175`) : Decimal degrees.
  - `originLabel` (String) : Leave empty for dictionary default (‘My location’ / ‘Ma position’).
  - `priorityFirstMarker` (Boolean, default `false`)
  - `zoomLevel` (Integer, default `13`)
- **Persona** : FieldSales
- **Catégorie** : Carte géo - Proximité
- **Idée showcase** : AppPage "Tournée" : comptes à proximité pour enchaîner des visites

## seFrOrderEntry
- **Label** : CCO FR - Order Entry
- **Description** : (absente du meta.xml) - déduit du code : grille de prise de commande (produits, qté, remise, envoi ERP, pré-remplissage IA) sur Account/Case
- **Exposed** : true
- **Targets** : RecordPage (Account, Case)
- **Props** :
  - (19 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls every visible string (toolbar, grid headers, status filters, modal).
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:orders`)
  - `recordLimit` (Integer, default `25`)
  - `currencyCode` (String, default `EUR`)
  - `currencySymbol` (String, default `€`)
  - `localeTag` (String, default `fr-FR`)
  - `fullScreenTitleTemplate` (String)
  - `noAccountMessage` (String)
  - `erpCheckboxLabel` (String) : No longer rendered - kept to avoid breaking existing page layouts.
  - `salesChannelId` (String) : 18-char Id of a SalesChannel record. Set on Order.SalesChannelId when an order is created. Leave empty to s...
  - `productImageFieldApiName` (String, default `Image_URL__c`) : Field on Product2 holding an image URL. Schema-safe: skipped if absent.
  - autres : `productImageFallbackUrl`, `filter1`, `filter2`, `filter3`, `filter4`, `filter5`, `aiReasonsCsv`
- **Persona** : Telesales / Sales / Retail
- **Catégorie** : Prise de commande
- **Idée showcase** : Page Account/Case "Order Entry" pour prise de commande assistée par IA (télévente)

## seFrOrderSummary
- **Label** : CCO FR - Order Summary
- **Description** : (absente du meta.xml) - déduit du code : résumé de la commande liée à un Case (items, livraison, soumission ERP)
- **Exposed** : true
- **Targets** : RecordPage (Case)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls every visible string (header buttons, field labels, modals, toasts).
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:orders`)
  - `showBottomSeparator` (Boolean, default `true`)
  - `separatorLabel` (String) : Leave empty to use the language default ('OR' / 'OU').
  - `currencyCode` (String, default `EUR`)
  - `successMessage` (String)
  - `deleteConfirmMessage` (String)
  - `emptyStateMessage` (String)
  - `productImageFieldApiName` (String, default `Image_URL__c`) : Field on Product2 holding an image URL. Schema-safe: skipped if absent.
  - `productImageFallbackUrl` (String) : Used when the product field is empty or absent.
- **Persona** : Telesales / Service
- **Catégorie** : Commandes / Résumé commande liée à un Case
- **Idée showcase** : Page Case "Réclamation commande" : commande liée + soumission ERP

## seFrPipelineSnapshot
- **Label** : CCO FR - Pipeline Snapshot
- **Description** : B2B - Customer pipeline visualisation: open Opportunities grouped by Stage with per-column totals, unweighted and weighted totals at the top.
- **Exposed** : true
- **Targets** : RecordPage (Account, Opportunity)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls card title, tile labels, stage column names. Raw StageName values flow thr...
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:opportunity`)
  - `currencyCode` (String, default `EUR`)
  - `localeTag` (String, default `fr-FR`)
  - `limitCount` (Integer, default `40`) : Server-side LIMIT (1-200).
  - `includeClosed` (Boolean, default `false`) : Off by default - only open Opps are shown.
  - `hideNewOppButton` (Boolean, default `false`)
- **Persona** : Sales / Manager
- **Catégorie** : Pipeline / Dashboard KPI
- **Idée showcase** : Pipeline ouvert par stage sur Account 360 et Opportunity

## seFrPromptLauncher
- **Label** : CCO FR - Prompt Launcher
- **Description** : Configurable AI panel that runs Salesforce Prompt Templates via Invocable Actions. Drop on any page, the SE picks which prompts to expose. Auto-fills record context, prompts requiring user input show a small form. HTML responses rendered with formatting.
- **Exposed** : true
- **Targets** : AppPage, HomePage, RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - (16 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'fr' (default) or 'en'.
  - `cardTitle` (String) : Leave empty for the dictionary default ('Assistant IA' / 'AI Assistant').
  - `cardIcon` (String, default `standard:bot`)
  - `namedCredential` (String, default `Agentforce_API`) : Named Credential routing the Apex callout to the org's REST API. Default 'Agentforce_API'. Despite the lega...
  - `promptsJson` (String) : JSON array — leave empty to use the default catalogue shown as placeholder. Copy the placeholder as startin...
  - `autoRunFirstPrompt` (Boolean, default `false`) : When ON, the first applicable prompt runs automatically as soon as the page loads. Skips silently if any re...
  - `resultAccent` (String, default `blue`)
  - `maxHeight` (Integer, default `0`) : 0 (default) = no cap, the component grows with the AI response. Set a number (e.g. 600) to cap the vertical...
  - `height` (Integer)
  - `mode` (String)
  - `agentRef` (String)
  - `agentDisplayName` (String)
  - autres : `scriptedRepliesJson`, `flowRulesCsv`, `quickFlowsCsv`, `inputPlaceholder`
- **Persona** : All
- **Catégorie** : Résumé IA / Lanceur de Prompt Templates
- **Idée showcase** : Panneau IA sur toutes les pages, catalogue de prompts adapté à l'objet

## seFrRecordHighlights
- **Label** : CCO FR - Record Highlights
- **Description** : B2B / B2C - Custom highlights panel with round image and configurable fields/actions. Works on Account, Contact, Opportunity, Case, Lead, Order, Contract, Quote - can display the current record or its parent Account (recordSource property).
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact, Opportunity, Case, Lead, Order, Contract, Quote)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls button labels (Edit / Modifier, View Account Hierarchy / Voir la hiérarchi...
  - `recordSource` (String, default `current`) : current = show the record on the current page. parent = show the linked Account (Contact/Opportunity/Case/O...
  - `accountFieldsList` (String, default `AccountNumber, Industry, Type, Phone`) : Used when the displayed record is an Account.
  - `contactFieldsList` (String, default `Title, Email, Phone, Department`) : Used when the displayed record is a Contact.
  - `customImageUrl` (String)
  - `imageFieldApiName` (String) : Optional. API name of a text/URL field on the current object holding an image URL (e.g. a custom ImageURL__...
  - `imageSize` (Integer, default `90`) : Diameter of the round image in pixels. Also sets the fallback icon circle size.
  - `disableImageReplace` (Boolean, default `false`) : Off by default - clicking the image opens a file picker and uploads the new image as a standard File on the...
  - `maxQuickActions` (Integer, default `2`) : Number of buttons displayed in the header. Picked from the active page layout's actions list (same source a...
  - `quickActionsCsv` (String) : Optional. Forces a specific list instead of the page-layout default. Leave empty to use the layout.
- **Persona** : All
- **Catégorie** : Highlights record (header)
- **Idée showcase** : Remplace le highlights panel standard sur toutes les RecordPages showcase

## seFrRelatedRecordCard
- **Label** : CCO FR - Related Record Card
- **Description** : B2B / B2C - Vertical card that displays a related record (the Account of a Contact/Case/Opp, or the primary Contact of an Account). Picks the counterpart automatically from the record's object type. Bilingual EN / FR. Industry-agnostic defaults.
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact, Case, Opportunity, Order)
- **Props** :
  - `language` (String, default `fr`) : 'en' or 'fr' (default). Controls card title, button labels and empty state.
  - `target` (String, default `auto`) : 'auto' (default) picks the natural counterpart: on Account → primary Contact; on Contact/Case/Opportunity/O...
  - `cardTitle` (String) : Leave empty for the target default ('Account'/'Compte' or 'Primary Contact'/'Contact principal').
  - `cardIcon` (String) : SLDS icon name. Leave empty for the target default (standard:account or standard:contact).
  - `fieldsCsv` (String) : Leave empty for sensible defaults. Contact default: 'Title,Department,Email,Phone,MobilePhone'. Account def...
  - `contactImageFieldApiName` (String, default `SDO_Cust360_Contact_Picture_URL__c`) : URL field on Contact used as the image source when the displayed target is Contact. Schema-safe: skipped if...
  - `accountImageFieldApiName` (String) : Optional URL field on Account. Empty by default - the card uses the File attached to the account as the ima...
  - `disableImageReplace` (Boolean, default `false`) : Off by default - clicking the avatar opens a file picker and uploads the new image as a File on the target...
  - `imageFieldApiName` (String)
  - `imageMode` (String)
- **Persona** : Sales / Service
- **Catégorie** : Relations / Carte record lié
- **Idée showcase** : Carte Account sur Contact/Case/Opp ; contact principal sur Account

## seFrRevenueDashboard
- **Label** : CCO FR - Revenue Dashboard
- **Description** : B2B - Account-level 3-year revenue mini-dashboard. Bilingual EN / FR via the language property.
- **Exposed** : true
- **Targets** : RecordPage (Account)
- **Props** :
  - (17 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls card title, KPI labels, and the default month labels in the sample chart.
  - `cardTitle` (String) : Leave empty for dictionary default.
  - `cardIcon` (String, default `standard:performance`)
  - `currencyCode` (String, default `EUR`)
  - `localeTag` (String, default `fr-FR`)
  - `year1Label` (String, default `2024`)
  - `year2Label` (String, default `2025`)
  - `year3Label` (String, default `2026`)
  - `kpi1Label` (String)
  - `kpi1Value` (Integer, default `38550`)
  - `kpi2Label` (String)
  - `kpi2Value` (String, default `+14.2%`)
  - autres : `kpi3Label`, `kpi3Value`, `chartMaxScale`, `chartDataJson`, `currentYearColor`
- **Persona** : Sales / Manager
- **Catégorie** : Dashboard KPI / CA 3 ans
- **Idée showcase** : Mini-dashboard CA sur Account 360

## seFrServiceContracts
- **Label** : CCO FR - Service Contracts
- **Description** : Lists service contracts with trade badge, SLA, contractor email, scope and open WO count. Walks parent chain on Account, Case, Contact, Opportunity, WorkOrder. Live Apex wire. EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Account, Case, Contact, Opportunity, WorkOrder)
- **Props** :
  - `language` (String, default `fr`) : 'fr' (default) or 'en'. Controls card title, empty state and row labels.
  - `cardTitle` (String) : Leave empty for the language dictionary default.
  - `cardIcon` (String, default `standard:service_contract`)
- **Persona** : Service
- **Catégorie** : Service case context / Contrats & SLA
- **Idée showcase** : Panneau contrats de service sur Case/WorkOrder pour vérifier SLA & corps de métier

## seFrSmartRecommendations
- **Label** : CCO FR - Smart Recommendations
- **Description** : Context-aware recommended actions (Next Best Action).
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact, Case, Order, Opportunity, Lead)
- **Props** :
  - (39 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls card title, subtitle, empty state, Dismiss button, relevance badge prefix,...
  - `cardTitle` (String)
  - `displayMode` (String, default `Global`) : Global = show on every record. Targeted = only on the record IDs specified below.
  - `targetId1` (String)
  - `targetRecos1` (String)
  - `targetId2` (String)
  - `targetRecos2` (String)
  - `targetId3` (String)
  - `targetRecos3` (String)
  - `customTitle1` (String)
  - `customDesc1` (String)
  - `customTitle2` (String)
  - autres : `customDesc2`, `customTitle3`, `customDesc3`, `customTitle4`, `customDesc4`, `customTitle5`, `customDesc5`, `customTitle6`, `customDesc6`, `globalTitle1`, `globalDesc1`, `globalBtn1`, `globalTitle2`, `globalDesc2`, `globalBtn2`, `globalTitle3`, `globalDesc3`, `globalBtn3`, `globalTitle4`, `globalDesc4`, `globalBtn4`, `globalTitle5`, `globalDesc5`, `globalBtn5`, `globalTitle6`, `globalDesc6`, `globalBtn6`
- **Persona** : All
- **Catégorie** : Next Best Action
- **Idée showcase** : Colonne latérale NBA sur Account/Contact/Case/Opportunity/Lead

## seFrSplashBanner
- **Label** : CCO FR - Splash Banner
- **Description** : Bannière / splash screen avec fond animé pur CSS / SVG. 8 styles de fond au choix (Waves, Aurora, Mesh, Orbs, Conic, Geometric, Constellation, Grid) - aucune librairie externe, paramétrable à 100% (texte, taille, couleurs, vitesse, hauteur).
- **Exposed** : true
- **Targets** : HomePage, AppPage, RecordPage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'.
  - `title` (String, default `Bonjour 👋`) : Le grand texte affiché au centre. Émojis acceptés.
  - `subtitle` (String) : Texte plus petit affiché sous le titre.
  - `textSize` (String, default `l`) : s = petit, m = moyen, l = grand (défaut), xl = très grand.
  - `bgStyle` (String, default `waves`) : waves (vagues animées de Charly) | aurora (aurores boréales) | mesh (mesh gradient Stripe-like) | orbs (sph...
  - `colorPrimary` (String, default `#0176d3`) : Couleur CSS (hex, rgb, named). Utilisée par tous les fonds.
  - `colorSecondary` (String, default `#a445ff`) : Couleur CSS. Utilisée par aurora / mesh / orbs / conic / geometric.
  - `colorTertiary` (String, default `#ff6ec7`) : Couleur CSS. Utilisée par aurora / mesh / orbs / conic / geometric (sinon ignorée).
  - `height` (Integer, default `220`) : Hauteur du composant en pixels. 180-300 conviennent à la plupart des bannières.
  - `darkText` (Boolean, default `false`) : Off par défaut (texte blanc, idéal sur fond foncé). On = texte noir.
  - `animationSpeed` (String, default `normal`)
  - `alignment` (String, default `center`)
  - `ctaLabel` (String) : Si renseigné, ajoute un bouton sous le texte.
  - `ctaUrl` (String) : Lien activé par le bouton. URL relative Salesforce ('/lightning/...') ou absolue ('https://...').
- **Persona** : All
- **Catégorie** : Branding / Bannière
- **Idée showcase** : Splash d'ouverture de chaque story (Home, AppPage ou en tête de record)

## seFrSubscribersList
- **Label** : CCO FR - Subscribers List
- **Description** : Service - Account team panel showing Users linked to the current record (Owner, Opp Team) with profile photos, roles and navigation. Live Apex by default, mock fallback via props. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (tous objets, pas de filtre `<objects>`) ; AppPage, HomePage
- **Props** :
  - __Config [RecordPage]__ (14 props)
    - `language` (String, default `fr`) : 'fr' (default) or 'en'.
    - `cardTitle` (String) : Leave empty for auto (Equipe du compte / Account Team).
    - `cardSubtitle` (String) : Leave empty for auto count.
    - `cardIcon` (String, default `standard:team_member`)
    - `sourceMode` (String, default `live`) : 'live' (Apex, default) or 'mock' (pipe-separated props below).
    - `avatarMode` (String, default `initials`) : Deprecated - kept for backward compat. Live mode auto-detects photos.
    - `contactNames` (String) : Only used when sourceMode=mock.
    - `roles` (String) : Only used when sourceMode=mock.
    - `channels` (String) : Legacy prop - kept for backward compat.
    - `subscribedAtRelative` (String) : Legacy prop - kept for backward compat.
    - `notificationCounts` (String) : Legacy prop - kept for backward compat.
    - `userIds` (String) : Only used when sourceMode=mock. Enables clickable names.
    - `footerLabel` (String) : Legacy prop - kept for backward compat.
    - `showFooter` (Boolean, default `false`) : Legacy prop - kept for backward compat.
  - AppPage, HomePage : mêmes props que ci-dessus
- **Persona** : Service / Sales
- **Catégorie** : Équipe / Utilisateurs liés
- **Idée showcase** : Panneau équipe (Owner, Opp Team) sur Case/Opportunity ; AppPage équipe

## seFrTelesalesRepHome
- **Label** : CCO FR - Telesales - Rep Home
- **Description** : B2B - Telesales Home page. KPI tiles, incoming cases, orders to validate, mini-charts, calls, news. Bilingual EN/FR via the language property.
- **Exposed** : true
- **Targets** : HomePage, AppPage
- **Props** :
  - (38 props, synthèse : les 12 premières détaillées, reste = noms seuls)
  - `language` (String, default `fr`) : Two-letter code - 'en' (default) or 'fr'. Controls all built-in UI strings including datatable column heade...
  - `greetingTemplate` (String) : Use {name} placeholder. Wrap any word with **…** to render it in the highlight color. Leave empty for dicti...
  - `defaultUserName` (String)
  - `highlightColor` (String, default `#0176d3`) : Applied to **bold** segments of the greeting. Defaults to the CCO FR brand blue.
  - `caseStatusesCsv` (String, default `New,Working,Waiting on Customer,Escalated`)
  - `caseOwnerScope` (String, default `all`) : 'mine' | 'all'
  - `caseLimit` (Integer, default `6`)
  - `caseListView` (String, default `Recent`)
  - `orderStatusesCsv` (String, default `Draft`)
  - `orderOwnerScope` (String, default `all`)
  - `orderLimit` (Integer, default `6`)
  - `orderListView` (String, default `Recent`)
  - autres : `callsRecordType`, `callsOwnerScope`, `callsLimit`, `currencyCode`, `localeTag`, `kpi1Label`, `kpi1Value`, `kpi1Footer`, `kpi1FooterClass`, `kpi2Label`, `kpi2Value`, `kpi2Footer`, `kpi2FooterClass`, `kpi3Label`, `kpi3Value`, `kpi3Footer`, `kpi3FooterClass`, `kpi4Label`, `kpi4Value`, `kpi4Footer`, `kpi4FooterClass`, `callsJson`, `newsJson`, `channelVolumeJson`, `subjectVolumeJson`, `monthlyClosedJson`
- **Persona** : Telesales
- **Catégorie** : Home persona - Télévente
- **Idée showcase** : Home "CCO FR - Telesales Home" : cases entrants, commandes à valider

## seFrTerritoryMap
- **Label** : CCO FR - Territory Map
- **Description** : Sales / Field Sales - Map view of the territory: Accounts pinned by billing geo, color-coded by open pipeline, with side filters (Owner, RecordType, Open amount range, Stages, Case status, Type, Industry + name search), KPI tiles and CSV export.
- **Exposed** : true
- **Targets** : HomePage, AppPage
- **Props** :
  - `language` (String, default `fr`) : 'fr' (default) or 'en'.
  - `cardTitle` (String) : Leave empty for the dictionary default.
  - `limitCount` (Integer, default `100`) : Server-side LIMIT (1-200).
  - `defaultOwnerScope` (String, default `mine`) : 'mine' = accounts owned by the running user (with auto-fallback to all when empty). 'all' = every owner.
  - `defaultRecordType` (String) : Optional. Pre-selects an Account RecordType filter (developer name). Leave empty to show all types.
  - `defaultStagesCsv` (String) : Optional. Pre-selects opportunity stages used to compute open-amount KPIs. Empty = all open opportunities.
  - `filterFieldAApiName` (String, default `Type`) : API name of an Account picklist used as a filter and shown in the side list (default: Type). Set to a custo...
  - `filterFieldBApiName` (String, default `Industry`) : API name of an Account picklist used as a filter and shown in the side list (default: Industry). Set to a c...
  - `currencyCode` (String, default `EUR`) : ISO 4217 code (EUR, USD, GBP...).
  - `zoomLevel` (Integer, default `6`) : lightning-map zoom level (1=world, 13=neighborhood).
  - `defaultCenterLatitude` (String, default `46.7`) : Initial map center latitude. Defaults to France (46.7). Override for other regions.
  - `defaultCenterLongitude` (String, default `2.5`) : Initial map center longitude. Defaults to France (2.5).
  - `mapHeight` (Integer, default `480`) : Fixed height of the map + list area. The list scrolls independently inside this height.
  - `mapWidthRatio` (String, default `0.66`) : Horizontal split ratio between the map (left) and the account list (right). Range 0.4 - 0.85. Default 0.66...
  - `filtersOpenByDefault` (Boolean, default `false`)
- **Persona** : FieldSales / Manager
- **Catégorie** : Carte géo - Territoire
- **Idée showcase** : AppPage "Territoire" : comptes colorés par pipeline, filtres owner/RT

## seFrTimelinePhases
- **Label** : CCO FR - Timeline Phases
- **Description** : Horizontal multi-phase timeline. Auto-adapts default phases to the host object (Case=resolution, WorkOrder=intervention, Account/Opp=sales cycle, Home=fiscal). Custom JSON override. Today marker.
- **Exposed** : true
- **Targets** : RecordPage, AppPage, HomePage (tous objets, pas de filtre `<objects>`)
- **Props** :
  - `language` (String, default `fr`) : 'fr' (default) or 'en'. Controls card title and the default phases when Phases JSON is empty.
  - `scope` (String, default `auto`) : Picks which default phases preset is used when Phases JSON is empty. 'auto' (default) detects from the host...
  - `cardTitle` (String) : Leave empty for the language default ('Parcours' / 'Journey').
  - `cardIcon` (String, default `standard:timesheet`)
  - `phasesJson` (String) : JSON array — copy the placeholder shown in this field as a starting point. Each item needs: label (text), d...
  - `localeTag` (String, default `fr-FR`)
  - `hideTodayMarker` (Boolean, default `false`) : Off by default - the vertical dotted line showing today's position is displayed.
- **Persona** : All
- **Catégorie** : Lifecycle / Phases
- **Idée showcase** : Timeline de phases adaptée à Case (résolution), WorkOrder, Account/Opp (cycle de vente)

## seFrVisitSummaryAI
- **Label** : CCO FR - Resume de Visite IA
- **Description** : Resume IA (Agentforce / Einstein) de la visite courante (Visit__c, pattern Retail Execution de la lib). Zero managed package.
- **Exposed** : true
- **Targets** : RecordPage (Visit__c, Account) ; AppPage, HomePage
- **Props** :
  - __Config [RecordPage]__ (2 props)
    - `language` (String, default `fr`) : UI language. Defaults to fr.
    - `promptTemplateApiName` (String) : DeveloperName of a Flex Prompt Template that takes an Input:Visit__c and returns a JSON { summary, keyPoint...
  - AppPage, HomePage : mêmes props que ci-dessus
- **Persona** : FieldSales / Retail
- **Catégorie** : Lifecycle visite + Résumé IA
- **Idée showcase** : Page Visit__c "Compte-rendu de visite" ; aussi sur Account

## seFrVoiceNoteTaker
- **Label** : CCO FR - Voice Note Taker
- **Description** : Dictate a voice note and save it as a completed Task linked to the current record. Bilingual EN / FR.
- **Exposed** : true
- **Targets** : RecordPage (Account, Contact, Lead, Opportunity)
- **Props** :
  - `language` (String, default `fr`) : 'en' (default) or 'fr'. Controls every visible string. Explicit values override per-field.
  - `cardTitle` (String)
  - `cardIcon` (String, default `standard:voice_call`)
  - `speechLocale` (String, default `fr-FR`) : BCP 47 tag (e.g. en-US, fr-FR). Independent of the UI language - set it to the language the user will actua...
  - `taskSubject` (String)
  - `recordingHint` (String)
  - `textareaLabel` (String)
  - `textareaPlaceholder` (String)
  - `startButtonLabel` (String)
  - `stopButtonLabel` (String)
  - `saveButtonLabel` (String)
  - `unsupportedBrowserMessage` (String)
  - `successMessage` (String)
- **Persona** : FieldSales / Sales
- **Catégorie** : Capture vocale / Notes terrain
- **Idée showcase** : Note vocale dictée sur Account/Contact/Lead/Opp après un RDV

---

# Pivot par persona

## Sales
`seFrAccountActions`, `seFrAccountHealth`, `seFrAccountStrategyPlan`, `seFrActiveSegments`, `seFrActivityFeed`, `seFrConsentManager`, `seFrContactCard`, `seFrContactsCarousel`, `seFrCustomerOrders`, `seFrCustomerSalesSummary`, `seFrKanbanBoard`, `seFrMyEvents`, `seFrOrderEntry`, `seFrPipelineSnapshot`, `seFrRelatedRecordCard`, `seFrRevenueDashboard`, `seFrSubscribersList`, `seFrVoiceNoteTaker`

## FieldSales
`seFrAccountActions`, `seFrActivityFeed`, `seFrContactsCarousel`, `seFrFieldRepHome`, `seFrMyEvents`, `seFrNearbyAccountsMap`, `seFrTerritoryMap`, `seFrVisitSummaryAI`, `seFrVoiceNoteTaker`

## Telesales
`seFrCustomerOrders`, `seFrKanbanBoard`, `seFrOrderEntry`, `seFrOrderSummary`, `seFrTelesalesRepHome`

## Service
`seFrActivityFeed`, `seFrContactCard`, `seFrCustomerOrders`, `seFrKanbanBoard`, `seFrOrderSummary`, `seFrRelatedRecordCard`, `seFrServiceContracts`, `seFrSubscribersList`

## Retail
`seFrCustomerSalesSummary`, `seFrOrderEntry`, `seFrVisitSummaryAI`

## Marketing
`seFrActiveSegments`, `seFrConsentManager`, `seFrCustomerSalesSummary`, `seFrEngagementHistory`

## Manager
`seFrAccountHealth`, `seFrAccountStrategyPlan`, `seFrKanbanBoard`, `seFrMetricTile`, `seFrPipelineSnapshot`, `seFrRevenueDashboard`, `seFrTerritoryMap`

## All
`seFrAgentforceHeader`, `seFrAlertsRibbon`, `seFrFilesGallery`, `seFrKpiLauncher`, `seFrMetricTile`, `seFrMyTasks`, `seFrPromptLauncher`, `seFrRecordHighlights`, `seFrSmartRecommendations`, `seFrSplashBanner`, `seFrTimelinePhases`

# Pivot par sObject cible

Ne prend en compte que les `<objects>` déclarés dans les targetConfigs RecordPage.

## Account
`seFrAccountActions`, `seFrAccountHealth`, `seFrAccountStrategyPlan`, `seFrActivityFeed`, `seFrAlertsRibbon`, `seFrConsentManager`, `seFrContactCard`, `seFrContactsCarousel`, `seFrCustomerOrders`, `seFrCustomerSalesSummary`, `seFrEngagementHistory`, `seFrOrderEntry`, `seFrPipelineSnapshot`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrRevenueDashboard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrVisitSummaryAI`, `seFrVoiceNoteTaker`

## Opportunity
`seFrAccountActions`, `seFrAlertsRibbon`, `seFrContactCard`, `seFrPipelineSnapshot`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrVoiceNoteTaker`

## Case
`seFrAccountActions`, `seFrAlertsRibbon`, `seFrContactCard`, `seFrOrderEntry`, `seFrOrderSummary`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrServiceContracts`, `seFrSmartRecommendations`

## Lead
`seFrAccountActions`, `seFrAlertsRibbon`, `seFrConsentManager`, `seFrContactCard`, `seFrEngagementHistory`, `seFrRecordHighlights`, `seFrSmartRecommendations`, `seFrVoiceNoteTaker`

## Contact
`seFrAccountActions`, `seFrActivityFeed`, `seFrAlertsRibbon`, `seFrConsentManager`, `seFrContactCard`, `seFrCustomerOrders`, `seFrCustomerSalesSummary`, `seFrEngagementHistory`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrServiceContracts`, `seFrSmartRecommendations`, `seFrVoiceNoteTaker`

## Visit__c
`seFrVisitSummaryAI`

## Order
`seFrAlertsRibbon`, `seFrContactCard`, `seFrRecordHighlights`, `seFrRelatedRecordCard`, `seFrSmartRecommendations`

## Contract
`seFrAlertsRibbon`, `seFrRecordHighlights`

## Quote
`seFrRecordHighlights`

## WorkOrder
`seFrServiceContracts`

## Home/AppPage (HomePage / AppPage)
`seFrActiveSegments`, `seFrAgentforceHeader`, `seFrAlertsRibbon`, `seFrEngagementHistory`, `seFrFieldRepHome`, `seFrKanbanBoard`, `seFrKpiLauncher`, `seFrMetricTile`, `seFrMyEvents`, `seFrMyTasks`, `seFrNearbyAccountsMap`, `seFrPromptLauncher`, `seFrSplashBanner`, `seFrSubscribersList`, `seFrTelesalesRepHome`, `seFrTerritoryMap`, `seFrTimelinePhases`, `seFrVisitSummaryAI`

## (RecordPage sans filtre)
`seFrActiveSegments`, `seFrFilesGallery`, `seFrKanbanBoard`, `seFrKpiLauncher`, `seFrMetricTile`, `seFrMyEvents`, `seFrMyTasks`, `seFrPromptLauncher`, `seFrSplashBanner`, `seFrSubscribersList`, `seFrTimelinePhases`

## Bundle schema
- `seFrRetailExecSchema` : sObject `Visit__c` + 9 fields + permset `CCO_FR_Retail_Exec`. Prérequis de `seFrVisitSummaryAI` et du Flow `CCO_FR_Start_Visit`.
