# Visit Summary AI — recommended Einstein Prompt Template

The LWC `seFrVisitSummaryAI` now ships a *rich* client-side fallback that reads
every sibling-captured signal from `localStorage` and produces structured output
with **named products**, **named segments**, and specific numbers. In practice
you can leave `promptTemplateApiName` empty on the FlexiPage and get a clean
debrief out of the box.

If you want Einstein to layer a narrative on top, use this template body:

```
System role
-----------
Tu es un analyste commercial terrain Salesforce. Tu reçois le contexte d'une
visite magasin (relevé linéaire, audit produits, commande saisie). Produis un
compte-rendu factuel, concis, qui NOMME explicitement les produits et segments
cités dans le contexte. Pas de superlatifs, pas d'invention.

Output format (STRICT)
----------------------
Renvoie UNIQUEMENT un objet JSON valide, sans ``` ni commentaire. Schéma :

{
  "summary": "3 à 4 phrases. Nomme les produits en rupture et les segments
              sous-exposés. Donne les chiffres (PDL, nb SKU, montant commande).",
  "keyPoints": [
    { "label": "...", "value": "..." }
  ],
  "actions": [
    { "text": "action concrète nommant un produit/segment" }
  ]
}

Input bindings
--------------
Visite : {!$Input:Visit__c.Name} au {!$Input:Visit__c.Account__r.Name}
État : {!$Input:Visit__c.VisitState__c}
Check-in : {!$Input:Visit__c.CheckInDateTime__c}
Check-out : {!$Input:Visit__c.CheckOutDateTime__c}

Contexte capté pendant la visite (produit par les composants compagnon) :
{!$Input:ClientContext}
```

## Why this works

`Input:ClientContext` est désormais rempli par le LWC avec des lignes du type :

```
Account: Carrefour FR.
Visit: V-0006 (state: In Progress).
Brand shelf share (PDL): 24% vs competition 76% over 8 segments.
Under-exposed segments (PDL < 30%): Pastis 18%, Vodka Premium 22%, Rhum 27%.
Products audited: 11 / 15.
Out-of-stock SKUs (3): GenWatt Pastis 51, GenWatt Vodka Premium, GenWatt Rhum Blanc.
Price alerts (2): GenWatt Pastis observed 12.9€ vs list 10.9€ (+18%); GenWatt Gin observed 14.5€ vs list 15€ (-3%).
Field notes: GenWatt Pastis: "manquant depuis 2 semaines".
Order drafted: 7 lines / 48 units / 348€ — top: 12× GenWatt Pastis 51, 8× GenWatt Vodka Premium, 6× GenWatt Gin.
```

Avec ça le modèle peut produire par exemple :

```json
{
  "summary": "Visite chez Carrefour FR, PDL marque à 24 % vs 76 % concurrence sur 8 segments. 3 ruptures critiques (GenWatt Pastis, Vodka Premium, Rhum Blanc). GenWatt Pastis vendu +18 % au-dessus du prix catalogue. Commande de rattrapage de 348 € saisie sur 7 lignes.",
  "keyPoints": [
    { "label": "PDL marque", "value": "24 %" },
    { "label": "Ruptures", "value": "3 (GenWatt Pastis, Vodka, Rhum)" },
    { "label": "Montant commande", "value": "348 €" }
  ],
  "actions": [
    { "text": "Relancer le réassort HQ sur GenWatt Pastis, Vodka Premium, Rhum Blanc." },
    { "text": "Négocier +1 facing sur Pastis et Vodka Premium (PDL < 25 %)." },
    { "text": "Partager l'alerte prix GenWatt Pastis (+18 %) à la cellule promo." }
  ]
}
```

## Côté LWC

- Si Einstein renvoie du JSON parsable avec un `summary` >= 80 chars, il devient
  le lead paragraph (headline), tandis que la UI continue d'afficher les
  `narrativeLines` / `keyPoints` structurés produits par le fallback déterministe
  (les deux cohabitent — le JSON Einstein ajoute juste de la prose).
- Si Einstein renvoie du texte brut (non JSON), on l'ignore pour éviter les
  "Synthèse — … Points clés — …" moches qu'on voyait avant.
- Les `keyPoints` et `actions` renvoyés par Einstein (si parsables) sont ajoutés
  à la fin de la liste structurée, dédupliqués.

## Changements de contrat localStorage

| Clé                                   | Avant                               | Maintenant                                                                                                   |
|---------------------------------------|-------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `sefr-shelf-insights::<visitId>`      | `{ at, brand, lowPdl }`             | `{ at, brand, brandSharePct, competitionSharePct, brandFacings, totalFacings, deltaFacings, segmentsCount, topSegments, lowPdl }` |
| `sefr-product-check::<visitId>`       | map keyée par productId             | `{ at, byId, items, audited, present[], ruptures[], priceAlerts[], notes[] }`                                 |
| `sefr-order-draft::<visitId>`         | `{ at, lines, totalLines, totalUnits, totalAmount, globalDiscountPct, source }` | inchangé |

Le `seFrVisitProductCheck._loadLocalState` lit les deux shapes (ancienne et nouvelle).
