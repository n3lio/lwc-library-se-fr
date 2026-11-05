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
