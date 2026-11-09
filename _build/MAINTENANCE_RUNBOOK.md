# Runbook — intégrer un composant & maintenir la lib (site, KB, agent)

> Source de vérité des enseignements des itérations du 2026-11-09. À lire avant d'intégrer un composant soumis
> (le futur serveur MCP de validation doit appliquer ces règles) et avant de toucher au site / à l'agent.
> Checklist de conformité du composant lui-même : `INTEGRATION_CHECKLIST.md`.

## 1. Pipeline « nouveau composant accepté » (cible MCP de validation)

1. **Normes** : `INTEGRATION_CHECKLIST.md` OK (README + frontmatter complet : tagline, categories, personas, surfaces, objects, `keyProps`, `seBenefit`, FR/EN).
2. **Code** : composant copié dans `_deploy/force-app/main/default/lwc/<api>` (+ Apex dédié/partagé), déploiement sur `cco-fr-de` OK.
3. **Previews** : `_previews/<api>.png` (obligatoire) — `uv run --with playwright python _tools/capture_previews.py <api>`.
   Si un GIF existe aussi, il faut IMPÉRATIVEMENT le PNG à côté (le widget/cards préfèrent le PNG ; sinon vignette manquante).
4. **Build complet** : `python3 _build/build_all.py` (zips, manifest, README, deck, site, KB HTML).
5. **KB agent** : `python3 _build/refresh_agent_kb.py --skip-build --check <api> [<api2>…]`
   → HTML→PDF (Playwright), supprime l'ancien fichier de la Data Library `SE_FR_Library_Knowledge` (`1JDgK000009Lm1FWAS`), ajoute le nouveau, attend `INDEXED` (~1–3 min), puis interroge l'agent live sur chaque composant (`--check`) et échoue si l'apiName n'est pas reconnu.
6. **Publication** : `git add -A _build _site _previews _deploy …` (**`_site/` est versionné : le commiter sinon Heroku ne change pas**) → push `main` → merge dans le worktree `~/Documents/Internal/.lwc-library-heroku` (branche `heroku-paris3d`) → `git push heroku heroku-paris3d:main`.
7. **Pas besoin de republier l'agent** pour un nouveau composant : il lit la Data Library à chaque réponse. Le script `.agent` ne change que si on change son comportement.

Automatisé : étapes 4, 5 (y compris test live). Manuel/à brancher dans le MCP : 1–3 (validation), 6 (commit/deploy).

## 2. Ce que contient la KB (et ce qui la rend « précise »)

