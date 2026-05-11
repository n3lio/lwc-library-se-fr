#!/usr/bin/env python3
"""One-shot helper: produce manifest.fr.json from manifest.json by
applying hand-written French translations. No API call.

Run once, the output is stable and the site auto-detects manifest.fr.json.
Re-run after changing TRANSLATIONS below or after manifest.json content
changed (the script picks up the latest EN technical fields and only
overrides the editorial ones).
"""

from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_EN = ROOT / "_build" / "manifest.json"
MANIFEST_FR = ROOT / "_build" / "manifest.fr.json"


# Fields translated per component: tagline, chips, keyProps, seBenefit,
# description. Anything not in TRANSLATIONS keeps its EN value.
TRANSLATIONS: dict[str, dict] = {
    "seFrAccountHealth": {
        "tagline": "Score quantitatif de santé du compte (0-100) avec verdict et signaux pondérés positifs / négatifs.",
        "seBenefit": "Lit les champs Cust360 standards de la SDO par défaut (churn risk, sentiment, NPS). Sur les orgs sans ces champs, bascule sur des signaux mockés — jamais de crash, toujours prêt pour la démo.",
        "chips": ["Jauge donut SVG", "Signaux pondérés +/-", "Drill-down explicatif"],
        "keyProps": ["Champ score, champs signaux (CSV)", "Seuils de couleur", "Override du titre de carte"],
        "description": "B2B - Jauge quantitative de santé du compte (0-100) avec donut SVG, niveau de verdict (Excellent / Healthy / Watch / At risk / Critical) et la liste des signaux pondérés utilisés dans le calcul.",
    },
    "seFrAccountStrategyPlan": {
        "tagline": "Plan de compte narratif avec KPIs éditables, jauge d'objectif, SWOT 2x2 et plan d'actions trimestriel.",
        "seBenefit": "Éditable inline depuis la page — sans écriture record. Visuel idéal pour les moments « compte stratégique » en démo, même sur des orgs vides.",
        "chips": ["Édition inline de chaque bloc", "SWOT 2x2 narratif", "Plan d'actions trimestriel"],
        "keyProps": ["Labels de section et contenu par défaut", "Override de l'avatar owner"],
        "description": "B2B - Plan de compte narratif : KPIs, progression vers l'objectif, SWOT 2x2, plan d'actions, notes stratégiques. Bilingue EN / FR.",
    },
    "seFrActiveSegments": {
        "tagline": "Panneau compact affichant les segments Marketing / Data Cloud auxquels appartient le record, sous forme de badges colorés.",
        "seBenefit": "Pose un ton « marketing-aware » sur une page Contact sans nécessiter de connexion Data Cloud — storytelling piloté par les props.",
        "chips": ["Compteur de segments dans le titre", "Badges colorés", "Record / App / Home page"],
        "keyProps": ["Jusqu'à 6 slots de segments (label, taille de l'audience, dernière mise à jour)"],
        "description": "B2B / B2C - Liste configurable de segments Data Cloud / Marketing, rendus en badges. Le titre de la carte affiche automatiquement le compteur de segments.",
    },
    "seFrActivityFeed": {
        "tagline": "Timeline d'activité unifiée agrégeant 16+ types de records Salesforce dans un seul flux avec filtrage avancé.",
        "seBenefit": "Tire depuis `Task`, `Event`, `EmailMessage`, `VoiceCall`, `MessagingSession`, `LiveChatTranscript`, `Order`, `Case`, `Opportunity`, `Quote`, `Contract`, `Visit`, `ContentDocumentLink`, `FeedItem`, `SurveyResponse` — et utilise les dates métier (CloseDate, EffectiveDate, StartDate) plutôt que CreatedDate.",
        "chips": ["16+ types de records unifiés", "Filtres riches + expand", "Isolation d'erreur par source"],
        "keyProps": ["Fenêtre jours en arrière / en avant", "Inclure les Contacts liés", "Types d'objets affichés"],
        "description": "Timeline d'activité agrégée affichant Tasks, Events, emails, SMS/Web, appels, sessions de messaging, chats, Orders, Cases, Opportunities, Quotes, Contracts, Visits, fichiers, posts Chatter et réponses Survey pour un Account ou Contact.",
    },
    "seFrAgentforceHeader": {
        "tagline": "Header de Home page avec Astro et une barre de recherche / dictée qui transmet les questions au panneau Agentforce.",
        "seBenefit": "Speech-to-text via l'API navigateur — dictez une question, cliquez « Send », le texte transcrit atterrit dans votre presse-papiers. Collez-le dans le panneau Agentforce standard pour une entrée fluide en démo IA. (Pas de vraie intégration Agentforce — l'UI mime le geste.)",
        "chips": ["Header flottant avec Astro", "Dictée vocale", "Déclenche le panneau Agentforce"],
        "keyProps": ["Titre / sous-titre", "Label CTA + URL", "Toggle d'animation Astro"],
        "description": "Bannière de salutation Home page avec mascotte Astro, champ de dictée vocale et bouton d'envoi. {name} est remplacé par le prénom de l'utilisateur courant. Bilingue FR / EN.",
    },
    "seFrAlertsRibbon": {
        "tagline": "Bandeau d'alertes configurable combinant règles déclaratives basées sur le record et bannières statiques toujours visibles.",
        "seBenefit": "Le mode rule-driven évalue un mini-DSL contre les champs du record courant (« AnnualRevenue<500000|warning|… ») — posez sur n'importe quelle record page, la bonne alerte apparaît sur le bon compte, sans code.",
        "chips": ["Rule-driven + statiques", "3 variantes visuelles", "Sticky-on-scroll"],
        "keyProps": [
            "`rulesCsv` · règles basées sur les champs (Record Page uniquement)",
            "`staticAlertsCsv` · alertes toujours visibles (toutes pages)",
            "`visualStyle` · inline / card",
            "`alertVariant` · banner / solid / minimal",
            "`density` · comfortable / compact",
            "`stickyOnScroll`",
        ],
        "description": "Bandeau d'alertes configurable. Deux sources : alertes basées sur des règles évaluées contre le record courant (Record Page), et alertes statiques toujours affichées (Home / App Page). 4 sévérités, 3 variantes visuelles, 2 densités, comportement sticky-on-scroll optionnel.",
    },
    "seFrConsentManager": {
        "tagline": "Panneau de consentement RGPD par canal qui lie chaque canal à un champ booléen sur le record courant.",
        "seBenefit": "Les canaux par défaut sont mappés sur des champs Salesforce standards : `HasOptedOutOfEmail`, `DoNotCall`, `HasOptedOutOfFax` (utilisé comme placeholder pour le opt-out WhatsApp). Posez sur Contact / Lead / Account → ça marche, aucun champ custom requis.",
        "chips": ["Toggles par canal", "Persistance LDS", "Champs opt-out inversés"],
        "keyProps": [
            "Channels CSV (override) · format `label|fieldApiName|inverted`",
            "Override des labels toggle / success / error",
            "Override du titre / icône de carte",
        ],
        "description": "B2B / B2C - Panneau de toggles RGPD / préférences de contact. Lit/écrit les champs opt-in/opt-out sur le record. Bilingue EN / FR.",
    },
    "seFrContactCard": {
        "tagline": "Carte Contact visuelle avec vagues animées, avatar, adresse, jauges configurables et résumé Einstein optionnel.",
        "seBenefit": "Bouton « Summarize » intégré utilisant le prompt de résumé Contact livré avec la SDO — posez sur une page Contact / Case / Account et obtenez un résumé IA inline prêt à l'emploi. Cliquez sur l'avatar pour uploader une photo de contact (sans setup de schéma).",
        "chips": ["Vagues animées effet Waouh", "Résumé Einstein optionnel", "Jusqu'à 3 jauges", "Upload d'avatar inline"],
        "keyProps": [
            "Jusqu'à 3 jauges (label, champ, icône, sémantique lower/higher-better)",
            "Image · champ URL OU upload de fichier au clic",
            "Ligne ID client (toggle + champ)",
            "Couleurs des vagues animées / accent thématique",
            "Résumé Einstein via prompt · `einstein_gpt__summarizeContact` par défaut (le template livré avec la SDO, pas un vrai standard Salesforce)",
        ],
        "description": "B2B / B2C - Carte Contact visuelle (avatar, détails, jusqu'à 3 jauges) avec vagues animées + résumé Einstein optionnel. Auteur original : Charly Ansel.",
    },
    "seFrContactsCarousel": {
        "tagline": "Carousel horizontal des Contacts d'un Account avec avatars, badges de rôle et raccourcis Email / Call.",
        "seBenefit": "Remplacement visuel de la related list Contacts standard — bien plus parlant en démo qu'un tableau plat.",
        "chips": ["Badges de rôle Champion / DMU", "Avatar fallback initiales", "Raccourcis Email & Call"],
        "keyProps": ["Nombre de contacts visibles", "Liste des champs de carte", "Quick actions"],
        "description": "B2B - Carousel visuel des Contacts liés à un Account. Photo (ou fallback initiales), titre, badge de rôle optionnel et raccourcis Email/Call. Flèches de navigation quand il y en a plus que le nombre visible.",
    },
    "seFrCustomerOrders": {
        "tagline": "Carte détail du dernier order plus historique des commandes recherchable, triable et filtrable pour un Account ou Contact.",
        "seBenefit": "Affiche les images produit par ligne — transforme une liste plate en catalogue visuel qui rappelle un historique e-commerce. Compatible avec les champs image produit de la SDO prêt à l'emploi.",
        "chips": ["Carte détail dernier order", "Recherchable + triable", "Filtre statut + 'Voir tout'"],
        "keyProps": [
            "Nombre max de lignes",
            "Filtre par statut / plage de dates",
            "`productImageFieldApiName` · `Image_URL__c` par défaut",
        ],
        "description": "B2B / B2C - Liste les orders liés à un Account ou Contact. Le bloc du haut affiche le dernier order avec ses lignes ; le bloc du bas est un historique compact avec recherche / tri / filtre statut / Voir tout. Bilingue EN / FR.",
    },
    "seFrCustomerSalesSummary": {
        "tagline": "Synthèse des ventes orientée B2C avec tuiles KPI et répartitions par Catégorie, Marque et Magasin.",
        "seBenefit": "Le même composant couvre les scénarios B2B et B2C — détecte automatiquement Person Account vs business Account et adapte le layout.",
        "chips": ["3 KPI + 3 graphes de répartition", "Catégorie / Marque / Magasin", "Compatible Person Account"],
        "keyProps": ["Fenêtre temporelle", "Catégories affichées"],
        "description": "B2C - Synthèse des ventes au niveau client pour une page Contact / Person Account / Account. Bilingue EN / FR.",
    },
    "seFrFieldRepHome": {
        "tagline": "Home page Field Sales avec salutation, KPIs, comptes prioritaires, hot leads, pénétration produit et calendrier de campagnes.",
        "seBenefit": "Une Home page avec tout le contexte field-sales préchargé — pas besoin d'assembler 5 composants sur une App Page custom.",
        "chips": [
            "Comptes prioritaires dynamiques",
            "Table de hot leads",
            "Barres de pénétration produit",
            "Calendrier de campagnes",
        ],
        "keyProps": [
            "Nombre de tasks / events affichés",
            "Tuiles KPI (label, valeur, target)",
            "Liens d'actions rapides",
        ],
        "description": "B2B - Home / App page pour un commercial terrain. Salutation, 4 tuiles KPI, comptes prioritaires (dynamiques, filtres configurables), hot leads, barres de pénétration produit et calendrier de campagnes. Bilingue EN / FR via la propriété language.",
    },
    "seFrFilesGallery": {
        "tagline": "Galerie visuelle des fichiers attachés à un record avec thumbnails d'images, icônes par type et upload drag-and-drop.",
        "seBenefit": "Vraies miniatures d'images (pas juste des icônes génériques par type) — affichez photos produit, assets de marque, contrats. La zone d'upload drag-drop est custom (pas le `lightning-file-upload` natif), pour un layout propre dans les colonnes sidebar étroites.",
        "chips": ["Miniatures + icônes par type", "Upload drag & drop", "Click-to-preview"],
        "keyProps": [
            "Nombre max de fichiers, nombre visible dans le carousel",
            "Afficher / cacher les boutons upload + delete",
        ],
        "description": "B2B / B2C - Galerie visuelle des fichiers liés au record courant. Miniatures d'images via le rendition endpoint, icônes par type pour les autres, click pour ouvrir la preview, lien Download et upload drag-drop.",
    },
    "seFrKanbanBoard": {
        "tagline": "Kanban générique avec drag-and-drop natif sur n'importe quel SObject whitelisté (Case, Opp, Lead, Order, Task, Account).",
        "seBenefit": "Le même composant supporte 6 SObjects — posez sur une Home Page (tous mes Cases ouverts), une App Page (kanban d'équipe) ou une Record Page (Cases scopés à l'Account). Le drag-drop met à jour instantanément le champ statut.",
        "chips": ["Drag & drop des statuts", "Auto-scope sur Record Page", "Swim lanes par statut"],
        "keyProps": ["Type d'objet, champ statut", "Colonnes visibles", "Liste des champs de carte"],
        "description": "Kanban générique. N'importe quel SObject + picklist de groupement + champ d'affichage. Drag-and-drop optionnel qui met à jour le champ de groupement sur le record. Objets whitelistés : Case, Opportunity, Lead, Order, Task, Account.",
    },
    "seFrKpiLauncher": {
        "tagline": "Grille configurable de 3-6 tuiles KPI cliquables avec icône, valeur, couleur et lien, prête à l'emploi.",
        "seBenefit": "Le composant le plus tunable de la lib (40+ propriétés). Les targets cliquables vous permettent de scénariser une navigation pendant la démo sans écrire de Flow ni d'action App Builder.",
        "chips": ["3 à 6 tuiles", "Hover color-invert", "Liens internes & externes"],
        "keyProps": [
            "Jusqu'à 8 tuiles (label, valeur, tendance %, URL cible)",
            "Accent couleur par tuile",
            "Layout (grid / horizontal)",
        ],
        "description": "B2B / B2C - Grille configurable de 3 à 6 tuiles KPI cliquables. Choisissez un preset (Standard / Field Sales / Telesales / Custom) ou overridez chaque tuile individuellement. Bilingue EN / FR.",
    },
    "seFrMetricTile": {
        "tagline": "Tuile mono-métrique avec 4 styles de chart (line / area / bar / mini-donut), série de comparaison, ligne d'objectif et formatage devise.",
        "seBenefit": "Tuile compacte, prête pour les dashboards — passez `hideCardTitle = true` pour empiler 4 tuiles alignées dans une rangée. La variante mini-donut est le moment qui claque « 85% de l'objectif » sans configurer un vrai Performance Goal.",
        "chips": ["4 styles de chart", "Forecast vs réel en pointillés", "Ligne d'objectif + donut goal", "SVG pur ~3 KB"],
        "keyProps": [
            "`chartStyle` · line / area / bar / mini-donut",
            "`seriesJson`, `secondarySeriesJson` (forecast vs réel)",
            "`targetValue` + ligne d'objectif en pointillés + chip",
            "`currentValue` + `currencyCode` · format Intl auto",
            "`scalingMode` · auto / from-zero / fixed",
        ],
        "description": "B2B / B2C - Tuile KPI avec chart de tendance inline. 4 styles (line, area, bar, mini-donut), série de comparaison optionnelle, ligne d'objectif, formatage devise. Bilingue FR / EN.",
    },
    "seFrMyEvents": {
        "tagline": "Calendrier du jour en timeline verticale compacte qui tient dans une colonne sidebar, avec gestion des chevauchements style Google Calendar.",
        "seBenefit": "Utile à la fois en Field Sales (rendez-vous du jour) et comme widget « agenda » transversal sur la Home Page de n'importe quel persona.",
        "chips": ["Chevauchement côte à côte", "Auto-trim des heures vides", "Vue compacte du jour"],
        "keyProps": [
            "Days forward",
            "Afficher / cacher participants, lieu",
            "Override du titre de carte",
        ],
        "description": "B2B / B2C - Vue timeline du jour pour une colonne sidebar. Auto-trim des heures vides, gestion des events qui se chevauchent côte à côte, ligne « now » en live, badge in-N-min, bouton Join pour les URLs de visio classiques, et liste Upcoming courte.",
    },
    "seFrMyTasks": {
        "tagline": "Panneau « My Tasks » sidebar compact groupé par date d'échéance avec complétion en un clic.",
        "seBenefit": "Même contrôleur que My Events (une seule classe Apex pour les deux) — garantit une logique de date cohérente et une maintenance partagée.",
        "chips": ["Groupé par échéance", "Complétion en un clic", "Mise en évidence des en retard"],
        "keyProps": [
            "Days back / forward",
            "Afficher / cacher la chip de priorité",
            "Override du titre de carte",
        ],
        "description": "B2B / B2C - Panneau « My Tasks » compact pour une colonne sidebar. Checkbox de complétion interactive, dropdown de filtre, regroupement automatique par En retard / Aujourd'hui / Demain / Cette semaine / Plus tard, quick actions optionnelles, et raccourci « Nouvelle tâche ».",
    },
    "seFrNearbyAccountsMap": {
        "tagline": "Carte interactive des comptes à proximité qui utilise la géolocalisation du navigateur avec tri par distance Haversine.",
        "seBenefit": "Demande de géolocalisation navigateur pour un effet Waouh en démo terrain. Fallback sur une origine fixe (Place de la Bastille) en cas de refus — la démo ne casse jamais.",
        "chips": ["Géolocalisation navigateur", "Tri par distance Haversine", "Style de pin custom"],
        "keyProps": [
            "Mode d'origine · géolocalisation auto / lat-lng manuelle",
            "Nombre max de comptes affichés, filtre RecordType",
            "Mettre en avant le premier compte comme prioritaire",
        ],
        "description": "Carte interactive affichant les comptes à proximité depuis un point d'origine configurable.",
    },
    "seFrOrderEntry": {
        "tagline": "Saisie de commande pleine grille sur un Account ou Case avec stock, quantités et remises recommandées par IA, persistées comme vrais Orders.",
        "seBenefit": "Vraies images produit dans chaque ligne (lues depuis `Product2.Image_URL__c` par défaut — fonctionne prêt à l'emploi sur SDO). Le raccourci de réassort et la visibilité du stock sont des moments visuellement forts en démo.",
        "chips": ["Quantité + remise recommandées par IA", "Total live", "Persiste un vrai Order"],
        "keyProps": [
            "Colonnes produit (code, catégorie, dernier order, stock, prix)",
            "Code et symbole de devise",
            "Valeurs par défaut du type d'order",
        ],
        "description": "",
    },
    "seFrOrderSummary": {
        "tagline": "Order le plus récent lié à un Case avec produits, total, infos de livraison et actions edit / delete / submit.",
        "seBenefit": "Récap visuel propre qu'un commercial peut lire à voix haute pendant un appel sans scroller — parfait pour le moment « je vous relis votre commande ».",
        "chips": ["Auto-résolution de l'Account", "Edit / delete / submit", "Active l'Order au submit"],
        "keyProps": [
            "Afficher / cacher les détails des lignes",
            "Affichage de la devise",
            "Label de séparateur",
        ],
        "description": "",
    },
    "seFrPipelineSnapshot": {
        "tagline": "Visualisation du pipeline au niveau Account avec tuiles de synthèse et une colonne par stage Opportunity.",
        "seBenefit": "Largeur sidebar-friendly — tient dans la colonne droite étroite sans casser. Aucun setup nécessaire : lit toutes les Opportunities ouvertes du compte.",
        "chips": ["Colonne par stage", "Tuile total pondéré", "Auto-derive depuis l'Opp"],
        "keyProps": [
            "Nombre max d'opportunities, filtre statut",
            "Afficher / cacher le total",
            "Affichage de la devise",
        ],
        "description": "B2B - Visualisation du pipeline client : Opportunities ouvertes groupées par Stage avec totaux par colonne, totaux pondérés et non-pondérés en haut.",
    },
    "seFrPromptLauncher": {
        "tagline": "Panneau IA configurable qui exécute des Salesforce Prompt Templates via Invocable Actions, avec contexte record auto-injecté.",
        "seBenefit": "Le catalogue par défaut couvre les résumés Account / Contact / Opportunity / Lead / Case + free-text Summarize/Refine — posez sur n'importe quelle record page, le bon prompt apparaît automatiquement. Save as Note attache la sortie IA au record en un clic.",
        "chips": ["Pill switcher par prompt", "Contexte record auto-injecté", "Save as Note", "Output formaté HTML"],
        "keyProps": [
            "`promptsJson` · catalogue (apiName, label, icon, objects[], userInputs[], extraInputs)",
            "Filtrage automatique par type de record (Account → résumé Account, Home → free-text)",
            "Détection auto HTML / Markdown · hauteur dynamique",
            "`autoRunFirstPrompt` · déclenche l'IA au chargement",
            "`resultAccent` · blue / purple / green · `maxHeight` · cap optionnel",
            "`namedCredential` · `Agentforce_API` par défaut",
        ],
        "description": "Panneau IA configurable qui exécute des Salesforce Prompt Templates via Invocable Actions. Posez sur n'importe quelle page, le SE choisit les prompts à exposer. Le contexte record est auto-injecté, les prompts qui demandent des inputs affichent un petit formulaire. Les réponses HTML sont rendues avec le formatage.",
    },
    "seFrRecordHighlights": {
        "tagline": "Panneau highlights custom avec image ronde, champs clés et boutons d'action, fonctionnel sur 8 objets standards.",
        "seBenefit": "Cliquez sur l'avatar pour uploader / remplacer l'image instantanément — sans static resource, sans hosting public d'URL, sans champ custom. L'image est sauvegardée comme un File sur le record.",
        "chips": ["Upload d'image inline", "Fonctionne sur 8 objets", "Bandeau de champs configurable"],
        "keyProps": [
            "`language` · en / fr",
            "`recordSource` · current / parent",
            "`accountFieldsList`, `contactFieldsList`",
            "`imageFieldApiName` · champ URL sur le record",
            "`maxQuickActions` · chargées depuis le layout",
        ],
        "description": "B2B / B2C - Panneau highlights custom avec image ronde et champs / actions configurables. Fonctionne sur Account, Contact, Opportunity, Case, Lead, Order, Contract, Quote — peut afficher le record courant ou son parent Account (propriété recordSource).",
    },
    "seFrRelatedRecordCard": {
        "tagline": "Carte sidebar verticale affichant le record contrepartie (Contact / Account) avec champs clés et avatar.",
        "seBenefit": "Cliquez sur l'avatar pour uploader une image pour le record lié — pratique pour mettre un logo Account ou une photo Contact sans quitter la page. Le champ image Contact par défaut `SDO_Cust360_Contact_Picture_URL__c` fonctionne prêt à l'emploi sur SDO.",
        "chips": ["Pick auto de la contrepartie", "Compatible Person Account", "Fallback empty-state"],
        "keyProps": [
            "`target` · auto / account / contact",
            "`fieldsCsv` par target",
            "Champ image par target (Contact + Account)",
        ],
        "description": "B2B / B2C - Carte verticale qui affiche un record lié (l'Account d'un Contact/Case/Opp, ou le Contact principal d'un Account). Choisit la contrepartie automatiquement à partir du type de record courant. Bilingue EN / FR. Valeurs par défaut industry-agnostic.",
    },
    "seFrRevenueDashboard": {
        "tagline": "Mini-dashboard de revenue sur 3 ans avec tuiles KPI et un bar chart mensuel côte à côte.",
        "seBenefit": "Overlay YoY intégré — raconte visuellement l'histoire de croissance ou de décroissance, sans configurer un vrai dashboard Salesforce.",
        "chips": ["3 ans côte à côte", "3 tuiles KPI", "Devise & échelle configurables"],
        "keyProps": [
            "Mois en arrière, année de comparaison",
            "Champ source du bucket, code devise",
        ],
        "description": "B2B - Mini-dashboard revenue 3 ans au niveau Account. Bilingue EN / FR via la propriété language.",
    },
    "seFrSmartRecommendations": {
        "tagline": "Panneau Next Best Action context-aware avec 1-6 recommandations, score de pertinence et override par carte.",
        "seBenefit": "Les narrations par défaut sont calibrées pour les scénarios sales façon SDO. Branchez un Prompt Template Einstein pour transformer la même UI en vraie démo IA sans toucher au layout.",
        "chips": ["Context-aware par objet", "Badge de score de pertinence", "Override inline du titre & motif"],
        "keyProps": [
            "Recommendations CSV (label + motif + icône)",
            "Prompt Template Einstein (optionnel)",
        ],
        "description": "Actions recommandées context-aware (Next Best Action).",
    },
    "seFrSplashBanner": {
        "tagline": "Bannière d'accueil avec 8 styles de fond animés (waves, aurora, mesh, orbs, conic, geometric, constellation, grid) en pur CSS / SVG.",
        "seBenefit": "8 ambiances visuelles distinctes — choisissez « Constellation » ou « Conic » pour les démos IA, « Waves » pour un ton customer-success sobre, « Aurora » pour le premium / luxe. Aucune image / static resource à uploader.",
        "chips": ["8 styles animés", "Pur CSS / SVG", "Respecte reduced-motion"],
        "keyProps": [
            "Titre, sous-titre, taille de texte, alignement",
            "Style de fond (8 options)",
            "3 couleurs (primary / secondary / tertiary)",
            "Hauteur, vitesse d'animation",
            "Bouton CTA optionnel",
        ],
        "description": "Bannière / splash screen avec fond animé pur CSS / SVG. 8 styles de fond au choix (Waves, Aurora, Mesh, Orbs, Conic, Geometric, Constellation, Grid) - aucune librairie externe, paramétrable à 100% (texte, taille, couleurs, vitesse, hauteur).",
    },
    "seFrTelesalesRepHome": {
        "tagline": "Home page Telesales avec KPIs, tables Cases et Orders en live, calls à passer et 3 mini-charts.",
        "seBenefit": "Un template tout-en-un pour la Home Inside Sales — pré-composé, pas besoin de câbler 5 composants manuellement dans App Builder.",
        "chips": ["Cases & Orders en live", "Queue de calls à passer", "3 mini-charts analytiques"],
        "keyProps": [
            "Nombre de calls affichés",
            "Tuiles KPI",
            "Liens d'actions rapides",
        ],
        "description": "B2B - Home page Telesales. Tuiles KPI, Cases entrants, Orders à valider, mini-charts, calls, news. Bilingue EN/FR via la propriété language.",
    },
    "seFrTerritoryMap": {
        "tagline": "Carte de territoire interactive avec Accounts géolocalisés, code couleur par pipeline, filtres latéraux et export CSV.",
        "seBenefit": "Les pins sont colorés par tranche de pipeline ouvert (rouge top 20% / orange / vert / gris) — visualise instantanément la santé du territoire. L'export CSV permet de récupérer la liste filtrée pour des reports de suivi.",
        "chips": ["Code couleur par tranche de pipeline", "Filtres latéraux", "Export CSV de la vue"],
        "keyProps": [
            "Owner / RecordType / fourchette de montant / stages / statut Case",
            "2 picklists configurables (Type, Industry par défaut)",
            "Hauteur de carte, ratio carte / liste, centre par défaut (France)",
        ],
        "description": "Sales / Field Sales - Vue carte du territoire : Accounts géolocalisés via leur Billing Address, code couleur par pipeline ouvert, filtres latéraux (Owner, RecordType, fourchette de montant ouvert, Stages, statut Case, Type, Industry + recherche par nom), tuiles KPI et export CSV.",
    },
    "seFrTimelinePhases": {
        "tagline": "Timeline horizontale multi-phases avec axe de dates, marqueur « Today » et état done / pending par phase.",
        "seBenefit": "Visualise un parcours ou un état de processus sans nécessiter d'objets custom ni de flows — saisissez les phases directement dans App Builder.",
        "chips": ["Layout sur axe de dates", "Marqueur « Today »", "État done / pending"],
        "keyProps": [
            "Jusqu'à 6 phases (label, date, statut)",
            "Thème couleur",
        ],
        "description": "B2B / B2C - Timeline horizontale multi-phases (parcours client / étapes projet). Les phases sont configurées en JSON avec labels, dates cibles et flags done. Un marqueur vertical « Today » indique la position actuelle.",
    },
    "seFrVoiceNoteTaker": {
        "tagline": "Dictez une note vocale via la Web Speech API et sauvegardez-la comme Task complétée liée au record courant.",
        "seBenefit": "Speech-to-text via l'API navigateur `SpeechRecognition` — aucune dépendance Einstein ni service externe. Démontrable sur n'importe quelle org tant que le navigateur est Chrome.",
        "chips": ["Dictée native navigateur", "Sauvegarde en Task", "Routing auto WhoId / WhatId"],
        "keyProps": [
            "Auto-save vs review-first",
            "Langue de transcription",
        ],
        "description": "Dictez une note vocale et sauvegardez-la comme Task complétée liée au record courant. Bilingue EN / FR.",
    },
}


