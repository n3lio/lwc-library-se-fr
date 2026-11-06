# Audit pages CCO FR Showcase — 2026-11-05 (partiel, fenêtre étroite ~mobile)

## Account Carrefour FR (Pilotage)
- OK : en-tête, Plan stratégique, Santé du compte, Segments.
- "Aucune commande récente (90 j)" alors que le seed a des commandes (dernière activée il y a 3 mois, brouillon il y a 1 mois) : à vérifier la règle (Activated seulement ?) / dater le seed plus récent.
- "Pas de visite terrain depuis 45 jours" alors qu'une visite Planned existe : cohérence seed.
- Run rate "3 200 € / mois" passe à la ligne : tuile trop étroite en layout serré.

## Contact Alexandre Dupont
- Titres tronqués en colonne étroite : "Segments du con…", "Préférences de co…", "Recommandation…" -> autoriser le wrap ou raccourcir les libellés.
- Boutons qui passent sur 2 lignes : "Planifier un rendez-vous", "Résumer avec Agentforce" -> white-space nowrap + taille réduite / icône seule en étroit.
- Carte "Préférences de contact" : corps vide.
- "Par catégorie / Par marque" : valeurs génériques "Catégorie A / Marque A" -> brancher sur de vraies familles (Boissons, Épicerie…) et marques du catalogue CPG.
- Bandeau INFO "Composants de la lib" prend beaucoup de place en colonne centrale étroite.
- Icônes/avatar OK (photo réelle).

## À faire (non fait)
Opportunity, Case, Order, Lead, Homes (FieldSales, RetailExec, Telesales), Territoire & Pipeline, Marketing, Visit (onglets Relevé linéaire / Compte-rendu).

## Opportunity / Case / Order / Lead (MAJ)
- Opportunity : "Décideur principal" OK après seed OCR (18 rôles). Compte : CA brut `85000000000` à formater (k€/M€/Md€).
- Order : carte contact corrigée (CustomerAuthorizedById → 1er contact du compte). "Type de commande" vide ; aucun fichier dans "Bons de livraison & factures".
- Case : jauge "Historique 0 %" peu lisible.
- Lead : carte contact "Aucun contact lié" (branche Lead de resolveContactId lit Contact__c) → masquer la carte ou afficher les champs du lead ; ruban "OK" avec icône warning incohérent.

## Home Field Sales
- Tuiles KPI remplies (4/10 visites, 10 leads, 22.4k) mais cartes "Tournée du jour", "À faire", "Comptes prioritaires", "Nouveaux leads" vides → incohérence avec les tuiles. À faire : seed visites du jour (Visit__c PlannedStart = today), tâches du jour, leads Score > 20, comptes prioritaires ; ou aligner les tuiles.
- Titres tronqués ("Comptes priorit…", "Nouveaux leads …", "À faire sur le …") : boutons "Voir tout" prennent la place → passer les actions sous le titre en vue étroite.
- Home Accueil : tuile Retail Execution sans icône (carré bleu vide) ; carte assistant et Agentforce coupées à droite (débordement horizontal en fenêtre étroite).
## Restant à auditer : Retail Execution, Télévente, Territoire & Pipeline, Marketing, onglets Visit.

## Retail Execution
- Chargement lent (page vide ~10 s avant affichage du contenu) → prévoir un skeleton / spinner.
- Checklist terrain OK après seed `seed-showcase-today.apex` (4 tâches).
- "Tournée du jour" (seFrMyEvents) reste vide malgré 4 Event du jour : `getMyEvents` renvoie bien 4 lignes en Apex, filtre `typesFilterCsv=Visit,Meeting,Call` contourné (fix déployé : events sans Type conservés) mais carte toujours vide → à investiguer (cache wire client ? fuseau horaire : events à 8h-15h UTC, il est 21h30 → le composant ne montre peut-être que les créneaux restants). Test à refaire demain matin ou avec des events en soirée.
## Télévente
- Carte "KPI Télévente" : valeur "18" coupée en 2 lignes ("1" / "8"), libellé "COMMAND ES" coupé au milieu du mot, "Aujourd'h ui" coupé → colonnes trop étroites, passer en grille auto-fit / `overflow-wrap:normal` + `word-break:keep-all`.
- Carte "Rappels & rel…" titre tronqué par le sélecteur "Aujourd'hui".
- Tableau "Cas entrants" : colonnes Compte / Sujet tronquées ("Mono…", "Dema…") → élargir ou tooltip.
## Territoire & Pipeline
- Incohérence : "Indicateurs clés" = 12 leads / 7 opps / 34 comptes mais "Carte du territoire" = 0 compte, 0 €, 0 opp, 0 cas (filtre Propriétaire "Mes c…" par défaut ?). Mettre "Tous" par défaut.
- Icône de page = micro (inadaptée), ruban ATTENTION "Voir les composants →" sans message.
- Marketing : navigation par clic sans effet à la 1re tentative (à retester).

