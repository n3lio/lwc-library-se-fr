---
tagline: Relevé linéaire manuel — part de linéaire (PDL) marque vs concurrence par catégorie et segment, avec historique.
categories: [Geo & Field]
personas: [FieldSales]
chips: [Visit, Shelf, PDL, Facings]
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
originalAuthorEmail: lionel.braun@salesforce.com
maintainedBy: SE FR team
libraryIntegrationDate: 2026-11-03
keyProps:
  - language
  - cardTitle
  - cardIcon
  - brandName
  - competitorLabel
  - seedJson
seBenefit: Pendant visuel du composant photo seFrVisitShelfCompliance — saisie manuelle de facings quand le vendeur n'a pas accès à la vision ou veut consolider l'évolution PDL vs mois précédent / A-1. Publie dans `sefr-visit-progress` : coche l'étape « Relevé linéaire » du plan de visite.
releaseStatus: beta
status: active
screenshots: []
---

# seFrVisitShelfSpace (Visit Shelf Space)

Relevé linéaire **manuel** sur une Visit__c. Saisie des **facings actuels** par catégorie / segment / marque (Ma marque vs Concurrence), avec historique **précédent** et **A-1**, et calcul automatique de la **PDL** (part de linéaire) globale + évolution en points.

- App Builder label : `CCO FR - Visit Shelf Space`
- 100% client-side — pas d'Apex. Les données sont persistées en `localStorage` pour la démo.
- Complémentaire de `seFrVisitShelfCompliance` (photo) : les deux cohabitent dans l'onglet **Relevé linéaire**.

## Où le poser

- **Target** : Lightning Record Page
- **Object** : `Visit__c`
- **FormFactors** : Large + Small
- Sur Visit, au Save il publie `shelf:done` dans `localStorage` sous la clé `sefr-visit-progress::<visitId>` → coche l'étape « Relevé linéaire » du composant `seFrVisitPlan`.
- Il publie aussi `sefr-shelf-insights::<visitId>` (segments à faible PDL ou en recul) — à consommer par `seFrVisitSummaryAI` pour un debrief enrichi.

## Props

| Nom | Type | Défaut | Description |
|---|---|---|---|
| `language` | String | `fr` | `fr` ou `en`. Bilingue (titres, PDL, unités « pts »…). |
| `cardTitle` | String | — | Override du titre de la carte. Défaut : « Relevé linéaire » / « Shelf audit ». |
| `cardIcon` | String | — | Override icône SLDS. Défaut : `standard:merchandising`. |
| `brandName` | String | `Ma marque` | Libellé pour les lignes « main » (ex: Danone, LU, DIM, Haribo…). |
| `competitorLabel` | String | — | Libellé des lignes « competitor ». Défaut : « Concurrence » / « Competition ». |
| `seedJson` | String | — | JSON Array pour remplacer le seed par défaut. Voir plus bas. |

## Modèle de données

Chaque ligne du relevé :

```json
{
  "id": "1",
  "category": "Boissons rafraîchissantes",
  "segment": "Colas",
  "brand": "main",
  "facingsCurrent": null,
  "facingsPrev": 16,
  "facingsA1": 14,
  "facingsSegPrev": 48,
  "facingsSegA1": 46
}
```

- `brand` : `main` (= `brandName`) ou `competitor` (= `competitorLabel`).
- `facingsCurrent` est saisi par le vendeur, les autres sont historiques (figés).
- `facingsSegment` est recalculé auto à chaque saisie (somme des `facingsCurrent` du segment).

## Calcul PDL

```
PDL = Σ facingsCurrent(main) ÷ Σ facingsSegment(main)
```

- Évolution = `PDL_actuelle − PDL_précédente` (en points, 1 décimale).
- Classe CSS appliquée : `--up` si > +0.5 pt, `--down` si < −0.5 pt, `--muted` sinon.

## Seed custom (prop `seedJson`)

Pour un client particulier (ex: Danone, DIM, Haribo), passer un JSON Array avec les catégories/segments réels. Le composant reparse à chaque mount — si le JSON est invalide, repli silencieux sur le seed CPG épicerie par défaut.

Exemple Danone :

```json
[
  {"id":"1","category":"Produits laitiers","segment":"Yaourts nature","brand":"main","facingsCurrent":null,"facingsPrev":22,"facingsA1":20,"facingsSegPrev":60,"facingsSegA1":58},
  {"id":"2","category":"Produits laitiers","segment":"Yaourts nature","brand":"competitor","facingsCurrent":null,"facingsPrev":38,"facingsA1":38,"facingsSegPrev":60,"facingsSegA1":58}
]
```

## Install

1. Déployer le LWC `seFrVisitShelfSpace` (pas d'Apex).
2. Dans App Builder, ouvrir la record page Visit__c, glisser `CCO FR - Visit Shelf Space`.
3. Configurer `brandName`, et optionnellement `seedJson` pour un catalogue client.

## Inspiration

Dérivé du composant `dimShelfSpace` (SIC DBI/DIM, juin 2026). Adapté bilingue, prop-driven, palette SLDS neutre pour la lib.