def hash_source(c: dict) -> str:
    blob = json.dumps({
        "tagline": c.get("tagline", ""),
        "chips": c.get("chips") or [],
        "keyProps": c.get("keyProps") or [],
        "seBenefit": c.get("seBenefit", ""),
        "description": c.get("description", ""),
    }, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]


def main() -> int:
    if not MANIFEST_EN.exists():
        raise SystemExit(f"{MANIFEST_EN} not found — run build_manifest.py first.")
    en = json.loads(MANIFEST_EN.read_text(encoding="utf-8"))

    fr_components: list[dict] = []
    missing: list[str] = []
    for c in en["components"]:
        api = c["apiName"]
        merged = dict(c)
        if api in TRANSLATIONS:
            for k, v in TRANSLATIONS[api].items():
                merged[k] = v
        else:
            missing.append(api)
        merged["_sourceHash"] = hash_source(c)
        fr_components.append(merged)

    out = {
        "generatedAt": en.get("generatedAt"),
        "componentCount": len(fr_components),
        "components": fr_components,
    }
    MANIFEST_FR.write_text(
        json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"✔ Wrote {MANIFEST_FR.relative_to(ROOT)}")
    print(f"  {len(fr_components)} components, {len(TRANSLATIONS)} translated")
    if missing:
        print(f"  ⚠ no FR translation for: {', '.join(missing)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
