#!/usr/bin/env python3
"""
Contextualize LWC component instances in the CCO_FR_Showcase FlexiPages.

Each (page, component) combination gets a prop map. We walk every <componentInstance>
in each FlexiPage, read its <componentName>, and inject any missing props from the
map (we don't overwrite existing props — they were set deliberately).

This is the ONE-OFF script that encodes the pattern the future MCP server will apply
automatically ("configurer les composants intelligemment sur la showcase org").

Pattern signals the MCP server should use:
  1. FlexiPage type → HomePage / AppPage / RecordPage
  2. sObject type (from RecordPage filename or metadata)
  3. Persona suffix in the page name (FieldSales, Telesales, Marketing, Territory)
  4. Component category (dashboard, assistant, actions, data-list…)

Each component gets:
  - cardTitle + cardIcon forced (never empty)
  - at least one data/behavior prop beyond defaults
  - different values per page when the component appears on N pages
"""
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape
import re

DEPLOY = Path("/Users/lionel.braun/Documents/Internal/lwc-library/_deploy/force-app/main/default/flexipages")

# ---------------------------------------------------------------------------
# Per-page context maps. Shape: PAGE_CTX[page_file_stem][component_name] = dict of props.
# ---------------------------------------------------------------------------

PAGE_CTX = {
    # -------------------------- HOME -------------------------------------
    "CCO_FR_Showcase_Home": {
        "seFrMetricTile": {
            "cardTitle": "Pipeline pondéré FY27",
            "cardIcon": "standard:performance",
            "metricLabel": "Pipeline Q4",
            "currentValue": "2 480 000 €",
            "currencyCode": "EUR",
            "chartStyle": "area",
            "seriesJson": "[180,210,245,290,310,340,380,420,445,465,480,495]",
            "targetValue": "500",
            "showTargetLabel": "true",
            "accentColor": "#0176d3",
            "trendDisplay": "arrow",
            "trendPositive": "true",
            "enableTooltip": "true",
        },
        "seFrMyEvents": {
            "cardTitle": "Agenda 7 jours",
            "cardIcon": "standard:event",
            "daysAhead": "7",
            "maxEvents": "8",
            "startHour": "8",
            "endHour": "19",
            "localeTag": "fr-FR",
        },
        "seFrMyTasks": {
            "cardTitle": "Mes tâches",
            "cardIcon": "standard:task",
            "defaultFilter": "Today",
            "maxTasks": "6",
            "filterOptionsCsv": "Today,Overdue,Mine,Upcoming,Completed",
            "localeTag": "fr-FR",
        },
        "seFrPromptLauncher": {
            "cardTitle": "Agentforce — Assistant commercial",
            "cardIcon": "standard:einstein",
            "agentDisplayName": "CCO FR Copilot",
            "inputPlaceholder": "Pose une question à Agentforce (comptes, oppty, visites)…",
        },
        "seFrSubscribersList": {
            "cardTitle": "Équipe CCO FR",
            "cardSubtitle": "Abonnés aux comptes stratégiques",
            "cardIcon": "standard:user_role",
        },
        "seFrTimelinePhases": {
            "cardTitle": "Jalons FY27",
            "cardIcon": "standard:timesheet",
        },
        "seFrEngagementHistory": {
            "cardTitle": "Timeline d'engagement global",
            "cardIcon": "standard:task",
            "showSearch": "true",
        },
        "seFrActiveSegments": {
            "cardTitle": "Segments Data Cloud actifs",
            "cardIcon": "standard:groups",
        },
        "seFrAgentforceHeader": {},  # intentional — minimal props by design
        "seFrKpiLauncher": {
            "cardTitle": "KPI commerciaux",
            "cardIcon": "standard:dashboard",
        },
    },
    # -------------------------- FIELD SALES ------------------------------
    "CCO_FR_Showcase_FieldSales_Home": {
        "seFrFieldRepHome": {
            "greetingTemplate": "Bonne tournée {name} 👋",
            "highlightColor": "#003DA5",
            "accountLimit": "6",
            "leadLimit": "4",
        },
        "seFrNearbyAccountsMap": {
            "cardTitle": "Comptes à proximité",
            "listSubtitle": "Tournée du jour — triée par distance",
            "limitCount": "15",
            "originMode": "device",
            "zoomLevel": "11",
            "priorityFirstMarker": "true",
        },
        "seFrMyEvents": {
            "cardTitle": "Tournée du jour",
            "cardIcon": "standard:location",
            "typesFilterCsv": "Visit,Meeting,Call",
            "daysAhead": "1",
            "maxEvents": "12",
            "startHour": "7",
            "endHour": "19",
            "localeTag": "fr-FR",
        },
        "seFrMyTasks": {
            "cardTitle": "À faire sur le terrain",
            "cardIcon": "standard:task",
            "defaultFilter": "Today",
            "maxTasks": "8",
            "localeTag": "fr-FR",
        },
    },
    # -------------------------- TELESALES --------------------------------
    "CCO_FR_Showcase_Telesales_Home": {
        "seFrTelesalesRepHome": {
            "greetingTemplate": "Prêt à décrocher {name} 📞",
            "highlightColor": "#003DA5",
            "caseLimit": "10",
            "orderLimit": "8",
            "callsLimit": "20",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrKanbanBoard": {
            "cardTitle": "Cases entrants — à traiter",
            "cardIcon": "standard:kanban",
        },
        "seFrMyTasks": {
            "cardTitle": "Rappels & relances",
            "cardIcon": "standard:call",
            "defaultFilter": "Today",
            "maxTasks": "10",
            "localeTag": "fr-FR",
        },
        "seFrKpiLauncher": {
            "cardTitle": "KPI Télévente",
            "cardIcon": "standard:call",
        },
    },
    # -------------------------- TERRITORY --------------------------------
    "CCO_FR_Showcase_Territory_Pipeline": {
        "seFrTerritoryMap": {
            "cardTitle": "Carte du territoire France",
            "limitCount": "100",
            "currencyCode": "EUR",
            "mapHeight": "500",
            "filtersOpenByDefault": "true",
        },
        "seFrKanbanBoard": {
            "cardTitle": "Pipeline par stage",
            "cardIcon": "standard:kanban",
        },
    },
    # -------------------------- MARKETING --------------------------------
    "CCO_FR_Showcase_Marketing": {
        "seFrEngagementHistory": {
            "cardTitle": "Timeline d'engagement multicanal",
            "cardIcon": "standard:task",
            "showSearch": "true",
        },
        "seFrActiveSegments": {
            "cardTitle": "Segments actifs — Campagnes Été 2026",
            "cardIcon": "standard:groups",
            "segmentsCsv": "VIP Premium,Nouveaux clients,B2B Grossistes,Lookalike VIP,Dormants 90j,Fidèles CA>10k€",
            "colorMode": "custom",
            "customColorsCsv": "#a445ff,#30a46c,#0176d3,#f59e0b,#ef4444,#ff6ec7",
        },
        "seFrAlertsRibbon": {
            "visualStyle": "card",
            "alertVariant": "banner",
            "cardTitle": "Alertes Marketing",
            "cardIcon": "utility:announcement",
        },
        "seFrKpiLauncher": {
            "cardTitle": "KPI Marketing",
            "cardIcon": "standard:dashboard",
        },
    },
    # -------------------------- ACCOUNT (record) -------------------------
    "CCO_FR_Showcase_Account": {
        "seFrRecordHighlights": {
            "maxQuickActions": "4",
        },
        "seFrAlertsRibbon": {
            "visualStyle": "inline",
            "density": "comfortable",
        },
        "seFrActiveSegments": {
            "cardTitle": "Segments du compte",
            "cardIcon": "standard:groups",
            "colorMode": "custom",
            "customColorsCsv": "#0176d3,#a445ff,#30a46c",
        },
        "seFrAccountStrategyPlan": {
            "cardTitle": "Plan stratégique compte",
            "cardIcon": "standard:dashboard",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrPipelineSnapshot": {
            "cardTitle": "Pipeline ouvert du compte",
            "cardIcon": "standard:opportunity",
            "limitCount": "10",
            "includeClosed": "false",
            "hideNewOppButton": "false",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrRevenueDashboard": {
            "cardTitle": "CA sur 3 ans",
            "cardIcon": "standard:dashboard",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrCustomerSalesSummary": {
            "cardTitle": "Synthèse commerciale",
            "cardIcon": "standard:article",
        },
        "seFrCustomerOrders": {
            "cardTitle": "Commandes du compte (12 mois)",
            "cardIcon": "standard:note",
            "historyLimit": "12",
            "defaultSort": "EffectiveDate DESC",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrOrderEntry": {
            "cardTitle": "Prise de commande rapide",
            "cardIcon": "standard:currency",
            "recordLimit": "200",
            "currencyCode": "EUR",
            "currencySymbol": "€",
            "localeTag": "fr-FR",
        },
        "seFrContactsCarousel": {
            "cardTitle": "Contacts clés du compte",
            "cardIcon": "standard:user_role",
            "limitCount": "12",
            "visibleCount": "4",
            "orderBy": "LastActivityDate DESC NULLS LAST",
        },
        "seFrActivityFeed": {
            "cardTitle": "Dernières activités compte",
            "cardIcon": "standard:task",
            "defaultDaysBack": "90",
            "defaultDaysForward": "14",
            "initialLimit": "10",
            "expandedByDefault": "true",
        },
        "seFrEngagementHistory": {
            "cardTitle": "Historique d'engagement compte",
            "cardIcon": "standard:task",
            "showSearch": "true",
        },
        "seFrServiceContracts": {
            "cardTitle": "Contrats de service actifs",
            "cardIcon": "standard:service_contract",
        },
        "seFrFilesGallery": {
            "cardTitle": "Documents du compte",
            "cardIcon": "standard:note",
            "limitCount": "24",
            "visibleCount": "6",
        },
        "seFrTimelinePhases": {
            "cardTitle": "Cycle commercial compte",
            "cardIcon": "standard:timesheet",
        },
        "seFrRecordActions": {
            "cardTitle": "Actions compte",
            "primaryActionLabel": "Démarrer visite",
            "primaryActionIcon": "utility:routing_offline",
        },
        "seFrAccountHealth": {
            "cardTitle": "Santé du compte",
            "cardIcon": "standard:approval",
            "revenueThreshold": "50000",
            "inactivityThresholdDays": "60",
            "staleVisitThresholdDays": "30",
        },
        "seFrMetricTile": {
            "cardTitle": "CA 12 mois",
            "cardIcon": "standard:performance",
            "currencyCode": "EUR",
            "currentValue": "128 400 €",
            "chartStyle": "bar",
            "accentColor": "#003DA5",
            "trendDisplay": "arrow",
            "trendPositive": "true",
            "seriesJson": "[7800,9200,11400,10800,12600,11900,10200,13400,14100,12800,13900,10400]",
            "enableTooltip": "true",
        },
        "seFrSmartRecommendations": {
            "cardTitle": "Recommandations IA — Compte",
            "displayMode": "Global",
            "globalTitle1": "Planifier une visite",
            "globalDesc1": "Pas de visite terrain depuis 45 jours. Account manager : relance.",
            "globalBtn1": "Planifier",
            "globalTitle2": "Up-sell Premium",
            "globalDesc2": "CA en hausse +18% sur Q4 vs Q3 — proposer la gamme Premium.",
            "globalBtn2": "Préparer offre",
            "globalTitle3": "Risque churn",
            "globalDesc3": "2 cases critiques non résolus — intervention commerciale conseillée.",
            "globalBtn3": "Appeler client",
        },
        "seFrConsentManager": {
            "cardTitle": "Consentements RGPD compte",
            "cardIcon": "standard:settings",
            "channelsCsv": "Email,SMS,Phone,Postal,WhatsApp",
        },
        "seFrVoiceNoteTaker": {
            "cardTitle": "Note vocale compte",
            "cardIcon": "standard:call",
            "speechLocale": "fr-FR",
            "taskSubject": "Note vocale — Compte",
        },
        "seFrSubscribersList": {
            "cardTitle": "Équipe sur le compte",
            "cardSubtitle": "Account manager + support + SE",
            "cardIcon": "standard:user_role",
        },
        "seFrPromptLauncher": {
            "cardTitle": "Agentforce — Account AI",
            "cardIcon": "standard:einstein",
            "agentDisplayName": "Account Copilot",
            "inputPlaceholder": "Résume le compte, propose une Next Best Action, rédige un email…",
        },
    },
    # -------------------------- CONTACT (record) -------------------------
    "CCO_FR_Showcase_Contact": {
        "seFrRecordHighlights": {
            "maxQuickActions": "3",
        },
        "seFrContactCard": {
            "cardTitle": "Fiche contact",
            "gauge1Label": "Score",
            "gauge1Icon": "utility:magicwand",
            "gauge1Direction": "higher-better",
            "gauge2Label": "Last activity",
            "gauge2FieldApiName": "LastActivityDate",
            "gauge2Icon": "utility:event",
            "gauge2Direction": "higher-better",
            "gauge3Label": "Opt-in Email",
            "gauge3FieldApiName": "HasOptedOutOfEmail",
            "gauge3Icon": "utility:email",
            "gauge3Direction": "higher-better",
            "showCustomerId": "true",
            "promptButtonLabel": "Résumer avec Agentforce",
        },
        "seFrRelatedRecordCard": {
            "target": "account",
            "cardTitle": "Compte lié",
            "cardIcon": "standard:account",
            "fieldsCsv": "Industry,AnnualRevenue,Phone,BillingCity",
        },
        "seFrCustomerSalesSummary": {
            "cardTitle": "Résumé commercial contact",
            "cardIcon": "standard:article",
        },
        "seFrActivityFeed": {
            "cardTitle": "Activités du contact",
            "cardIcon": "standard:task",
            "defaultDaysBack": "60",
            "initialLimit": "10",
        },
        "seFrEngagementHistory": {
            "cardTitle": "Timeline d'engagement contact",
            "cardIcon": "standard:task",
            "showSearch": "true",
        },
        "seFrCustomerOrders": {
            "cardTitle": "Commandes passées par ce contact",
            "cardIcon": "standard:note",
            "historyLimit": "8",
            "defaultSort": "EffectiveDate DESC",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrConsentManager": {
            "cardTitle": "Préférences de communication",
            "cardIcon": "standard:settings",
            "channelsCsv": "Email,SMS,WhatsApp,Phone",
        },
        "seFrFilesGallery": {
            "cardTitle": "Documents partagés",
            "cardIcon": "standard:note",
            "limitCount": "12",
            "visibleCount": "4",
        },
        "seFrRecordActions": {
            "cardTitle": "Actions contact",
            "primaryActionLabel": "Nouvel email",
            "primaryActionIcon": "utility:email",
        },
        "seFrActiveSegments": {
            "cardTitle": "Segments du contact",
            "cardIcon": "standard:groups",
            "colorMode": "custom",
            "customColorsCsv": "#0176d3,#a445ff,#30a46c,#f59e0b",
        },
        "seFrSmartRecommendations": {
            "cardTitle": "Recommandations contact",
            "displayMode": "Global",
            "globalTitle1": "Approche personnalisée",
            "globalDesc1": "Dernière interaction >30 jours. Email de reprise de contact ?",
            "globalBtn1": "Rédiger email",
            "globalTitle2": "Enrichir le profil",
            "globalDesc2": "Fonction et préférences manquantes.",
            "globalBtn2": "Compléter",
        },
        "seFrVoiceNoteTaker": {
            "cardTitle": "Note vocale contact",
            "speechLocale": "fr-FR",
            "taskSubject": "Note vocale — Contact",
        },
        "seFrPromptLauncher": {
            "cardTitle": "Agentforce — Contact AI",
            "cardIcon": "standard:einstein",
            "agentDisplayName": "Contact Copilot",
            "inputPlaceholder": "Rédige un email d'approche, résume l'historique…",
        },
    },
    # -------------------------- OPPORTUNITY (record) ---------------------
    "CCO_FR_Showcase_Opportunity": {
        "seFrRecordHighlights": {
            "maxQuickActions": "3",
        },
        "seFrPipelineSnapshot": {
            "cardTitle": "Autres Opps du compte",
            "cardIcon": "standard:opportunity",
            "limitCount": "8",
            "includeClosed": "false",
            "currencyCode": "EUR",
            "localeTag": "fr-FR",
        },
        "seFrContactCard": {
            "cardTitle": "Décideur principal",
            "gauge1Label": "Score",
            "gauge1Icon": "utility:magicwand",
            "gauge2Label": "Last touch",
            "gauge2FieldApiName": "LastActivityDate",
            "gauge2Icon": "utility:event",
            "showCustomerId": "true",
            "promptButtonLabel": "Résumer avec IA",
        },
        "seFrTimelinePhases": {
            "cardTitle": "Cycle de vente",
            "cardIcon": "standard:timesheet",
        },
        "seFrServiceContracts": {
            "cardTitle": "Contrats liés",
            "cardIcon": "standard:service_contract",
        },
        "seFrRecordActions": {
            "cardTitle": "Actions opportunité",
            "primaryActionLabel": "Programmer closing",
            "primaryActionIcon": "utility:money",
        },
        "seFrSmartRecommendations": {
            "cardTitle": "Recommandations IA — Opp",
            "displayMode": "Global",
            "globalTitle1": "Avancer en Stage 4",
            "globalDesc1": "Discovery complète — demander proposition formelle.",
            "globalBtn1": "Promouvoir",
            "globalTitle2": "Préparer soutenance",
            "globalDesc2": "Décideur principal non rencontré. Planifier rendez-vous.",
            "globalBtn2": "Planifier",
            "globalTitle3": "Pricing agressif",
            "globalDesc3": "Concurrent cité par le prospect — proposer discount tier.",
            "globalBtn3": "Demander approbation",
        },
        "seFrRelatedRecordCard": {
            "target": "auto",
            "cardTitle": "Compte",
            "fieldsCsv": "Industry,AnnualRevenue,Phone",
        },
        "seFrVoiceNoteTaker": {
            "cardTitle": "Note vocale Opp",
            "speechLocale": "fr-FR",
            "taskSubject": "Note vocale — Opportunity",
        },
        "seFrSubscribersList": {
            "cardTitle": "Équipe Opp",
            "cardSubtitle": "AE + SE + support",
            "cardIcon": "standard:user_role",
        },
    },
    # -------------------------- CASE (record) ----------------------------
    "CCO_FR_Showcase_Case": {
        "seFrRecordHighlights": {
            "maxQuickActions": "3",
        },
        "seFrContactCard": {
            "cardTitle": "Client",
            "gauge1Label": "Historique",
            "gauge1FieldApiName": "LastActivityDate",
            "gauge1Icon": "utility:event",
            "gauge2Label": "VIP",
            "gauge2Icon": "utility:magicwand",
            "showCustomerId": "true",
        },
        "seFrOrderSummary": {
            "cardTitle": "Commande concernée",
            "cardIcon": "standard:note",
            "currencyCode": "EUR",
        },
        "seFrOrderEntry": {
            "cardTitle": "Prise de commande (geste commercial)",
            "cardIcon": "standard:currency",
            "recordLimit": "100",
            "currencyCode": "EUR",
            "currencySymbol": "€",
        },
        "seFrTimelinePhases": {
            "cardTitle": "Progression du case",
            "cardIcon": "standard:timesheet",
            "scope": "case",
        },
        "seFrServiceContracts": {
            "cardTitle": "Contrats service client",
            "cardIcon": "standard:service_contract",
        },
        "seFrRecordActions": {
            "cardTitle": "Actions case",
            "primaryActionLabel": "Escalader",
            "primaryActionIcon": "utility:warning",
        },
        "seFrRelatedRecordCard": {
            "target": "auto",
            "cardTitle": "Compte client",
            "fieldsCsv": "Industry,Type,Phone",
        },
        "seFrSmartRecommendations": {
            "cardTitle": "Pistes de résolution",
            "displayMode": "Global",
            "globalTitle1": "Vérifier SLA",
            "globalDesc1": "SLA expire dans <24h — escalader au manager.",
            "globalBtn1": "Escalader",
            "globalTitle2": "Article Knowledge",
            "globalDesc2": "3 articles pertinents trouvés sur ce symptôme.",
            "globalBtn2": "Insérer réponse",
            "globalTitle3": "Geste commercial",
            "globalDesc3": "Client VIP — avoir prévu dans la grille.",
            "globalBtn3": "Proposer",
        },
        "seFrPromptLauncher": {
            "cardTitle": "Agentforce — Service AI",
            "cardIcon": "standard:einstein",
            "agentDisplayName": "Service Copilot",
            "inputPlaceholder": "Rédige une réponse client, propose une résolution…",
        },
    },
    # -------------------------- LEAD (record) ----------------------------
    "CCO_FR_Showcase_Lead": {
        "seFrRecordHighlights": {
            "maxQuickActions": "3",
        },
        "seFrContactCard": {
            "cardTitle": "Lead",
            "gauge1Label": "Rating",
            "gauge1FieldApiName": "Rating",
            "gauge1Icon": "utility:magicwand",
            "gauge2Label": "Source",
            "gauge2FieldApiName": "LeadSource",
            "gauge2Icon": "utility:info_alt",
            "gauge3Label": "Status",
            "gauge3FieldApiName": "Status",
            "gauge3Icon": "utility:refresh",
            "showCustomerId": "true",
        },
        "seFrEngagementHistory": {
            "cardTitle": "Timeline d'engagement lead",
            "cardIcon": "standard:task",
            "showSearch": "true",
        },
        "seFrConsentManager": {
            "cardTitle": "Opt-in Lead",
            "cardIcon": "standard:settings",
            "channelsCsv": "Email,SMS,Phone",
        },
        "seFrActiveSegments": {
            "cardTitle": "Segments source",
            "cardIcon": "standard:groups",
            "colorMode": "custom",
            "customColorsCsv": "#0176d3,#f59e0b,#30a46c",
        },
        "seFrRecordActions": {
            "cardTitle": "Actions Lead",
            "primaryActionLabel": "Qualifier",
            "primaryActionIcon": "utility:approval",
        },
        "seFrSmartRecommendations": {
            "cardTitle": "Qualifier ce lead",
            "displayMode": "Global",
            "globalTitle1": "Qualifier sous 24h",
            "globalDesc1": "Lead chaud non contacté — priorité absolue.",
            "globalBtn1": "Appeler",
            "globalTitle2": "Enrichir le profil",
            "globalDesc2": "LinkedIn / web clay enrichissement disponible.",
            "globalBtn2": "Enrichir",
            "globalTitle3": "Convertir",
            "globalDesc3": "Lead Hot + budget confirmé — convertir en Opp.",
            "globalBtn3": "Convertir",
        },
        "seFrVoiceNoteTaker": {
            "cardTitle": "Note qualif",
            "speechLocale": "fr-FR",
            "taskSubject": "Note qualif — Lead",
        },
    },
    # -------------------------- ORDER (record) ---------------------------
    "CCO_FR_Showcase_Order": {
        "seFrRecordHighlights": {
            "maxQuickActions": "3",
        },
        "seFrContactCard": {
            "cardTitle": "Client commande",
            "gauge1Label": "Last activity",
            "gauge1FieldApiName": "LastActivityDate",
            "gauge1Icon": "utility:event",
            "showCustomerId": "true",
        },
        "seFrRelatedRecordCard": {
            "target": "auto",
            "cardTitle": "Compte client",
            "fieldsCsv": "Industry,BillingCity,Phone",
        },
        "seFrSmartRecommendations": {
            "cardTitle": "Suivi commande",
            "displayMode": "Global",
            "globalTitle1": "Confirmer livraison",
            "globalDesc1": "Livraison prévue J-2 — appeler le transporteur.",
            "globalBtn1": "Appeler",
            "globalTitle2": "Up-sell récurrent",
            "globalDesc2": "Client récurrent — proposer abonnement.",
            "globalBtn2": "Proposer",
        },
    },
    # -------------------------- VISIT (record) ---------------------------
    "CCO_FR_Showcase_Visit": {
        "seFrRecordHighlights": {
            "maxQuickActions": "3",
        },
        "seFrFilesGallery": {
            "cardTitle": "Photos de visite",
            "cardIcon": "standard:file",
            "limitCount": "20",
            "visibleCount": "6",
        },
    },
}


