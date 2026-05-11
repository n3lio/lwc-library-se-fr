# SE FR Library — Showcase site · Notes & ideas

> Pas de code à ce stade. Juste un doc d'orientation pour la phase suivante.

## Vision

Un site web où un SE :
1. **Découvre** la librairie (showcase visuel sexy de chaque composant)
2. **Sélectionne** le ou les composants qui l'intéressent (ou tout le pack)
3. **Déploie** sur son org en quelques clics
4. *(côté admin)* on **track** ce qui est téléchargé / déployé

Le contenu textuel du deck est suffisant. C'est l'**UI/UX** qui doit être travaillée pour faire un vrai showcase.

## Reqs fonctionnelles

| Req | Détails |
|---|---|
| Browse components | Grille visuelle, screenshots/GIFs animés, filtre par persona / target / data mode |
| Component detail | Page par composant : tagline, screenshot, props, SE benefit, install instructions, screenshots in context |
| Selection cart | Cocher des composants dans la grille → "panier" |
| Deploy to org | Bouton "Deploy to my org" → connect to Salesforce → sf project deploy start ou équivalent → success/fail per component |
| Tracking | Compteur de downloads par composant (anonyme) + log SE qui a déployé (avec opt-in) |
| Search | Texte libre sur master label / description / props |
| FAQ / docs | Section qui agrège les README + guide technique FR |
| Multi-langue | Pour l'instant FR + EN suffit. EN par défaut pour SE EMEA |

## Reqs non-fonctionnelles

| Req | Détails |
|---|---|
| Responsive | Tablette / desktop. Mobile pas critique pour SE (les SE sont sur leur laptop) |
| Sexy | Animations subtiles, transitions, gradients cohérents avec le thème Salesforce navy/bleu/violet du deck |
| Fast | LCP < 2.5s, navigation instantanée (component browser doit être réactif) |
| Maintainable | Mises à jour de la lib doivent se refléter automatiquement (pas de duplication manuelle de la doc) |
| Securisé | Auth Salesforce OAuth pour le bouton deploy, sinon read-only sans login |

## Solutions techniques — comparées

### Option 1 — Heroku app (Node.js / Python)

**Pour** :
- Indépendant de Salesforce, hosting public, URL stable, accessible à n'importe quel SE worldwide
- Tracking facile (DB Heroku Postgres)
- Animations / UI custom à 100% (pas de contraintes Salesforce)
- Pipeline GitHub → Heroku auto-deploy à chaque push de la lib (les zips se regénèrent et sont uploadés)
- Auth Salesforce OAuth pour le bouton "Deploy to my org" via Heroku Connect ou jsforce

**Contre** :
- Coût hosting (mais minime, free tier ou ~7$/mois pour eco)
- Maintenance code séparée (un repo de plus à gérer)
- DNS custom à acheter / configurer (sefr-library.com ou sous-domaine Salesforce ?)

**Stack proposée** :
- Backend : Node.js + Express + Postgres (tracking)
- Frontend : Vue 3 / Nuxt ou Astro pour la simplicité du content-driven
- Source de vérité : repo GitHub où vit la lib (read-only mirror)
- Build : un script qui parse les `seFr*/README.md` + meta.xml + screenshots et génère le contenu du site
- Deploy SF : OAuth flow vers l'org du SE → utiliser jsforce pour pousser les composants en metadata API

### Option 2 — Salesforce Experience Cloud (LWR site)

