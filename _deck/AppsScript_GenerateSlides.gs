/**
 * SE FR Component Library — Google Slides generator
 * --------------------------------------------------
 * AUTO-GENERATED from _build/manifest.json by _build/build_apps_script.py.
 * Do not hand-edit — regenerate via:
 *     python3 _build/build_apps_script.py
 *
 * To use this script:
 *  1. Open https://script.google.com → "New project"
 *  2. Paste this entire file into Code.gs
 *  3. Save, ▶ Run, accept Drive / Slides permissions
 *  4. The execution log prints the URL of the created presentation
 *
 * The script creates a deck with:
 *   - 4 static intro slides (cover, why, principles, reading)
 *   - 1 catalog slide
 *   - 1 tech-prereqs slide
 *   - For each manifest category (in order): 1 divider + N component slides
 *   - 2 closing slides (deploy, contribute)
 *
 * Each slide uses TITLE_AND_BODY (plain text). Restyle with your branded
 * template once content is in place.
 */

// ============================================================
// MANIFEST PAYLOAD (auto-generated)
// ============================================================
var MANIFEST = {
  "sections": [
    {
      "category": "Account 360°",
      "lede": "Everything that gives the account team a synthetic, actionable view of the customer.",
      "components": [
        {
          "apiName": "seFrAccountHealth",
          "name": "Account Health",
          "tagline": "Quantitative account health score (0-100) with verdict level and weighted positive / negative signals.",
          "chips": [
            "SVG donut gauge",
            "Weighted +/- signals",
            "Drill-down explainability"
          ],
          "keyProps": [
            "Score field, signal fields (CSV)",
            "Color thresholds",
            "Card title override"
          ],
          "seBenefit": "Reads Cust360 SDO standard fields by default (e.g. churn risk, sentiment, NPS). On orgs without those fields, falls back to mocked signals — never crashes, always demo-ready.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account"
          ],
          "apexDeps": [
            "SE_FR_AccountHealthController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrAccountStrategyPlan",
          "name": "Account Strategy Plan",
          "tagline": "Narrative account plan with editable KPIs, target gauge, SWOT 2x2 and quarterly action plan.",
          "chips": [
            "Inline edit every block",
            "Narrative SWOT 2x2",
            "Quarterly action plan"
          ],
          "keyProps": [
            "Section labels & default content",
            "Owner avatar override"
          ],
          "seBenefit": "Inline editable from the page — no record write. Great visual for \"strategic-account\" demo moments, even on bare orgs.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrActivityFeed",
          "name": "Activity Feed",
          "tagline": "Unified activity timeline aggregating 16+ Salesforce record types in a single feed with rich filtering.",
          "chips": [
            "16+ record types unified",
            "Rich filters + expand",
            "Per-source error isolation"
          ],
          "keyProps": [
            "Days back / forward window",
            "Include related contacts",
            "Object types displayed"
          ],
          "seBenefit": "Pulls from `Task`, `Event`, `EmailMessage`, `VoiceCall`, `MessagingSession`, `LiveChatTranscript`, `Order`, `Case`, `Opportunity`, `Quote`, `Contract`, `Visit`, `ContentDocumentLink`, `FeedItem`, `SurveyResponse` — and uses business-meaningful dates (CloseDate, EffectiveDate, StartDate) instead of CreatedDate.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact"
          ],
          "apexDeps": [
            "SE_FR_ActivityFeedController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrAlertsRibbon",
          "name": "Alerts Ribbon",
          "tagline": "Configurable alerts ribbon combining declarative record-driven rules with always-on static banners.",
          "chips": [
            "Rule-driven + static",
            "3 visual variants",
            "Sticky-on-scroll"
          ],
          "keyProps": [
            "`rulesCsv` · field-based rules (Record Page only)",
            "`staticAlertsCsv` · always-on alerts (any page)",
            "`visualStyle` · inline / card",
            "`alertVariant` · banner / solid / minimal",
            "`density` · comfortable / compact",
            "`stickyOnScroll`"
          ],
          "seBenefit": "Rule-driven mode evaluates a tiny DSL against the current record's fields (\"AnnualRevenue<500000|warning|...\") — drop on any record page, the right alert pops on the right account, no code.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact",
            "Case",
            "Opportunity",
            "Lead",
            "Order",
            "Contract"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrContactCard",
          "name": "Contact Card",
          "tagline": "Visual contact card with animated waves, avatar, address, configurable gauges and optional Einstein prompt summary.",
          "chips": [
            "Wow-effect animated waves",
            "Optional Einstein summary",
            "Up to 3 gauges",
            "Inline avatar upload"
          ],
          "keyProps": [
            "Up to 3 gauges (label, field, icon, lower/higher-better semantics)",
            "Image · URL field OR click-to-upload File",
            "Customer ID line (toggle + field)",
            "Animated wave colors / theme accent",
            "Einstein prompt summary · default `einstein_gpt__summarizeContact` (the SDO-shipped template, not a true Salesforce standard)"
          ],
          "seBenefit": "Built-in \"Summarize\" button using the SDO-shipped contact-summary prompt — drop on a Contact / Case / Account page and you get an AI inline summary out of the box. Click the avatar to upload a contact photo (no schema work required).",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Contact",
            "Account",
            "Case",
            "Opportunity",
            "Order",
            "Lead"
          ],
          "apexDeps": [
            "SE_FR_ContactCardController",
            "SE_FR_ImageFileController"
          ],
          "sharedApexDeps": [
            "SE_FR_ImageFileController"
          ],
          "dataMode": "hybrid",
          "mobileReady": true,
          "originalAuthor": "Charly Ansel"
        },
        {
          "apiName": "seFrContactsCarousel",
          "name": "Contacts Carousel",
          "tagline": "Horizontal carousel of an Account's Contacts with avatars, role badges and quick Email / Call actions.",
          "chips": [
            "Champion / DMU role badges",
            "Initials avatar fallback",
            "Email & Call shortcuts"
          ],
          "keyProps": [
            "Visible contact count",
            "Card field list",
            "Quick actions"
          ],
          "seBenefit": "Visual replacement for the standard Contacts related list — much more demo-friendly than a flat table.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account"
          ],
          "apexDeps": [
            "SE_FR_ContactsCarouselController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrCustomerOrders",
          "name": "Customer Orders",
          "tagline": "Last order detail card plus searchable, sortable, filterable order history for an Account or Contact.",
          "chips": [
            "Last order detail card",
            "Searchable + sortable",
            "Status filter + 'View all'"
          ],
          "keyProps": [
            "Max rows",
            "Filter by status / date range",
            "`productImageFieldApiName` · default `Image_URL__c`"
          ],
          "seBenefit": "Renders product images per line — turns a plain list into a visual catalog reminiscent of an e-commerce order history. Compatible with SDO product image fields out of the box.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact"
          ],
          "apexDeps": [
            "SE_FR_CustomerOrdersController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrCustomerSalesSummary",
          "name": "Customer Sales Summary",
          "tagline": "B2C-leaning sales summary with KPI tiles and breakdowns by Category, Brand and Store.",
          "chips": [
            "3 KPI + 3 breakdown charts",
            "Category / Brand / Store",
            "Person Account compatible"
          ],
          "keyProps": [
            "Time window",
            "Categories shown"
          ],
          "seBenefit": "Same component covers B2B and B2C scenarios — auto-detects Person Account vs. business Account and adapts the layout.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Contact",
            "Account"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrPipelineSnapshot",
          "name": "Pipeline Snapshot",
          "tagline": "Account-level pipeline visualization with summary tiles and one column per Opportunity stage.",
          "chips": [
            "Column per stage",
            "Weighted total tile",
            "Auto-derives from Opp"
          ],
          "keyProps": [
            "Max opportunities, status filter",
            "Show / hide total",
            "Currency display"
          ],
          "seBenefit": "Sidebar-friendly width — fits the narrow right column without breaking. No setup needed: reads any open Opportunity on the Account.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Opportunity"
          ],
          "apexDeps": [
            "SE_FR_PipelineSnapshotController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrRecordHighlights",
          "name": "Record Highlights",
          "tagline": "Custom highlights panel with round image, key fields and action buttons, working on 8 standard objects.",
          "chips": [
            "Inline image upload",
            "Works on 8 objects",
            "Configurable field strip"
          ],
          "keyProps": [
            "`language` · en / fr",
            "`recordSource` · current / parent",
            "`accountFieldsList`, `contactFieldsList`",
            "`imageFieldApiName` · URL field on the record",
            "`maxQuickActions` · loaded from layout"
          ],
          "seBenefit": "Click the avatar to upload / replace the image instantly — no static resource, no public URL hosting, no custom field. The image is saved as a File on the record.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact",
            "Opportunity",
            "Case",
            "Lead",
            "Order",
            "Contract",
            "Quote"
          ],
          "apexDeps": [
            "SE_FR_RecordHighlightsController",
            "SE_FR_ImageFileController"
          ],
          "sharedApexDeps": [
            "SE_FR_ImageFileController"
          ],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrRelatedRecordCard",
          "name": "Related Record Card",
          "tagline": "Vertical sidebar card showing the counterpart record (Contact / Account) with key fields and avatar.",
          "chips": [
            "Auto picks counterpart",
            "Person Account aware",
            "Empty-state fallback"
          ],
          "keyProps": [
            "`target` · auto / account / contact",
            "`fieldsCsv` per target",
            "Per-target image field (Contact + Account)"
          ],
          "seBenefit": "Click the avatar to upload an image for the related record — handy for setting an Account logo or a Contact picture without leaving the page. Default Contact image field `SDO_Cust360_Contact_Picture_URL__c` works out-of-box on SDO.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact",
            "Case",
            "Opportunity",
            "Order"
          ],
          "apexDeps": [
            "SE_FR_RelatedRecordCardController",
            "SE_FR_ImageFileController"
          ],
          "sharedApexDeps": [
            "SE_FR_ImageFileController"
          ],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrRevenueDashboard",
          "name": "Revenue Dashboard",
          "tagline": "3-year revenue mini-dashboard with KPI tiles and a side-by-side monthly bar chart.",
          "chips": [
            "3 years side-by-side",
            "3 KPI tiles",
            "Currency & scale options"
          ],
          "keyProps": [
            "Months back, comparison year",
            "Bucket source field, currency code"
          ],
          "seBenefit": "Built-in YoY overlay — gives the \"story\" of growth or decline visually, without configuring a real Salesforce dashboard.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        }
      ]
    },
    {
      "category": "Sales Productivity",
      "lede": "Day-to-day reps' tooling — tasks, events, kanban, order entry.",
      "components": [
        {
          "apiName": "seFrKanbanBoard",
          "name": "Kanban Board",
          "tagline": "Generic kanban board with native drag & drop on any whitelisted SObject (Case, Opp, Lead, Order, Task, Account).",
          "chips": [
            "Drag & drop status updates",
            "Auto-scope on Record Page",
            "Per-status swim lanes"
          ],
          "keyProps": [
            "Object type, status field",
            "Visible columns",
            "Card field list"
          ],
          "seBenefit": "Same component supports 6 SObjects — drop on a Home Page (all my open cases), an App Page (team kanban), or a Record Page (Account-scoped cases). Drag-drop instantly updates the status field.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_KanbanBoardController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrMyEvents",
          "name": "My Events",
          "tagline": "Today's calendar as a compact vertical timeline that fits a sidebar column, with Google-Calendar-style overlap.",
          "chips": [
            "Side-by-side overlap",
            "Auto-trims empty hours",
            "Compact today view"
          ],
          "keyProps": [
            "Days forward",
            "Show / hide attendees, location",
            "Card title override"
          ],
          "seBenefit": "Useful in both Field Sales (today's appointments) and as a transversal \"agenda\" widget on any persona's Home Page.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_AgendaController"
          ],
          "sharedApexDeps": [
            "SE_FR_AgendaController"
          ],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrMyTasks",
          "name": "My Tasks",
          "tagline": "Compact 'My Tasks' sidebar panel grouped by due date with one-click completion.",
          "chips": [
            "Grouped by due date",
            "One-click complete",
            "Overdue highlighting"
          ],
          "keyProps": [
            "Days back / forward",
            "Show / hide priority chip",
            "Card title override"
          ],
          "seBenefit": "Same controller as My Events (single Apex class for both) — guarantees consistent date logic and shared maintenance.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_AgendaController"
          ],
          "sharedApexDeps": [
            "SE_FR_AgendaController"
          ],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrOrderEntry",
          "name": "Order Entry",
          "tagline": "Full-grid order entry on an Account or Case with stock, AI-recommended quantities and discounts, persisted as real Order records.",
          "chips": [
            "AI-recommended qty + discount",
            "Live running total",
            "Persists real Order"
          ],
          "keyProps": [
            "Product columns (code, category, last order, stock, price)",
            "Currency code & symbol",
            "Order type defaults"
          ],
          "seBenefit": "Real product images appear in each row (read from `Product2.Image_URL__c` by default — works out-of-box on SDO). Reorder shortcut and stock visibility are visually striking demo moments.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Case"
          ],
          "apexDeps": [
            "SE_FR_OrderEntryController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrOrderSummary",
          "name": "Order Summary",
          "tagline": "Most recent Order linked to a Case with products, total, delivery info and edit / delete / submit actions.",
          "chips": [
            "Auto-resolves Account",
            "Edit / delete / submit",
            "Activates Order on submit"
          ],
          "keyProps": [
            "Show / hide line item details",
            "Currency display",
            "Separator label"
          ],
          "seBenefit": "Clean visual summary that a rep can read aloud during a call without scrolling — great for the \"I'm reading you the order back\" moment.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Case"
          ],
          "apexDeps": [
            "SE_FR_OrderSummaryController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrTimelinePhases",
          "name": "Timeline Phases",
          "tagline": "Horizontal multi-phase timeline with date axis, 'Today' marker and done / pending state per phase.",
          "chips": [
            "Date-axis layout",
            "'Today' marker",
            "Done / pending state"
          ],
          "keyProps": [
            "Up to 6 phases (label, date, status)",
            "Color theme"
          ],
          "seBenefit": "Visualizes a journey or process state without needing custom objects or flows — type the phases directly in App Builder.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        }
      ]
    },
    {
      "category": "Geo & Field",
      "lede": "On-the-ground components for field reps — maps, voice notes.",
      "components": [
        {
          "apiName": "seFrNearbyAccountsMap",
          "name": "Nearby Accounts Map",
          "tagline": "Interactive map of nearby accounts using the browser's geolocation with Haversine distance sort.",
          "chips": [
            "Browser geolocation",
            "Haversine distance sort",
            "Custom pin styling"
          ],
          "keyProps": [
            "Origin mode · auto geolocation / manual lat-lng",
            "Max accounts displayed, RecordType filter",
            "Highlight first account as priority"
          ],
          "seBenefit": "Browser geolocation prompt for a \"wow\" moment in field demos. Falls back to a fixed origin (Place de la Bastille) when permission is denied — never breaks the demo.",
          "surfaces": [
            "AppPage",
            "HomePage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_NearbyAccountsController"
          ],
          "sharedApexDeps": [
            "SE_FR_NearbyAccountsController"
          ],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrTerritoryMap",
          "name": "Territory Map",
          "tagline": "Interactive territory map with geocoded Accounts, pipeline color coding, sidebar filters and CSV export.",
          "chips": [
            "Pipeline-tier color code",
            "Sidebar filters",
            "CSV export of view"
          ],
          "keyProps": [
            "Owner / RecordType / amount range / stages / case status",
            "2 configurable picklist filters (Type, Industry by default)",
            "Map height, map / list ratio, default center (France)"
          ],
          "seBenefit": "Pins are color-coded by open-pipeline tier (red top 20% / orange / green / grey) — instantly visualizes territory health. CSV export lets you pull the filtered list for follow-up reports.",
          "surfaces": [
            "AppPage",
            "HomePage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_TerritoryMapController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrVoiceNoteTaker",
          "name": "Voice Note Taker",
          "tagline": "Dictate a voice note via the Web Speech API and save it as a completed Task linked to the current record.",
          "chips": [
            "Browser-native dictation",
            "Saves as Task",
            "Auto WhoId / WhatId routing"
          ],
          "keyProps": [
            "Auto-save vs review-first",
            "Transcript language"
          ],
          "seBenefit": "Speech-to-text via the browser `SpeechRecognition` API — no Einstein / external service dependency. Demoable on any org as long as Chrome is the browser.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact",
            "Lead",
            "Opportunity"
          ],
          "apexDeps": [
            "SE_FR_VoiceNoteController"
          ],
          "sharedApexDeps": [
            "SE_FR_VoiceNoteController"
          ],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        }
      ]
    },
    {
      "category": "Marketing & Data",
      "lede": "Segments, consent, marketing-side metrics.",
      "components": [
        {
          "apiName": "seFrActiveSegments",
          "name": "Active Segments",
          "tagline": "Compact panel showing the marketing / Data Cloud segments the record belongs to, as colored badges.",
          "chips": [
            "Segment count in title",
            "Color-coded badges",
            "Record / App / Home page"
          ],
          "keyProps": [
            "Up to 6 segment slots (label, audience size, last-updated)"
          ],
          "seBenefit": "Sets a marketing-aware tone on a Contact page without requiring a Data Cloud connection — props-driven storytelling.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrConsentManager",
          "name": "Consent Manager",
          "tagline": "Per-channel GDPR consent toggle panel binding each channel to a boolean field on the current record.",
          "chips": [
            "Per-channel toggles",
            "LDS persistence",
            "Inverted opt-out fields"
          ],
          "keyProps": [
            "Channels CSV (override) · format `label|fieldApiName|inverted`",
            "Toggle / success / error label overrides",
            "Card title / icon override"
          ],
          "seBenefit": "Default channels map onto Salesforce standard fields: `HasOptedOutOfEmail`, `DoNotCall`, `HasOptedOutOfFax` (used as a stand-in for WhatsApp opt-out). Drop on Contact / Lead / Account → it just works, no custom field required.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Contact",
            "Lead",
            "Account"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrMetricTile",
          "name": "Metric Tile",
          "tagline": "Single-metric tile with 4 chart styles (line / area / bar / mini-donut), comparison series, target line and currency formatting.",
          "chips": [
            "4 chart styles",
            "Forecast-vs-actual dashed",
            "Target line + goal donut",
            "Pure SVG ~3 KB"
          ],
          "keyProps": [
            "`chartStyle` · line / area / bar / mini-donut",
            "`seriesJson`, `secondarySeriesJson` (forecast vs actual)",
            "`targetValue` + dashed target line + chip",
            "`currentValue` + `currencyCode` · auto Intl format",
            "`scalingMode` · auto / from-zero / fixed"
          ],
          "seBenefit": "Compact tile, dashboard-ready — set `hideCardTitle = true` to stack 4 tiles in a row aligned. Mini-donut variant is the striking \"85% to target\" demo moment without configuring a real Performance Goal.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        }
      ]
    },
    {
      "category": "Agentforce & AI",
      "lede": "Components that surface or trigger Salesforce AI capabilities.",
      "components": [
        {
          "apiName": "seFrAgentforceHeader",
          "name": "Agentforce Header",
          "tagline": "Astro-themed Home page header with a search / dictation box that forwards questions to the Agentforce panel.",
          "chips": [
            "Astro floating header",
            "Voice dictation",
            "Triggers Agentforce panel"
          ],
          "keyProps": [
            "Title / subtitle",
            "CTA label + URL",
            "Astro animation toggle"
          ],
          "seBenefit": "Speech-to-text via the browser API — speak a question, click \"Send\", and the transcribed text lands in your clipboard. Paste it into the standard Agentforce panel for a fluid AI demo entry. (No real Agentforce integration — the UI fakes the gesture.)",
          "surfaces": [
            "HomePage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrContactCard",
          "name": "Contact Card",
          "tagline": "Visual contact card with animated waves, avatar, address, configurable gauges and optional Einstein prompt summary.",
          "chips": [
            "Wow-effect animated waves",
            "Optional Einstein summary",
            "Up to 3 gauges",
            "Inline avatar upload"
          ],
          "keyProps": [
            "Up to 3 gauges (label, field, icon, lower/higher-better semantics)",
            "Image · URL field OR click-to-upload File",
            "Customer ID line (toggle + field)",
            "Animated wave colors / theme accent",
            "Einstein prompt summary · default `einstein_gpt__summarizeContact` (the SDO-shipped template, not a true Salesforce standard)"
          ],
          "seBenefit": "Built-in \"Summarize\" button using the SDO-shipped contact-summary prompt — drop on a Contact / Case / Account page and you get an AI inline summary out of the box. Click the avatar to upload a contact photo (no schema work required).",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Contact",
            "Account",
            "Case",
            "Opportunity",
            "Order",
            "Lead"
          ],
          "apexDeps": [
            "SE_FR_ContactCardController",
            "SE_FR_ImageFileController"
          ],
          "sharedApexDeps": [
            "SE_FR_ImageFileController"
          ],
          "dataMode": "hybrid",
          "mobileReady": true,
          "originalAuthor": "Charly Ansel"
        },
        {
          "apiName": "seFrPromptLauncher",
          "name": "Prompt Launcher",
          "tagline": "Configurable AI panel running Salesforce Prompt Templates via Invocable Actions, with auto-filled record context.",
          "chips": [
            "Pill switcher per prompt",
            "Auto-fills record context",
            "Save as Note",
            "HTML-formatted output"
          ],
          "keyProps": [
            "`promptsJson` · catalogue (apiName, label, icon, objects[], userInputs[], extraInputs)",
            "Auto record-type filtering (Account → Account summary, Home → free-text prompts)",
            "Auto-detect HTML / Markdown response · dynamic height",
            "`autoRunFirstPrompt` · trigger AI on page load",
            "`resultAccent` · blue / purple / green · `maxHeight` · optional cap",
            "`namedCredential` · default `Agentforce_API`"
          ],
          "seBenefit": "Default catalogue covers Account / Contact / Opportunity / Lead / Case summaries + free-text Summarize/Refine — drop on any record page, the right prompt shows up automatically. Save as Note attaches the AI output to the record in one click.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_PromptLauncherController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrSmartRecommendations",
          "name": "Smart Recommendations",
          "tagline": "Context-aware Next Best Action panel with 1-6 recommendations, relevance score and per-card overrides.",
          "chips": [
            "Context-aware per object",
            "Relevance score badge",
            "Inline title & reason override"
          ],
          "keyProps": [
            "Recommendations CSV (label + reason + icon)",
            "Einstein prompt template (optional)"
          ],
          "seBenefit": "Default narratives are tuned for SDO-style sales scenarios. Plug an Einstein prompt template to flip the same UI into a real AI demo without rewiring the layout.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account",
            "Contact",
            "Case",
            "Order"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        }
      ]
    },
    {
      "category": "Dashboards & KPIs",
      "lede": "At-a-glance metric tiles, KPI grids, persona Home Pages.",
      "components": [
        {
          "apiName": "seFrFieldRepHome",
          "name": "Field Sales - Rep Home",
          "tagline": "Field Sales rep home page with greeting, KPIs, priority accounts, hot leads, product penetration and campaign calendar.",
          "chips": [
            "Dynamic priority accounts",
            "Hot leads table",
            "Product-penetration bars",
            "Campaign calendar"
          ],
          "keyProps": [
            "Number of tasks / events shown",
            "KPI tiles (label, value, target)",
            "Quick action links"
          ],
          "seBenefit": "One Home page with all the field-sales context preloaded — no need to assemble 5 components on a custom App Page.",
          "surfaces": [
            "AppPage",
            "HomePage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_FieldSalesController"
          ],
          "sharedApexDeps": [],
          "dataMode": "hybrid",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrKpiLauncher",
          "name": "KPI Launcher",
          "tagline": "Configurable grid of 3-6 clickable KPI tiles with icon, value, color and link, ready out of the box.",
          "chips": [
            "3 to 6 tiles",
            "Color-invert hover",
            "Internal & external links"
          ],
          "keyProps": [
            "Up to 8 tiles (label, value, trend %, target URL)",
            "Color accent per tile",
            "Layout (grid / horizontal)"
          ],
          "seBenefit": "Most-tunable component in the library (40+ properties). Click-through targets let you stage navigation flows during a demo without writing a Flow or App Builder action.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrMetricTile",
          "name": "Metric Tile",
          "tagline": "Single-metric tile with 4 chart styles (line / area / bar / mini-donut), comparison series, target line and currency formatting.",
          "chips": [
            "4 chart styles",
            "Forecast-vs-actual dashed",
            "Target line + goal donut",
            "Pure SVG ~3 KB"
          ],
          "keyProps": [
            "`chartStyle` · line / area / bar / mini-donut",
            "`seriesJson`, `secondarySeriesJson` (forecast vs actual)",
            "`targetValue` + dashed target line + chip",
            "`currentValue` + `currencyCode` · auto Intl format",
            "`scalingMode` · auto / from-zero / fixed"
          ],
          "seBenefit": "Compact tile, dashboard-ready — set `hideCardTitle = true` to stack 4 tiles in a row aligned. Mini-donut variant is the striking \"85% to target\" demo moment without configuring a real Performance Goal.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrRevenueDashboard",
          "name": "Revenue Dashboard",
          "tagline": "3-year revenue mini-dashboard with KPI tiles and a side-by-side monthly bar chart.",
          "chips": [
            "3 years side-by-side",
            "3 KPI tiles",
            "Currency & scale options"
          ],
          "keyProps": [
            "Months back, comparison year",
            "Bucket source field, currency code"
          ],
          "seBenefit": "Built-in YoY overlay — gives the \"story\" of growth or decline visually, without configuring a real Salesforce dashboard.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [
            "Account"
          ],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrTelesalesRepHome",
          "name": "Telesales - Rep Home",
          "tagline": "Telesales rep home page with KPIs, live cases and orders tables, calls to make and 3 mini charts.",
          "chips": [
            "Live cases & orders",
            "Calls-to-make queue",
            "3 mini analytical charts"
          ],
          "keyProps": [
            "Number of calls shown",
            "KPI tiles",
            "Quick action links"
          ],
          "seBenefit": "One template for Inside Sales Home — pre-composed, no need to wire 5 components manually in App Builder.",
          "surfaces": [
            "AppPage",
            "HomePage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_TelesalesController"
          ],
          "sharedApexDeps": [],
          "dataMode": "hybrid",
          "mobileReady": false,
          "originalAuthor": "Lionel Braun"
        }
      ]
    },
    {
      "category": "Transverse",
      "lede": "Polish & transverse components reused across categories.",
      "components": [
        {
          "apiName": "seFrFilesGallery",
          "name": "Files Gallery",
          "tagline": "Visual gallery of files attached to any record with image thumbnails, doctype icons and drag-and-drop upload.",
          "chips": [
            "Image thumbs + doctype icons",
            "Drag & drop upload",
            "Click-to-preview"
          ],
          "keyProps": [
            "Max files, visible count in carousel",
            "Show / hide upload + delete buttons"
          ],
          "seBenefit": "Real image thumbnails (not just generic doctype icons) — pull product photos, brand assets, contracts. Drag-drop upload zone is custom-built (not the native `lightning-file-upload`) so the layout looks clean in narrow sidebar columns.",
          "surfaces": [
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [
            "SE_FR_FilesGalleryController"
          ],
          "sharedApexDeps": [],
          "dataMode": "live",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        },
        {
          "apiName": "seFrSplashBanner",
          "name": "Splash Banner",
          "tagline": "Welcome banner with 8 animated background styles (waves, aurora, mesh, orbs, conic, geometric, constellation, grid) in pure CSS / SVG.",
          "chips": [
            "8 animated styles",
            "Pure CSS / SVG",
            "Respects reduced-motion"
          ],
          "keyProps": [
            "Title, subtitle, text size, alignment",
            "Background style (8 options)",
            "3 colors (primary / secondary / tertiary)",
            "Height, animation speed",
            "Optional CTA button"
          ],
          "seBenefit": "8 distinct visual moods — pick \"Constellation\" or \"Conic\" for AI demos, \"Waves\" for sober customer-success vibes, \"Aurora\" for premium / luxury. No images / static resources to upload.",
          "surfaces": [
            "AppPage",
            "HomePage",
            "RecordPage"
          ],
          "objects": [],
          "apexDeps": [],
          "sharedApexDeps": [],
          "dataMode": "mock",
          "mobileReady": true,
          "originalAuthor": "Lionel Braun"
        }
      ]
    }
  ]
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================
function generateDeck() {
    var deck = buildDeckArray();
    var presentation = SlidesApp.create('SE FR Component Library — Draft');
    var firstSlide = presentation.getSlides()[0];
    if (firstSlide) firstSlide.remove();

    deck.forEach(function(s) {
        var layout = SlidesApp.PredefinedLayout.TITLE_AND_BODY;
        var slide = presentation.appendSlide(layout);
        var title = slide.getPlaceholder(SlidesApp.PlaceholderType.TITLE);
        var body  = slide.getPlaceholder(SlidesApp.PlaceholderType.BODY);
        if (title) title.asShape().getText().setText(s.title || '');
        if (body)  body.asShape().getText().setText(s.body || '');
        if (s.notes) {
            var notesShape = slide.getNotesPage().getSpeakerNotesShape();
            if (notesShape) notesShape.getText().setText(s.notes);
        }
    });

    Logger.log('Done. Open: ' + presentation.getUrl());
}