# ---------------------------------------------------------------------------
# XML patcher
# ---------------------------------------------------------------------------

PROP_BLOCK = """                <componentInstanceProperties>
                    <name>{name}</name>
                    <value>{value}</value>
                </componentInstanceProperties>
"""

# Match a <componentInstance>…</componentInstance> block (non-greedy, single-line DOTALL).
COMP_INSTANCE_RX = re.compile(r"<componentInstance>(.*?)</componentInstance>", re.DOTALL)
COMP_NAME_RX = re.compile(r"<componentName>([^<]+)</componentName>")
PROP_NAME_RX = re.compile(r"<componentInstanceProperties>\s*<name>([^<]+)</name>", re.DOTALL)


def patch_component_instance(block_body: str, ctx: dict) -> tuple[str, list[str]]:
    """Return (new_block_body, added_prop_names)."""
    comp_m = COMP_NAME_RX.search(block_body)
    if not comp_m:
        return block_body, []
    comp_name = comp_m.group(1)
    comp_props = ctx.get(comp_name)
    if not comp_props:
        return block_body, []

    existing = set(PROP_NAME_RX.findall(block_body))
    to_add = [(k, v) for k, v in comp_props.items() if k not in existing]
    if not to_add:
        return block_body, []

    # Insert new props right before <componentName>.
    insert_point = comp_m.start()
    new_props_xml = "".join(
        PROP_BLOCK.format(name=xml_escape(k), value=xml_escape(str(v)))
        for k, v in to_add
    )
    new_body = block_body[:insert_point] + new_props_xml + block_body[insert_point:]
    return new_body, [k for k, _ in to_add]


