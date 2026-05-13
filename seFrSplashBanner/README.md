---
tagline: Welcome banner with 8 animated background styles (waves, aurora, mesh, orbs, conic, geometric, constellation, grid) in pure CSS / SVG.
categories: [Transverse]
personas: [All]
chips:
  - 8 animated styles
  - Pure CSS / SVG
  - Respects reduced-motion
dataMode: mock
mobileReady: true
originalAuthor: Lionel Braun
keyProps:
  - Title, subtitle, text size, alignment
  - Background style (8 options)
  - 3 colors (primary / secondary / tertiary)
  - Height, animation speed
  - Optional CTA button
seBenefit: 8 distinct visual moods — pick "Constellation" or "Conic" for AI demos, "Waves" for sober customer-success vibes, "Aurora" for premium / luxury. No images / static resources to upload.
featured: false
releaseStatus: new
status: active
screenshots: []
---

# CCO FR - Splash Banner (`seFrSplashBanner`)

Bannière d'accueil / splash screen avec fond animé. **8 styles de fond** au choix, tous en pur CSS + SVG inline (zéro librairie externe). Le SE configure juste un titre, un sous-titre optionnel et le style de fond — tout le reste est paramétrable depuis App Builder (couleurs, hauteur, vitesse, alignement, bouton CTA).

## Targets

- `lightning__HomePage`
- `lightning__AppPage`
- `lightning__RecordPage`

## Les 8 styles de fond

| `bgStyle` | Vibe | Cas d'usage |
|---|---|---|
| `waves` | doux, organique (clin d'oeil aux vagues de Charly Ansel) | bannière welcome standard |
| `aurora` | aurores boréales, blend `screen` | luxe / premium / cosmétique |
| `mesh` | mesh gradient Stripe homepage | SaaS moderne, dashboard |
| `orbs` | sphères flottantes blurred (Apple keynote) | élégant, généraliste |
| `conic` | conic gradient qui tourne (Vercel) | flashy, dev-tool, AI |
| `geometric` | low-poly SVG triangulé qui pulse | tech, WWDC |
| `constellation` | points reliés type étoiles | data, AI, futuriste |
| `grid` | blueprint avec pulse + scan-line | tech, monitoring, "matrix-light" |

Tous les fonds respectent `prefers-reduced-motion` (animations désactivées si l'utilisateur a activé la préférence d'accessibilité système).

## Propriétés (App Builder)

| Propriété | Description |
|---|---|
| `title` | Titre principal (centré, gros). Émojis acceptés. |
| `subtitle` | Sous-titre optionnel sous le titre. |
| `textSize` | `s` / `m` / `l` (défaut) / `xl` |
| `bgStyle` | Voir tableau ci-dessus. Défaut : `waves`. |
| `colorPrimary` | Couleur 1 (CSS hex, rgb, named). Défaut bleu Lightning `#0176d3`. |
| `colorSecondary` | Couleur 2. Défaut violet `#a445ff`. |
| `colorTertiary` | Couleur 3. Défaut rose `#ff6ec7`. Ignorée par `waves` (qui n'en utilise que 2). |
| `height` | Hauteur en pixels. Défaut 220. |
| `darkText` | Off (défaut, texte blanc) / On (texte noir). |
| `animationSpeed` | `slow` / `normal` (défaut) / `fast` |
| `alignment` | `center` (défaut) / `left` / `right` |
| `ctaLabel` | Label du bouton optionnel sous le texte. |
| `ctaUrl` | URL du bouton (Salesforce relative ou absolue). |

## Conseils visuels

- Pour un effet **premium** : `aurora` + couleurs pastel (rose / violet / bleu) + `darkText=false`.
- Pour un effet **tech / Agentforce** : `conic` ou `constellation` + couleurs vives (bleu / violet / cyan).
- Pour un effet **discret** : `waves` ou `orbs` + une seule couleur de marque + animation `slow`.
- Pour une **landing page d'app** : `mesh` + 3 couleurs de marque, hauteur 300px, CTA "Explorer".

## Aucune dépendance Apex

Composant 100% front. Pas d'Apex requis. Aucun champ custom.