## Marketing (vu OK à la 2e tentative)
- Icône de page = clé à molette (inadaptée pour Marketing) ; bandeau hero OK.
- KPI Marketing : valeurs "12" et "34" coupées en 2 lignes (chiffre par chiffre), "OPPORTU NITÉS" coupé, "Portefeuill e" coupé → même défaut de wrap que Télévente (tuiles trop étroites : réduire la police / `word-break: keep-all` / grille auto-fit).
- Timeline d'engagement : OK, lisible. Ruban INFO correct ici.
- Défaut transverse prioritaire : `seFrMetricTile`/KPI en colonne étroite → wrap des chiffres et libellés.

## Corrections appliquées (2e passe)
- seFrKpiLauncher : chiffres/libellés sans coupure (nowrap + keep-all, police du libellé adaptative). Vérifié sur Marketing : 12 / 34 / Portefeuille OK.
- seFrMyEvents : parsing de date robuste (offset Apex +0000), re-fetch si le cache wire renvoie vide, log d'erreur. Vérifié : "Tournée du jour" affiche les 4 visites.
- SE_FR_ProductCheckController : lit Product2.Image_URL__c (Relevé produits affichait des initiales B/C/D/E). Vérifié : 12 images.

## Fiche Visite (V-0005)
- Check-In : OK, plan de visite lisible. "Début planifié 28/10/2026 19:04" = date passée pour une visite "Planifiée" (seed historique).
- Relevé Linéaire : OK ; PDL actuelle "—", champs de saisie vides sans placeholder.
- Relevé Produits : OK après fix images.
- Compte-Rendu : textes anglais mélangés dans la carte Agentforce ("Summarize text", "Refine text", "Text to summarize") ; icône téléphone orange pour la "Note vocale" (micro attendu) ; bouton "Enregistrer sur l'enregistrement" au libellé confus → "Enregistrer dans la visite".
- Onglet Commande (menu Plus) : non audité (le clic ouvre le menu mais ne change pas d'onglet à la 1re tentative).

## Corrections appliquées (3e passe)
- **seFrAlertsRibbon** (compact) : message sur 2 lignes max au lieu de s'effondrer à 0 de large ; bouton fermer à droite. Vérifié sur Territoire & Pipeline.
- **Carte du territoire** : `SE_FR_TerritoryMapController` plantait (`Invalid relationship RecordType for Account`) dans les orgs sans RecordType Account → 0 compte. Corrigé (garde `accountHasRecordType`) ; 3 comptes géocodés (Carrefour, Monoprix, Franprix) affichés, KPI 3 / 135 k€ / 3 / 6. Flexipage : `defaultOwnerScope=all`.
- **Icônes d'onglets** : Territoire & Pipeline Globe→Map (Custom57), Marketing Envelope→Megaphone (Custom66) (le micro venait du motif Custom35 partagé avec Visite).
- **seFrPromptLauncher** : catalogue par défaut traduit en FR (Synthèse du compte, Résumer un texte, Texte à résumer…).
- **seFrVoiceNoteTaker** : bouton « Enregistrer dans la visite », icône utility:unmuted.
- **Visite > Commande** : audité, OK (état vide « Aucune rupture détectée », cadencier avec images/stock).
- Reste : 13 comptes sans géocodage (carte limitée à 3 pins), défauts listés dans les sections précédentes (Télévente, Contact, Account stale logic, Lead contact card, Case historique).

## 4e passe
- Géocodage des 12 comptes US/UK/SG restants (Billing lat/long) → carte : 15 comptes, 2,6 M€ pipeline, 19 opps, 9 cases.
- Fiche Lead : `SE_FR_ContactCardController.resolveContactId` retombe sur `ConvertedContactId` puis sur un Contact de même email (le champ `Contact__c` n'existe pas sur Lead).
- Tabs : motifs resynchronisés depuis l'org (les libellés diffèrent du repo, seul le numéro compte). Micro retiré de Territoire (maintenant Custom57) ; Marketing = Custom66 (dés — à remplacer par une icône plus pertinente).
- seFrKpiLauncher : label sur une ligne avec ellipsis (plus de coupure au milieu d'un mot).
- Reste : Télévente, Contact (titres tronqués, préférences vides), logique « stale » Account, Case « Historique 0% », Order « Type de commande ».

## 5e passe
- Marketing : accents de la timeline d'engagement vérifiés en org (SMS envoyé / Email cliqué / Email rejeté).
- Télévente : libellés KPI raccourcis (CAS, CDES) pour éviter la troncature.
- Contact : jauges Score / Dernière activité / Opt-in e-mail alimentées (29 contacts seedés) et libellés FR.
- Restant : Télévente (tableau, Rappels), Account (logique « stale »), Opportunity (CA brut), Order, Lead, Case, Visit, Field Sales/Retail, Accueil, icônes d'onglets Marketing/Territoire.

## 6e passe
- Télévente : tableaux Cas/Commandes en largeurs auto + retour à la ligne, titre « Rappels » raccourci.
- Account : signal « commande récente 90 j » compte désormais les commandes non annulées (brouillons inclus) ; tuile Run rate sans retour à la ligne.
- RelatedRecordCard : valeurs numériques brutes (ex. 85000000000) formatées en FR (85 Md €).
- Case : jauges branchées sur les scores du contact (Activité récente / Engagement).
- À traiter : en-tête de la page Case vide (Record Highlights sans titre ni champs), Lead, Order, Visit, Field Sales/Retail, Accueil, icônes d'onglets Marketing/Territoire.

## 7e passe
- Case : en-tête (recordSource=parent) et jauges Activité récente / Engagement corrigés.
- Lead : contacts miroir créés (carte contact OK), bandeau Hot=warning / Non contacté=info.
- Order : flexipage `CCO_FR_Showcase_Order` mise à jour (parent + jauge « Activité récente ») et déployée, mais le rendu affiche encore « Last activity 0% » et un en-tête vide. Cause probable : assignation de page au niveau org/profil qui prend le dessus sur l'override de l'app. À vérifier dans Setup > Lightning App Builder > Activation. Non bloquant.
- Restant : Visit (dates passées, placeholders facings), Field Sales home (cartes vides), Accueil (tuile sans icône), Territoire (filtres tronqués), Contact (titres tronqués), motifs d'onglets Marketing/Territoire.

## 8e passe
- Visit : visites « Planned » replanifiées dans le futur (org, hors repo) ; champ facings (ShelfSpace) avec placeholder + label.
- Field Sales : `getPriorityAccounts` accepte recordType « any » ; flexipage passée en accountRecordType=any / owner all / leadRating Any ; boutons « Voir tout » remplacés par un bouton-icône (titres plus tronqués). Déployé, MAIS rendu navigateur inchangé après plusieurs rechargements (bundle/page en cache, même symptôme que Order) : à revérifier dans une session propre.
- Piste commune Order/Field Sales : cache Lightning ou page active différente de celle déployée.

## 9e passe
- Contact : titres raccourcis (Segments, Consentements, Recommandations, bouton « Planifier un RDV »).
- Accueil : icône Retail Execution `standard:merchandising` (inexistante) → `standard:product_item`.
- Territoire : grille de filtres auto-fit + libellés sur plusieurs lignes.
- Onglets : Marketing = Custom108 Megaphone, Territoire = Custom24 Map.
- À revérifier en session propre (cache) : Order, Field Sales (comptes/leads).

## 10e passe — seFrConsentManager
- Cause du vide : `channelsCsv` sans champ (« Email,SMS,… ») → aucun canal exploitable.
- Nouveau prop `sourceMode` (mock par défaut | live). Mock : interrupteurs d'exemple (état local), libellés pris dans `channelsCsv` (1er segment). Live : champs booléens par API name via `label|fieldApiName|inverted`, ou champs d'opt-out standards Contact/Lead si CSV vide.
- Pages Contact / Lead (libellés FR) et Compte (défauts) OK en mock.

- 10e (suite) : seFrConsentManager relayouté en liste verticale (libellé à gauche, toggle à droite, une ligne par canal) — plus de chevauchement dans la colonne étroite de la page Contact. Vérifié dans l'org.

- 11e : seFrRecordHighlights affichait le compte parent (Carrefour FR) sur Order/Case car recordSource=parent. Retiré des flexipages Order et Case ; le composant gère désormais les objets non Account/Contact (nom = OrderNumber / CaseNumber / Name, champs et icône par défaut par objet, prop otherFieldsList). Déployé ; rendu navigateur encore ancien (cache de définition de page ?), à revérifier en session neuve.