**Pour** :
- Hosting gratuit (sur la org SE_FR_SDO ou une org dédiée)
- Auth native Salesforce (pas d'OAuth flow à coder)
- Bouton "Deploy" trivial (Apex peut faire des callouts cross-org via Connected App)
- Cohérence "tout SE Salesforce hébergé sur Salesforce"
- LWR = LWC = on peut **réutiliser nos propres composants** dans le site (méta-démo)

**Contre** :
- Limites Experience Cloud sur le custom UI (CSP, Locker, ne peut pas tout faire)
- Animations CSS / custom JS peuvent être bridées
- Site moins "sexy" qu'un site web full custom (à débattre — LWR a beaucoup progressé)
- L'org SE_FR_SDO a une URL de type `*.builder.salesforce-experience.com` peu user-friendly
- Découvrabilité publique limitée (pas indexable sans setup spécial)

### Option 3 — Static site (Astro / Eleventy / Vitepress)

**Pour** :
- Le plus rapide à mettre en place (3-4 jours de boulot vs 2 semaines pour Heroku)
- Hosting gratuit (Netlify, Vercel, Cloudflare Pages, GitHub Pages)
- Performance excellente (pages pré-générées)
- Source de vérité = le repo GitHub directement
- Très bon pour le côté "doc + showcase"

**Contre** :
- Pas de backend → tracking download via **service tiers** (Plausible, Simple Analytics, ou un mini-Google Analytics) ou un endpoint serverless (Cloudflare Worker, Netlify Function)
- Bouton "Deploy to my org" plus complexe → on peut faire un OAuth flow client-side avec PKCE puis appeler la metadata API directement depuis le browser (faisable mais limité par CORS Salesforce)
- Pas de tracking de "qui a déployé" sans backend

### Option 4 — GitHub repo seulement (pas de site)

**Pour** :
- Zéro effort UI
- README markdown rendu par GitHub
- `git clone` + `sf project deploy start` est trivial pour un SE qui maîtrise le CLI

**Contre** :
- Pas sexy
- Pas découvrable hors-Salesforce (ça reste un GitHub repo classique)
- Pas de tracking
- Sélection multi-composants pénible (faut tout cloner ou copier-coller des paths)

## Décision finale (2026-05-07) — Heroku

**Heroku** retenu en V1, pas Cloudflare/static. Rationale :
- **Corp security compliant by default** : Heroku est Salesforce-owned, accepté en interne sans validation custom
- **Vraisemblablement gratuit** pour Lionel via un programme SE interne (à confirmer)
- Le Service Agent doit être appelable depuis le site → on a besoin d'un vrai backend (pas pure static)
- jsforce + passport-salesforce sont des packages Node standards (Express/Fastify), simples à mettre en œuvre
- Heroku Postgres permet un dashboard admin "qui a déployé quoi" facilement

**Stack** :
- Node.js (Fastify) servant le build Astro statique + endpoints API
- Heroku Postgres (mini) pour tracking + opt-in users
- Heroku Pipeline = auto-deploy sur push GitHub → main
- Pas de DNS custom en V1, on reste sur l'URL `*.herokuapp.com`
- Plausible (~9$/mois) pour les page views anonymes

**Connected App** : sera créée au moment de l'intégration de l'agent (Sprint 4), pas avant. user-agent flow OAuth privilégié pour le bouton Deploy (zéro stockage de credentials côté serveur).

**Nom de l'app Heroku** : "LWC Library SE FR" (à confirmer si le slug `lwc-library-se-fr` est dispo).

## Build pipeline du site

Le site doit refléter les changements de la lib **automatiquement** :

```
1. SE pushe une modif sur le repo SE_FR_Library (GitHub)
2. GitHub Action déclenche :
   a. Re-build des zips via _build/build_zips.py
   b. Upload des zips dans un bucket (R2/S3) pour download
   c. Astro re-build du site avec le nouveau contenu
   d. Cloudflare Pages déploie le nouveau site
3. Le SE qui visite le site voit la version à jour
```

## Sélection multi-composants

Pattern UX :
- Chaque card composant a un toggle "Select"
- Sticky bar en bas : "3 components selected · [Deploy] [Download .zip]"
- Le bouton Download bundle tous les zips sélectionnés en un mega-zip via une serverless function

## Tracking

| Métrique | Comment | Sensitivity |
|---|---|---|
| Page views par composant | Plausible (pas de cookies) | Public OK |
| Downloads .zip (anonymous) | Counter Cloudflare Worker | Public OK |
| SE qui a déployé (opt-in) | OAuth Salesforce → log email du SE dans une DB | Privé, opt-in obligatoire RGPD |
| Composants déployés par SE | Idem | Privé |

Affichage côté admin : un dashboard simple dans Plausible + une page protégée du site avec les stats opt-in.

## Showcase format pour chaque composant

| Élément | Source |
|---|---|
| Master label | `meta.xml` |
| Tagline | `meta.xml` description |
| Screenshot | À screenshoter (folder `_previews/seFr<Name>.png` à créer) |
| GIF in action | À enregistrer (folder `_previews/seFr<Name>.gif`) |
| Props table | `meta.xml` `<property>` |
| SE benefit | Generated deck (présent dans le deck HTML) |
| Code snippets | README.md du composant |
| Data mode | Generated deck |
| Targets / Objects / Apex | `meta.xml` |
| Download zip | `_zips/seFr<Name>.zip` |
| Install instructions | `INSTALL.md` auto-généré dans chaque zip |

À créer côté lib pour alimenter le site :
- `_previews/seFr<Name>.png` × 30 — screenshots propres en haute résolution
- `_previews/seFr<Name>.gif` × 30 — GIFs courts (5-8 sec) montrant le composant en action
- `_previews/_thumbs/seFr<Name>.png` × 30 — thumbnails 400×300 pour la grille

## Plan d'action figé (2026-05-07)

| Sprint | Durée | Livrable | Bloqueur |
|---|---|---|---|
| **S0 — Setup Heroku + repo** | 1j | App Heroku `lwc-library-se-fr` créée, addon Postgres, GitHub repo connecté pour auto-deploy | Lionel doit confirmer son accès Heroku interne |
| **S1 — Skeleton Astro + content pipeline** | 3j | Pages générées auto depuis READMEs + meta.xml + screenshots, première URL Heroku live | — |
| **S2 — UX sexy** | 2j | Palette deck navy/bleu/violet, animations subtiles, polish responsive, screenshots/GIFs intégrés (Lionel en parallèle) | Screenshots/GIFs des composants disponibles |
| **S3 — OAuth deploy + tracking nominatif** | 2j | OAuth user-agent flow, bouton Deploy fonctionnel, opt-in flow, dashboard admin minimal | Connected App OAuth à créer côté SE_FR_SDO |
| **S4 — Agent embed** | 1.5j | Chat widget bottom-right (ou page dédiée), endpoint proxy `/api/agent/message` vers Agentforce REST API | Connected App "Agent Bridge" + accès au Service Agent (déjà en place) |
| **S5 — Polish + launch** | 0.5j | Plausible setup, monitoring, "What's new" feed auto, doc admin | — |

**Total : ~10 jours** spread sur sessions à venir.

## Précisions sur l'agent embed (S4)

Le Service Agent (`LWC_Library_Agent`) tourne déjà sur SE_FR_SDO. Pour l'embed dans le site :

```
Browser (chat widget Astro)
  → POST /api/agent/message { sessionId, message }
    → Heroku endpoint Fastify
      → s'authentifie auprès de SE_FR_SDO via OAuth client_credentials (Connected App "SE FR Site Bridge")
      → POST callout:Agentforce_API/einstein/ai-agent/v1/agents/<agentRef>/sessions/<sessionId>/messages
      → relay la réponse au browser
```

Le proxy est minimal (~100 lignes JS, identique à ce qu'on a fait dans `seFrPromptLauncher` Apex mais transposé en Node).

---

## Idées bonus (à ne pas oublier)

- **"Try in a sandbox"** : un bouton qui spin un scratch org temporaire avec tous les composants pré-déployés (utile pour démo client one-shot)
- **Code playground** : un Apex Anonymous-like dans le browser pour tester un prompt template depuis le site (bouge les besoins en dev)
- **Theme switcher** : les composants supportent FR/EN, le site doit aussi
- **"What's new" feed** : à chaque release, mention des composants nouveaux ou fixés
- **Component compatibility matrix** : tableau qui croise composants × persona + composants × Salesforce edition
- **Embed YouTube tutos** : 1 vidéo par composant (Charly fait des bons tutos, tu peux capitaliser dessus)