// ============================================================
// BUILD THE DECK ARRAY (static slides + manifest-driven slides)
// ============================================================
function buildDeckArray() {
    var deck = [];

    // ----- Intro -----
    deck.push({
        title: 'SE FR Component Library',
        body: 'A reusable Lightning Web Components kit shared across the SE France team to speed up Salesforce demos.\n\nInternal asset · SE FR · 2026',
        notes: 'Cover slide. Apply your branded title master.'
    });

    deck.push({
        title: 'Why this library',
        body: [
            'Build demos faster.',
            'Drop a vetted component on a page, configure via App Builder, demo in minutes — not days.',
            '',
            'Stay generic.',
            'Every component is industry-neutral. Customize via properties, not by editing code.',
            '',
            'Share & contribute.',
            'One pool of components owned collectively by the SE France team.'
        ].join('\n'),
        notes: ''
    });

    deck.push({
        title: 'Design principles',
        body: [
            '· Lightning base components first — translation comes for free.',
            '· Custom strings as properties — no hardcoded customer copy.',
            '· Demo data as JSON / CSV props — swap datasets in App Builder.',
            '· Currency & locale exposed.',
            '· Standard fields first — schema-safe optional Apex enrichment.',
            '· Bilingual EN / FR via the language prop.'
        ].join('\n'),
        notes: ''
    });

    deck.push({
        title: 'Reading the deck',
        body: [
            'Each component slide carries:',
            '  · A name + API id',
            '  · One-line tagline + 3-4 SE-friendly chips',
            '  · "Configurable settings" — the props you tune in App Builder',
            '  · "SE benefit" — the demo wow moment',
            '  · Targets · Objects · Apex · Data mode · Mobile-ready badge',
            '',
            'Data mode legend:',
            '  · LIVE — reads / writes real records',
            '  · HYBRID — uses real fields if present, otherwise mock',
            '  · MOCK — 100% prop-driven, no org dependency'
        ].join('\n'),
        notes: ''
    });

    deck.push({
        title: 'Catalog',
        body: 'See the canonical component table in the README — auto-generated from the same manifest as this deck.',
        notes: ''
    });

    deck.push({
        title: 'Tech prerequisites (per component)',
        body: [
            'Most components: zero setup, deploy and drop on a page.',
            '',
            'Specific prereqs:',
            '  · seFrAgentforceHeader needs a static resource named astro_agentforce.',
            '  · seFrPromptLauncher needs a Named Credential routing to /services/data/...',
            '  · seFrOrderSummary needs at least one Order linked to the Case.',
            '  · seFrSmartRecommendations Commerce-AI variant needs a WebStoreNetwork.'
        ].join('\n'),
        notes: ''
    });

    // ----- Manifest-driven category sections -----
    MANIFEST.sections.forEach(function(sec, idx) {
        var sectionNum = (idx + 1).toString().padStart(2, '0');
        var pieces = sec.components.map(function(c) { return c.name; }).join(' · ');

        deck.push({
            title: 'SECTION ' + sectionNum + ' — ' + sec.category,
            body: sec.lede + '\n\nIncludes: ' + pieces,
            notes: ''
        });

        sec.components.forEach(function(c) {
            deck.push(componentSlide(sec.category, c));
        });
    });

    // ----- Closing -----
    deck.push({
        title: 'Get the components into your org',
        body: [
            'Three steps. Five minutes per component.',
            '',
            '1 · PICK',
            '  Browse the catalog on Drive (or GitHub when published).',
            '  Each component is a standalone zip with everything it needs.',
            '',
            '2 · DROP — three options:',
            '  SF CLI: sf project deploy start --source-dir <folder>',
            '  Claude Code / Cursor: pass the bundle to your AI assistant',
            '  Lightning Studio plugin: drag the zip in the UI',
            '',
            '3 · CONFIGURE',
            '  Place the component on the right page in App Builder.',
            '  Tune via the properties panel — no code change.',
            '  Demo-ready in minutes.'
        ].join('\n'),
        notes: ''
    });

    deck.push({
        title: 'Thanks for using the SE FR kit',
        body: [
            'Built by SE France, for SE France. Contributions and feedback welcome.',
            '',
            'CONTRIBUTE',
            'Spotted a bug, want a new component, or have an SDO use case in mind?',
            'Ping the maintainer or open an issue when the GitHub repo lands.',
            '',
            'Lionel Braun · Solution Engineering France',
            'lionel.braun@salesforce.com'
        ].join('\n'),
        notes: ''
    });

    return deck;
}