`build_knowledge_pdf.py` : table canonique, cookbook, release notes, contributeurs, About/Docs (extraits de `_site/` → `build_site.py` AVANT), README de chaque composant + lead (API name, catégories, surfaces, objets, data mode, Apex) + **résumé, `keyProps`, `seBenefit`** (ajoutés le 2026-11-09 : sans eux l'agent répondait « props non documentées »).
→ La qualité des réponses = qualité du frontmatter. Un `keyProps` vide = l'agent ne sait pas répondre sur la config.

## 3. Agent Agentforce — recette de grounding (leçons)

- Org showcase : alias `cco-fr-de` (Developer Edition). Bot `LWC_Library_Agent` (`0XxgK000002VpMrSAK`), bundle `aiAuthoringBundles/LWC_Library_Agent` (copie `_agent/LWC_Library_Agent.yaml`).
- **Rattacher la Data Library dans Setup NE grounde PAS l'agent** (featureAssignments reste `[]`). Il faut une action explicite dans le script :
  - target `standardInvocableAction://streamKnowledgeSearch`, `source: "EmployeeCopilot__AnswerQuestionsWithKnowledge"` (`answerQuestionsWithAgenticRetriever` est refusée) ;
  - inputs `query` (is_user_input), `citationsUrl` (""), `ragFeatureConfigId` = **littéral** `"ARFPC_1JDgK000009Lm1FWAS"` (`@knowledge.…` en default d'input = CompilationError), `citationsEnabled` False ;
  - output `knowledgeSummary: object` avec `complex_data_type_name: "lightning__richTextType"`, `filter_from_agent: False`, `is_displayable: True` ;
  - définie dans CHAQUE subagent (`search_components`, `explain_component_usage`) ET exposée dans `reasoning.actions` (`search_library_docs: @actions.search_library_docs`) — sinon jamais appelée (symptôme : `result: []`) ;
  - instructions : « appelle `{!@actions.search_library_docs}` d'abord, réponds UNIQUEMENT depuis les passages ».
  - `retriever://…` ne marche pas.
- Cycle : `sf agent validate authoring-bundle -o cco-fr-de -n LWC_Library_Agent` → `sf agent publish authoring-bundle …` (un « Internal Error » 500 est souvent transitoire/forme d'output) → `sf agent activate -o cco-fr-de -n LWC_Library_Agent` (prend la dernière version).
- Pas de Markdown dans les réponses (le widget gère le formatage depuis du texte brut + emojis).
- Pas de marqueurs « Simulation/Mock/Démo » visibles dans les réponses.

## 4. Data Library (CLI)

`sf agent adl get -i <id>` · `file list -o cco-fr-de -i 1JDgK000009Lm1FWAS` · `file add -f <pdf>` · `file delete --file-id <1Jc…>`. Impossible d'ajouter 2 fois le même nom : supprimer d'abord (le script le fait). Un upload juste après création de la library peut timeout → relancer (le script retente).

## 5. Proxy Heroku & ECA

- Routes `/api/agent/session|message|end|status` (`agent.js`), 8 msg/min/IP.
- External Client App : activer « Issue JWT-based access tokens for named users » ; Run As = `lwc_library_agent@cco-fr-showcase.demo`. Après changement d'app/token : **restart du dyno**.
- Env : `SF_AGENT_CLIENT_ID`, `SF_AGENT_CLIENT_SECRET`, `SF_AGENT_LOGIN_HOST`, `SF_AGENT_ID` (ID d'un BotVersion accepté par l'Einstein Agent API). `heroku config:set` avec secrets = lancé par Lionel. **Ne jamais écrire le secret/consumer key dans un fichier** ni le laisser dans les transcripts.

## 6. Widget de chat (`_build/chat_widget.js`, injecté par `build_site.py › agent_html`)

- Réponses = texte brut → `fmt()` reconstruit paragraphes/titres/listes/code ; `inl()` auto-lie les apiName et recettes via `window.__SE_INDEX` (défini APRÈS le script du widget → chargement paresseux + `boot()` sur DOMContentLoaded).
- Cartes sous la réponse : max 4 composants + 2 recettes, vignette = `thumb` (PNG d'abord, `_thumb_for`).
- Persistance sessionStorage (messages + HTML) pour survivre à la navigation ; horodatages ; animation de frappe ; dégradé bleu→violet ; reset ↺.
- Tester en local sur un port libre (8799 est parfois occupé) ; Playwright via `uv run --with playwright python …`.

## 7. Pièges déjà rencontrés

| Piège | Remède |
|---|---|
| Heroku ne change pas après push | `_site/` pas commité |
| Vignette manquante dans une carte | composant avec GIF seul → ajouter le PNG |
| Agent « ne trouve pas » un composant neuf | KB pas ré-uploadée / pas encore `INDEXED` |
| Agent n'appelle jamais la KB | action non exposée dans `reasoning.actions` |
| Agent sans détail de props | `keyProps` vides dans le frontmatter |
| `sf agent publish` 500 | corriger forme input/output de l'action, retenter |
| FlexiPages | retrieve avant deploy, toujours |
| Commit | vérifier `git config user.email` (perso : `63257119+n3lio@users.noreply.github.com`) |

## 8. Divers parqué

Bundle orphelin `seFrAccountActions` (supprimé/à supprimer, non bloquant) ; rotation du secret OAuth non demandée.
