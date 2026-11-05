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