// ============================================================
// Helper: turn a component record into a content block
// ============================================================
function componentSlide(category, c) {
    var SURFACE_LABELS = {
        HomePage: 'Home Page', AppPage: 'App Page', RecordPage: 'Record Page'
    };
    var targets = c.surfaces.map(function(s) { return SURFACE_LABELS[s] || s; }).join(' · ') || '—';
    var objects = (c.objects && c.objects.length) ? c.objects.join(' · ') : 'Any';
    var apex;
    if ((c.apexDeps && c.apexDeps.length) || (c.sharedApexDeps && c.sharedApexDeps.length)) {
        var local = (c.apexDeps || []).slice();
        var shared = (c.sharedApexDeps || []).map(function(x) { return x + ' (shared)'; });
        apex = local.concat(shared).join(' + ');
    } else {
        apex = '—';
    }
    var lines = [];
    lines.push('[' + category + ']');
    lines.push('');
    lines.push(c.tagline);
    if (c.chips && c.chips.length) {
        lines.push('');
        lines.push('CHIPS · ' + c.chips.join(' · '));
    }
    lines.push('');
    lines.push('CONFIGURABLE SETTINGS');
    (c.keyProps || []).forEach(function(p) { lines.push('  · ' + p); });
    lines.push('');
    lines.push('SE BENEFIT');
    lines.push('  ' + c.seBenefit);
    lines.push('');
    lines.push('Targets · ' + targets);
    lines.push('Objects · ' + objects);
    lines.push('Apex · ' + apex);
    lines.push('Data mode · ' + c.dataMode.toUpperCase());
    if (c.mobileReady) lines.push('Mobile-ready · yes');
    if (c.originalAuthor && c.originalAuthor !== 'Lionel Braun') {
        lines.push('Original author · ' + c.originalAuthor);
    }
    return {
        title: c.name + '  [' + c.apiName + ']',
        body: lines.join('\n'),
        notes: ''
    };
}