def patch_file(path: Path, ctx: dict) -> dict:
    content = path.read_text()
    added = {}

    def repl(m):
        body = m.group(1)
        new_body, added_names = patch_component_instance(body, ctx)
        if added_names:
            comp = COMP_NAME_RX.search(body).group(1)
            added.setdefault(comp, []).extend(added_names)
        return "<componentInstance>" + new_body + "</componentInstance>"

    new_content = COMP_INSTANCE_RX.sub(repl, content)
    if new_content != content:
        path.write_text(new_content)
    return added


def main():
    total_pages = 0
    total_props = 0
    for page_stem, ctx in PAGE_CTX.items():
        path = DEPLOY / f"{page_stem}.flexipage-meta.xml"
        if not path.exists():
            print(f"⚠️  {page_stem}: file not found, skipped")
            continue
        added = patch_file(path, ctx)
        if added:
            total_pages += 1
            page_added = sum(len(v) for v in added.values())
            total_props += page_added
            print(f"\n📄 {page_stem}  (+{page_added} props)")
            for comp, props in sorted(added.items()):
                print(f"   • {comp}: {', '.join(props)}")
        else:
            print(f"\n📄 {page_stem}: already contextualized ✓")
    print(f"\n═════ TOTAL: {total_props} props added across {total_pages} pages ═════")


if __name__ == "__main__":
    main()
