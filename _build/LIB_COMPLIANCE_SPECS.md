# Lib Compliance Specs — inventaire vivant

> **But** : capturer, au fur et à mesure des intégrations de composants tiers (DBI, Septodont, contributions Yann/JD/Loic, etc.), TOUTES les règles/fixes/normalisations qu'on applique pour rendre un composant "lib compliant". Ce fichier est destiné à devenir la spec source d'un futur **serveur MCP de soumission automatique** (owner cible : équipe CCO FR).
>
> **Pipeline futur (vision)** : dev envoie un LWC → MCP tool `submit_component` → checks statiques (naming, i18n, meta, deps) → rapport de non-conformité + PR auto → review humaine → merge.
>
> **Format** : chaque section = une règle concrète. Ajouter une ligne "**Source**" (composant/session) et une ligne "**Rationale**" quand utile.

## 0. Convention de nommage (déjà en place — rappel)

- LWC folder + JS class : `seFr` + PascalCase (ex : `seFrShelfCheck`)
- Apex controller : `SE_FR_<Name>Controller`
- Master label (meta xml) : `SE FR - <Human name>` (ou `CCO FR - <Human name>` — rebrand 2026-05)
- Language defaults : FR dans le code, override via `@api language` (EN si null)

## 1. Purge de refs client

À faire à chaque port depuis un dossier `clients/*` :
- [ ] Supprimer toute string hardcodée `<Client Name>` dans JS/HTML/CSS/labels
- [ ] Remplacer par variables `@api` configurables (ex : `@api cardTitle`)
- [ ] Remplacer emails/username SF client par placeholders génériques dans les commentaires
- [ ] Supprimer refs à des Custom Objects/Fields propres au client (soit rendre optionnels via `@api fieldApiName`, soit builder autour de champs standard)
- [ ] Screenshots/mocks : effacer logos + noms de comptes réels des screenshots pris pour la démo client

## 2. i18n bilingue FR/EN

- [ ] Objet `LABELS = { fr: {...}, en: {...} }` au top du JS
- [ ] Getter `t(key)` qui switch sur `this.language`
- [ ] **Default `@api language = 'fr'`** (FR par défaut — confirmé 2026-10-15 par `_build/INTEGRATION_CHECKLIST.md` + comportement réel de `seFrContactCard`). ⚠️ L'ancienne version de cette spec disait EN — c'est faux, c'est FR.
- [ ] XML meta : `<property name="language" default="fr" ...>` — doit matcher le default JS
- [ ] Toutes les strings visibles doivent passer par le getter (aucune string hardcodée dans le template)
- [ ] Toolbars, messages d'erreur, empty states, placeholders : à traduire aussi
- [ ] ⚠️ Les templates LWC n'autorisent pas d'appel de méthode avec args (`{t('key')}` KO). Pour chaque label dynamique, créer un getter dédié (ex : `get resolvedCardTitle() { return this.cardTitle || this.t('cardTitle'); }`).

## 3. Meta XML — exposition App Builder

- [ ] `<isExposed>true</isExposed>`
- [ ] Targets pertinents (RecordPage, HomePage, AppPage, RecordAction, FlowScreen selon usage)
- [ ] `<supportedFormFactors>` : Small + Large si mobile-ready
- [ ] `<masterLabel>SE FR - ...</masterLabel>` (ou CCO FR selon rebrand)
- [ ] `<description>` claire
- [ ] Une `<property>` par input configurable + `default=` sur les triviaux
- [ ] Pour les inputs "guides" (JSON catalogue, CSV, regex, pattern) → `placeholder='...'` avec exemple concret (règle 2026-05-31)
- [ ] `@api dataMode` **INTERDIT** (LWC1503) → utiliser `@api sourceMode`
- [ ] Pas de suppression de `<property>` d'un composant déjà déployé sur une FlexiPage → garder en `// Legacy` avec commentaire

## 4. Apex controller

- [ ] Nom : `SE_FR_<Name>Controller`
- [ ] `with sharing` par défaut (`without sharing` interdit sans justif)
- [ ] Aucune requête `SELECT *` implicite → toujours nommer les champs
- [ ] Field-level check : `Schema.sObjectType.<Obj>.fields.<Field>.isAccessible()` avant SELECT
- [ ] `try/catch` sur toute SOQL user-driven, wrap en `AuraHandledException`
- [ ] Aucune référence à un CustomObject client-spécifique — utiliser standards Salesforce ou `String objectApiName` param
- [ ] Si le composant peut vivre avec ou sans Apex → offrir un `@api sourceMode = 'live'|'mock'` (mock = data hardcodée dans le JS)
- [ ] Test class : > 75% coverage, dans `_deploy/`

## 5. UX / Design guidelines (session 2026-05-29)

- [ ] Card chips : afficher CATÉGORIE (avec emoji), PAS persona
- [ ] `releaseStatus: new` pour tout nouveau composant → badge "✨ New"
- [ ] Boutons : `lightning-button-icon variant="border-filled" size="small"` (ronds) pour toggle/expand
- [ ] SLDS icons cassés (à éviter) : `standard:share`, `standard:social`
- [ ] SLDS icons OK : `standard:activations`, `standard:team_member`, `standard:groups`, `standard:service_contract`
- [ ] Valeurs par défaut VARIÉES (pas 6 fois la même)
- [ ] Pagination : 6 items par défaut + bouton chevron rond
- [ ] Palette sobre — pas de gradients rainbow
- [ ] Border-radius cohérent avec le reste de la lib (aligné sur `seFrContactCard`)

## 6. Frontmatter README (drive du manifest)

Chaque `seFr<Name>/README.md` doit avoir un frontmatter YAML :
```yaml
---
name: seFr<Name>
label: "SE FR - <Human Name>"
category: <Transverse|Productivity|Sales|Service|Marketing|Dashboards & KPIs|Geo & Field>
personas: [Sales, FieldSales, Telesales, Service, Retail, Marketing, All, Agents]
surfaces: [RecordPage, HomePage, AppPage]
objects: [Account, Contact, Opportunity, ...]
mobile: true|false
language: bilingual
controllers: [SE_FR_<Name>Controller]
sharedControllers: [SE_FR_AgendaController, ...]
releaseStatus: new|stable
requiresEinsteinAI: true|false
requiresCustomFields: true|false
contributedBy: <Author name>
---
```

## 7. Zips distribuables

- [ ] Rebuild `_zips/seFr<Name>.zip` (composant seul + Apex deps)
- [ ] Rebuild `_zips/seFr_all.zip` (pack complet)
- [ ] Shared Apex : inclure dans le zip si le composant en dépend (bug fixé dans commit `29110f9`)

## 8. Site (build)

- [ ] Ajouter au manifest : `python3 _build/build_manifest.py`
- [ ] Traduire : `python3 _build/translate_manifest.py`
- [ ] Regénérer site : `python3 _build/build_site.py`
- [ ] Preview PNG : mettre à jour `_previews/seFr<Name>.png` (parking : screenshots vitrine)

## 9. Cas particuliers observés

_À remplir au fur et à mesure des intégrations._

### 9.1 Prompt Launcher — fixes obligatoires
- **Source** : session RC 2026-06-09
- **Rationale** : `UserInfo.getSessionId()` renvoie un token non valide pour REST API dans le contexte Lightning des STORM/SDO
- **Fixes** :
  1. Remplacer les callouts HTTP `/services/data/v.../actions/standard/generatePromptResponse` par `Invocable.Action.createCustomAction('generatePromptResponse', promptApiName)`
  2. Parser les inputs SObject envoyés par le LWC (format `Input:Account` = `{"Id":"001..."}`) via `if (val instanceof Map<String, Object>)` puis `valMap.get('Id')`. ⚠️ **`instanceof Map` SANS type args ne compile pas** en Apex
  3. Ajouter un `enableEnrichmentFallback` (option `@api boolean`) : si le prompt Einstein retourne vide, construire un prompt enrichi avec les données SOQL et l'envoyer via `einstein_gpt__summarizeText` avec `Input:conversationTranscript` (data) + `Input:textToRephrase` (instructions)

### 9.2 Port `dimAccountActions` → `seFrAccountActions` (2026-10-15)
- **Source** : `~/Documents/Clients/DBI/2026-06 Démo CG Cloud V2/retrieved/lwc/dimAccountActions/`
- **Fixes appliqués** :
  1. **Visit sObject hardcodé → Flow configurable** (nouvelle règle 10.9). `handleStartVisit` qui créait un `Visit` via Apex a été remplacé par un `@api primaryActionFlowApiName` qui lance un Screen Flow dans une modale. Le record Id est passé comme input variable `recordId`. Aucune dépendance au managed package Field Service / Retail Execution.
  2. **Apex pattern Einstein** : HTTP callout `/actions/.../generatePromptResponse` → `ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate` (même pattern que `seFrContactCard.getPromptSummary`). Évite la nécessité d'un Named Credential.
  3. **CSS vars** : `--dim-*` → `--sefraa-*`. Palette rouge/bleu DIM supprimée au profit d'un `@api accentColor` configurable.
  4. **i18n FR/EN** : objet `LABELS` + getters dédiés (voir règle 2 — `{t('key')}` ne compile pas dans un template LWC).
  5. **Markdown parser** : conservé inline (règle 10.4). À factoriser dans `seFrMarkdown` lors du 3e port qui en a besoin.
- **Compliance checklist touché** : 0 (naming), 1 (purge DIM), 2 (i18n), 3 (meta xml + supportedFormFactors Small+Large), 4 (Apex `with sharing` + `AuraHandledException`), 5 (border-radius 12px, SLDS icons OK), 6 (frontmatter YAML complet), 9 (markdown parser inline), 10.4 + 10.9 (nouvelles règles).
- **Apex test class** : ❌ pas écrite — la lib existante n'a aucun test class aujourd'hui (constat 2026-10-15). Rule 4 "Test class > 75% coverage" est aspirationnelle. À traiter en lot à l'étape MCP server.

---

## 10. Patterns réutilisables inter-composants (identifiés 2026-10-15 lors de l'inventaire 35 LWCs)

### 10.1 Convention localStorage inter-composants (field flows)
- **Source** : DBI (dimStartVisit, dimProductsKpi, dimShelfSpace, dimQuickOrder, dimVisitSummaryAI).
- **Pattern** : prefix `seFr-<domain>-<key>::<recordId>` (ex : `seFr-visit-progress::001...`, `seFr-visit-insights::001...`).
- **Contrainte LWS** : l'event `storage` est bloqué → **poll setInterval 2000ms** pour détecter changements cross-composants.
- **Factorisation future** : utility `seFrSharedState` (shared LWC JS) avec `get(key, recordId)`, `set(key, recordId, value)`, `subscribe(key, recordId, callback)`.

### 10.2 Thinking-steps progress UX (simulated AI)
- **Source** : rbAgentforceSummary, rbCaseContext, rbClientSummaryModal, rbDraftEmailAI.
- **Pattern** : array de labels, `STEP_DURATION_MS` ~700-800ms, affichage progressif avec classes `done` / `current` / `pending` + check-icon.
- **Factorisation future** : composant `seFrThinkingSteps` réutilisable en child.

### 10.3 Streaming output char-par-char
- **Source** : rbDraftEmailAI.
- **Pattern** : `STREAM_CHUNK=4`, `STREAM_INTERVAL_MS=18ms`, setInterval qui pousse N chars à la fois.
- **Accessibilité** : prévoir `prefers-reduced-motion`, ne pas lancer plusieurs streams simultanés.

### 10.4 Markdown → HTML mini-parser
- **Source** : dimAccountActions (`_markdownToHtml`), ports suivants (rb* section parsers).
- **Pattern** : échape HTML brut en entrée AVANT toute transformation, support h2/h3/h4, listes `-|*|digit.`, bold/italic/code inline, paragraphes.
- **Sécurité** : toujours échaper `&`, `<`, `>` avant d'injecter via `lightning-formatted-rich-text` (sinon XSS).
- **Factorisation future** : utility `seFrMarkdown` partagée quand 3e composant utilise la logique.
- **Première utilisation lib** : `seFrAccountActions` (2026-10-15, inline).

### 10.5 Section parsing de LLM output structuré
- **Source** : rbAgentforceSummary, rbClientSummaryModal.
- **Pattern** : LLM renvoie "TITRE EN MAJUSCULES\n• bullet\n...\n\nAUTRE TITRE...". Parser découpe en blocs et mappe sur `SECTION_ICONS`.
- **Factorisation future** : helper `parseAISections(text, iconMap)`.

### 10.6 Chrome SpeechRecognition — auto-restart 60s
- **Source** : dimVoiceNote.
- **Pattern** : handler `onend` qui relance `recognition.start()` tant que `isRecording && !_intentionalStop`, en préservant `_baseTranscript` pour append (pas d'écrasement).
- **Règle lib** : tout composant dictée doit implémenter ce fix sinon la session se coupe silencieusement après ~60s sur Chrome.

### 10.7 Static Resource product images + fallback
- **Source** : septodontStockAssessment.
- **Pattern** : `imageUrl = p.imageFileName ? ${PRODUCT_IMAGES}/${p.imageFileName} : ${PRODUCT_IMAGES}/placeholder.png` + classe CSS `_placeholder` pour tint neutre.
- **Règle lib** : pour les composants "catalogue avec images", offrir soit `@api staticResourceName + fileField`, soit `@api imageUrlField` (champ URL direct).

### 10.8 Brand colors / theme mapping JSON
- **Source** : rcSellOutForm (`BRAND_COLORS`), dimQuickOrder (`PRODUCT_TAGS`).
- **Règle lib** : rendre `@api themeMappingJson` configurable pour éviter le hardcoding client.

### 10.9 Visit sObject fallback (Field Service / Retail Execution)
- **Source** : plusieurs composants DIM utilisent `Visit` (managed package).
- **Règle lib** : **ne jamais** hardcoder la création d'un `Visit` sObject dans un composant lib — c'est un object conditionné par le managed package Field Service / Retail Execution, pas universel. Toujours offrir au moins l'une de ces 3 alternatives :
  1. **Flow launch** (préféré) — `@api <action>FlowApiName` qui lance un Screen Flow personnalisable. Le Flow crée le record (Visit ou autre) côté admin.
  2. **Record Create via LDS** avec `@api objectApiName` paramétré (pattern rcNewVisit).
  3. **Mock mode** — `@api mockMode = true` qui simule l'action sans toucher la DB.
- Si Visit est le target principal du composant, déclarer **BOTH** `<object>Visit</object>` ET `<object>Account</object>` dans meta et prévoir un fallback gracieux.
- **Première utilisation lib** : `seFrAccountActions` (2026-10-15) — pattern Flow launch avec modale.

### 10.10 Side-effects display après action Apex
- **Source** : septodontPromptActions (`sideEffects`).
- **Pattern** : après un `callApex()`, afficher dans l'UI "✅ Task créée · 📝 Account mis à jour · 📧 Email envoyé" avec liens record. UX attendue sur les composants qui créent/modifient des records en coulisse.

### 10.11 Boutons : `lightning-button` SLDS-themed, jamais de bouton custom qui force une couleur
- **Source** : dimAccountActions utilisait des `<button class="sefraa-btn--primary">` avec `background: var(--sefraa-accent)` forcé à `#111` (noir). Rendu dans l'app CCO FR Smoke (theme violet #5867E8) : le bouton restait noir au lieu de prendre la couleur du thème actif.
- **Règle lib** :
  1. Toute action primaire doit utiliser `<lightning-button variant="brand">` — c'est elle qui pioche la couleur dans le thème LEX actif (via `--slds-g-color-brand-base-50` / `--lwc-brandAccessible`).
  2. Pour les actions secondaires : `variant="neutral"`. Destructive : `variant="destructive"`. Jamais de `<button class="...">` custom avec `background: #hex` figé.
  3. Stretch to full-width via `::part(button) { width: 100%; justify-content: center; }` sur la classe host — fonctionne dès API 60.
  4. Loading state : simplement `disabled` + label swap (ex. "Génération…"). `lightning-button` n'a pas de spinner intégré ; vouloir en mettre un oblige à repasser en button custom donc à repartir en couleur figée.
- **Première application** : `seFrAccountActions` (2026-10-16).

### 10.12 Icônes : standard-namespace pour les tiles, utility-namespace pour les icônes dans boutons
- **Source** : dimAccountActions utilisait un badge CSS custom `<span class="sefraa-icon">` noir avec un `<lightning-icon icon-name="utility:apex" variant="inverse">` dedans. Résultat : carré noir visible, icône blanche illisible à xx-small.
- **Règle lib** :
  1. **Headers de carte / avatars de section** → `<lightning-icon icon-name="standard:*" size="small">` **direct** (pas de badge wrapper). Les icônes `standard:` ont leur propre tile coloré SLDS-standard.
  2. **Icônes dans un `lightning-button`** → `icon-name="utility:*"` via la prop `icon-name` (pas d'icône custom slottée). `lightning-button` gère la couleur selon le variant.
  3. **Icônes seules sur fond sombre** → variant `inverse` reste OK, mais préférer `standard:` tile sur fond clair.
  4. **Choix sémantique de `standard:*`** : `standard:task` (quick actions), `standard:account` (card compte), `standard:einstein_action_strategy` (feature IA), `standard:recent` (activité récente), etc. Toujours un nom qui existe dans [Lightning Design System › Standard Icons](https://www.lightningdesignsystem.com/icons/).
- **Première application** : `seFrAccountActions` (2026-10-16).

### 10.13 Einstein Prompt Templates — detect HTML vs markdown avant d'injecter
- **Source** : `seFrAccountActions` smoke test 2026-10-16 — Einstein a renvoyé du HTML pré-rendu (`<p><strong><a href>…</p>`) mais le markdown parser escapait `<` → `&lt;`, affichant les balises en texte brut.
- **Règle lib** : avant tout parsing côté client, détecter si la réponse Einstein est HTML (`/<\/?[a-z][\s\S]*?>/i`) ou markdown :
  - HTML détecté → pass-through direct vers `<lightning-formatted-rich-text value={summary}>` (celui-ci safe-liste les tags, XSS déjà couvert).
  - Markdown → parser maison.
- **Pourquoi** : les prompt templates "Standard" (ex. `einstein_gpt__summarizeAccountDefault`) retournent du HTML. Les templates custom "Flex" peuvent retourner du markdown. On ne contrôle pas le format output côté admin → le composant doit s'auto-adapter.

### 10.14 Component ships with a default Flow (zero-wire ready-to-use)
- **Source** : `seFrAccountActions` 2026-10-16 — pattern 10.9 (Flow-launched action) laissait admin devoir créer son Flow avant que le bouton primaire soit utilisable. UX cassée out-of-the-box : "Démarrer une visite" → toast "Aucun Flow configuré".
- **Règle lib** : si un composant lance un Flow via `@api <action>FlowApiName`, il doit **shipper son propre Flow par défaut** dans son dossier :
  ```
  seFrAccountActions/
    flows/
      CCO_FR_Start_Visit.flow-meta.xml   ← Flow générique, zero managed-package dependency
    lwc/
    classes/
  ```
- **Contraintes du Flow shippé** :
  1. **Zero managed-package dep** — utiliser des sObjects standards (ex. `Event` pour une visite plutôt que `Visit` qui dépend de Retail Execution).
  2. **Input var `recordId: String`** — convention universelle. Le record courant est passé via `WhatId` / `WhoId`.
  3. **FR/EN labels pas obligatoire** sur un flow (admin peut cloner et traduire), mais FR est préféré pour cohérence avec la lib.
  4. **Status `Active`** à la deploy — sinon le bouton toast "Flow not found".
  5. **Default dans le meta.xml** : `<property name="xxxFlowApiName" default="CCO_FR_Start_Visit" ... />` + README annonce "Clone and point at your own Flow to override".
- **Gotchas Flow metadata (contournés 2026-10-16)** :
  - **Screen field refs**: dans `<elementReference>`, utiliser le `<name>` du field directement, SANS préfixer avec le `<name>` de la screen. `<elementReference>VisitStartTime</elementReference>` ✅, pas `visitScreen.VisitStartTime` ❌.
  - **API name uniqueness** : case-insensitive à travers TOUS les elements (variables, screens, screen fields, formulas, assignments). `startTime` variable collide avec `StartTime` screen field.
  - **Top-level formulas** : ne peuvent pas référencer un screen field (`{!visitScreen.StartTime}` dans une formula KO). Si besoin de calcul, soit faire ce calcul dans une inputAssignment (`<elementReference>` direct), soit forcer user à saisir les 2 bornes.
  - **allowBack / allowFinish / allowPause sur la 1ère screen** : la validation de deploy accepte `allowBack=true, allowFinish=false, allowPause=false` MAIS au runtime, Flow Runtime détecte que `allowBack` est inopérable (rien avant à revenir en arrière) → le compte comme `false` → **aucun bouton rendu dans le footer** (même avec `showFooter=true` + `nextOrFinishButtonLabel` défini + connector sortant). Symptôme : la modale affiche les champs mais pas de bouton "Suivant". **Fix** : sur une 1ère screen qui a un connector sortant, forcer `allowFinish=true` (le bouton sera auto-labélisé "Next" via `nextOrFinishButtonLabel` grâce au connector, pas "Finish"). `allowBack=false` + `allowFinish=true` est le combo correct pour une 1ère screen de milieu de flow.
- **Première application** : `seFrAccountActions` ships `CCO_FR_Start_Visit.flow-meta.xml` (crée un Event standard rattaché au record courant). Admin peut cloner et pointer `primaryActionFlowApiName` sur son propre Flow.

### 10.15 Embarquer `<lightning-flow>` → `lightning/modal` natif, PAS `slds-modal` custom
- **Source** : `seFrAccountActions` 2026-10-19 — flow lancé dans un wrapper custom `<section class="slds-modal">` + `<div class="slds-modal__content">` : la modale s'ouvrait correctement avec les champs du flow, MAIS le **footer natif du flow (bouton "Suivant" / label `nextOrFinishButtonLabel`) ne s'affichait pas**. Fix CSS (`min-height` + `max-height` + `overflow-y: auto` sur le content) **n'a pas résolu** le problème — `lightning-flow` rend son footer dans son propre shadow DOM et le dimensionnement du content container ne lui donne pas la hauteur attendue.
- **Règle lib** : pour lancer un Screen Flow depuis un composant lib, créer un petit LWC compagnon qui `extends LightningModal` :
  ```js
  // seFrFlowModal/seFrFlowModal.js
  import { api } from 'lwc';
  import LightningModal from 'lightning/modal';
  export default class SeFrFlowModal extends LightningModal {
      @api flowApiName; @api recordId; @api modalTitle = '';
      get flowInputVariables() { return [{ name: 'recordId', type: 'String', value: this.recordId }]; }
      handleFlowStatusChange(e) {
          const s = e.detail.status;
          if (s === 'FINISHED' || s === 'FINISHED_SCREEN' || s === 'ERROR') {
              this.close({ status: s, outputVariables: e.detail.outputVariables || [] });
          }
      }
  }
  ```
  ```html
  <!-- seFrFlowModal/seFrFlowModal.html -->
  <template>
      <lightning-modal-header label={modalTitle}></lightning-modal-header>
      <lightning-modal-body>
          <lightning-flow flow-api-name={flowApiName} flow-input-variables={flowInputVariables} onstatuschange={handleFlowStatusChange}></lightning-flow>
      </lightning-modal-body>
  </template>
  ```
  Et depuis le composant parent :
  ```js
  import SeFrFlowModal from 'c/seFrFlowModal';
  // ...
  await SeFrFlowModal.open({ size: 'medium', label: 'Démarrer une visite', flowApiName, recordId, modalTitle });
  ```
- **Pourquoi** : `lightning/modal` (API 55+) gère correctement le sizing + le shadow DOM de `<lightning-flow>`. Le footer du flow reste visible. Le modal gère aussi la touche Esc, le focus trap, l'accessibilité, le dismiss natif.
- **meta.xml** : `isExposed=false` sur le composant modal — c'est un helper interne, pas une tuile App Builder.

### 10.16 Flow shippé — fault handler obligatoire + sObject-field gotchas
- **Source** : `CCO_FR_Start_Visit` 2026-10-21 — Lionel clique "Planifier la visite", "rien ne se passe". Cause réelle = `recordCreate` échoue silencieusement : `INVALID_FIELD_FOR_INSERT_UPDATE: Event: bad field names on insert/update call: Type`. Sans fault handler le Flow s'arrête net dans le modal, pas de confirmation, pas d'erreur visible.
- **Règle lib** : tout `recordCreates/Updates/Deletes` d'un Flow shippé doit avoir un **`<faultConnector>`** vers un `errorScreen` qui affiche `{!$Flow.FaultMessage}` + guidance (causes fréquentes en FR). L'utilisateur ferme le modal via "Fermer" (`allowFinish=true` + `nextOrFinishButtonLabel="Fermer"`) et comprend ce qui a cassé.
- **Pattern errorScreen** :
  ```xml
  <screens>
      <name>errorScreen</name>
      <label>Erreur</label>
      <allowBack>false</allowBack>
      <allowFinish>true</allowFinish>
      <allowPause>false</allowPause>
      <fields>
          <name>errorText</name>
          <fieldType>DisplayText</fieldType>
          <fieldText>&lt;p&gt;❌ &lt;strong&gt;Impossible de ...&lt;/strong&gt;&lt;/p&gt;&lt;p&gt;{!$Flow.FaultMessage}&lt;/p&gt;&lt;p&gt;&lt;em&gt;Causes fréquentes : ...&lt;/em&gt;&lt;/p&gt;</fieldText>
      </fields>
      <nextOrFinishButtonLabel>Fermer</nextOrFinishButtonLabel>
      <showFooter>true</showFooter>
      <showHeader>false</showHeader>
  </screens>
  ```
- **sObject field gotchas** (constatés 2026-10-21) :
  - **Event standard N'A PAS de champ `Type`** côté SObject (il y a `EventSubtype` mais c'est pour la synchro Outlook/Google, pas insérable arbitrairement). Mettre `<inputAssignments><field>Type</field>...</inputAssignments>` sur Event = `INVALID_FIELD_FOR_INSERT_UPDATE` au runtime, deploy OK. **Vérifier via `sf sobject describe -s Event` avant de mettre un champ dans un flow shippé.**
  - **Event.WhatId** n'accepte PAS Lead/Contact — pour ceux-ci utiliser `WhoId`. Un flow générique qui ignore la distinction va fault sur un record Lead/Contact. Documenter la limite ou gérer avec un Decision sur `recordId` prefix (`003` = Contact, `00Q` = Lead → WhoId; sinon WhatId).
- **Première application** : `CCO_FR_Start_Visit` v3 (2026-10-21).

### 10.17 Flow → navigate to created record (close the loop UX)
- **Source** : `seFrAccountActions` 2026-10-21 — Lionel : "on clique sur Démarrer une visite et on se retrouve à planifier une, mais on ne la démarre pas / n'ouvre pas l'objet visite créé". Un flow qui crée un record puis affiche un écran "✅ créé" n'est **pas** suffisant — l'utilisateur veut atterrir sur la fiche.
- **Règle lib** : quand un composant lib lance un Flow qui crée un record, le Flow doit **output un `recordId`** (nom finissant par `Id`) et le LWC parent doit **naviguer vers ce record** après la fermeture du modal. Pas d'écran de confirmation intermédiaire — c'est redondant avec la navigation.
- **Pattern Flow** :
  ```xml
  <recordCreates>
      <name>createX</name>
      <assignRecordIdToReference>newXId</assignRecordIdToReference>
      <faultConnector><targetReference>errorScreen</targetReference></faultConnector>
      <!-- NO <connector> here : the flow finishes right after the create -->
  </recordCreates>
  <variables>
      <name>newXId</name>
      <dataType>String</dataType>
      <isOutput>true</isOutput>
  </variables>
  ```
- **Pattern LWC** (depuis le parent qui ouvre `SeFrFlowModal`) :
  ```js
  const result = await SeFrFlowModal.open({ ... });
  const outputs = result?.outputVariables || [];
  const idOutput = outputs.find(v => v?.name?.endsWith('Id') && v.value);
  if (result?.status === 'FINISHED' && idOutput) {
      this[NavigationMixin.Navigate]({
          type: 'standard__recordPage',
          attributes: { recordId: idOutput.value, actionName: 'view' }
      });
  }
  ```
- **Pourquoi `endsWith('Id')`** : convention stable à travers tous les flows shippés (`newEventId`, `newVisitId`, `newTaskId`…). Le parent n'a pas à connaître le nom exact, il résout génériquement.
- **Première application** : `seFrAccountActions` + `CCO_FR_Start_Visit` v4 (2026-10-21).
- **Première application** : `seFrAccountActions` (2026-10-19) → `seFrFlowModal`. Pattern réutilisable par tout composant lib qui lance un flow.

---

## Roadmap MCP CCO FR (owner cible)

**Vision** : serveur MCP qui automatise la soumission/qualification/adaptation d'un composant tiers vers la lib.

**Tools envisagés** :
- `submit_component(path)` → lint statique (naming, i18n, meta) + rapport
- `strip_client_refs(path, client_name)` → remplace strings + emails + custom fields hardcodés
- `generate_readme_frontmatter(path)` → intro le YAML à partir du meta.xml + du JS
- `rebuild_manifest()` → équivalent des 3 scripts python (`build_manifest` + `translate` + `build_site`)
- `preview_component(path)` → screenshot Playwright headless (déblocage screenshots vitrine)
- `check_apex_test_coverage(controller_name, org_alias)` → lance les tests, remonte le coverage
- `open_pr_for_component(component_name, branch)` → gh pr create + template review

**Prérequis** : ce fichier `LIB_COMPLIANCE_SPECS.md` **doit être exhaustif** — c'est la spec du serveur MCP. À maintenir en priorité à chaque intégration.

**Trigger de lancement projet MCP** : quand les intégrations DBI + Septodont + Yann/JD/Loic sont derrière nous → on aura suffisamment de patterns capturés.

---

## Handover CCO FR — contraintes infra à respecter

### ⚠️ Showcase org = DE org, PAS une SDO STORM

Retour d'expérience 2026-09-28 : SE_FR_SDO (`storm-ea9bc09d78eb59.my.salesforce.com`) est morte silencieusement (`NXDOMAIN`) après ~3 mois d'inactivité. Cette expiration a cassé 3 features du site en cascade (voir ci-dessous). Les SDO STORM sont conçues pour du démo temporaire, pas pour du hosting de long terme.

Contraintes que la nouvelle host org doit satisfaire :
- **Pérenne** (pas SDO, pas Trailhead Playground si possible — DE org self-signup ou Partner DE)
- **My Domain activé** (pour un `login_host` stable qui ne change pas)
- **Hébergée par une identité gérée par l'équipe** (pas un compte perso d'un SE, pour survivre à un départ)
- **Documentée** : Consumer Keys, Secrets, Private Keys stockés dans un password manager équipe (1Password/LastPass/Vault)

### ⛔ Blocage 2026-09-28 : self-signup DE bloqué pour SF employees

`developer.salesforce.com/signup` renvoie : *"We're sorry. Salesforce employees are not eligible."*

Options alternatives à évaluer pour la host org :
1. **DE via email perso non-SF** — bypass classique, mais lie l'org à un individu (pas idéal pour handover CCO)
2. **Partner DE** via un partner de l'écosystème (SI/ISV) — nécessite un contact partner
3. **Trailhead Playground** — accessible aux employees via Trailhead, mais expire après 365j d'inactivité (à valider)
4. **Signature Success Foundation Org** ou équivalent org SF interne long-lived — demander à IT/CCO
5. **Compte de service dédié** créé par le CCO FR (compte partagé équipe avec email de fonction) → self-signup DE avec ce compte
6. **Automatiser la re-provisioning** via un MCP tool : accepter que l'org expire et scripter la recréation d'org + Connected App + agent + Data Library en < 30 min (option ambitieuse, cible du serveur MCP à long terme)

> ⚠️ **MAJ 2026-11-09** : les mentions `LWC_Library_Data_Library`, « Feature Assignment » et agents Service/Employee ci-dessous sont OBSOLÈTES. État actuel : Data Library `SE_FR_Library_Knowledge`, agent `LWC_Library_Agent` grounded par action `streamKnowledgeSearch` — voir `MAINTENANCE_RUNBOOK.md` (source de vérité).

### Specs exactes de la host org

**Metadata / config requis** :
- ✅ My Domain activé + Deploy to Users (login_host stable en `<subdomain>.develop.my.salesforce.com`)
- ✅ Connected App unique portant les 3 flows nécessaires :
  - **OAuth Web/User-Agent** (bouton "Connecter à mon org") — callback `https://<heroku>.herokuapp.com/oauth/callback`, scopes `api refresh_token web`
  - **Client Credentials Flow** (agent widget chat) — "Run As" user configuré, scope `api` + accès Einstein AI Agent API
  - **JWT Bearer** (showcase-visitor login live) — Digital Signatures ON, certificat public uploadé (le private key correspondant vit sur Heroku en `SF_SHOWCASE_PRIVATE_KEY`)
- ✅ User `showcase-visitor@<domain>` avec permset "LWC Library Showcase" (accès lecture aux comptes/contacts de démo + FLS sur champs custom éventuels)
- ✅ Agent Service `LWC Library Service Agent` (type AgentforceServiceAgent) — recréé, ID à remonter sur Heroku (`SF_AGENT_ID`)
- ✅ Agent Employee `LWC Library Employee Agent` (type AgentforceEmployeeAgent) — usage interne debug
- ✅ Data Library `LWC_Library_Data_Library` avec le PDF de la KB uploadé (source : `_doc/CCO_FR_Library_Knowledge_v*.pdf`)
- ✅ Feature Assignment : Data Library → attachée aux 2 agents
- ✅ Permset `Data Cloud User` (`GenieUserEnhancedSecurity`) + `CDPAdmin` sur le user qui gère l'agent
- ✅ Objets démo peuplés : Accounts, Contacts, Opportunities avec des données réalistes pour que les composants aient qqch à afficher en preview

**3 features du site qui dépendent de cette org** :
1. **Bouton "↗ Connecter à mon org"** — flow OAuth user-agent PKCE. Casse = user ne peut plus déployer un composant vers sa propre org depuis le site.
2. **Chat widget en bas à droite** — flow Client Credentials pour appeler Einstein AI Agent API sur `SF_AGENT_ID`. Casse = chat inutilisable, l'agent Service ne répond plus aux questions sur les composants.
3. **Preview live composants** (feature "Showcase") — flow JWT Bearer avec RSA private key, login-as `showcase-visitor@...` puis frontdoor.jsp vers une Lightning page. Casse = l'utilisateur ne peut plus voir un composant "live" dans un contexte Salesforce réel depuis le site.

**Env vars Heroku correspondants** (à re-setter à chaque bascule d'org) :

| Feature | Env vars |
|---|---|
| Bouton Connect | `SF_CLIENT_ID`, `SF_CLIENT_SECRET` |
| Chat widget | `SF_AGENT_CLIENT_ID`, `SF_AGENT_CLIENT_SECRET`, `SF_AGENT_LOGIN_HOST`, `SF_AGENT_ID` |
| Preview live | `SF_SHOWCASE_CLIENT_ID`, `SF_SHOWCASE_LOGIN_HOST`, `SF_SHOWCASE_USERNAME`, `SF_SHOWCASE_PRIVATE_KEY` (+ landing URL `SF_SHOWCASE_LANDING`) |

`PUBLIC_BASE_URL` = URL Heroku publique (défaut `https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com`) — sert à construire la `redirect_uri` OAuth.

### Runbook migration d'org host (une fois DE dispo)

1. Créer la DE + activer My Domain (`<subdomain>.develop.my.salesforce.com`)
2. Setup → Users → create `showcase-visitor@<domain>` (profil Standard User + permset "LWC Library Showcase")
3. Setup → App Manager → New Connected App "SE FR Library Site" :
   - Enable OAuth Settings ON
   - Callback : `https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com/oauth/callback`
   - Selected Scopes : `api`, `refresh_token`, `web`
   - Enable Client Credentials Flow ON — Run As : le user showcase-visitor (ou un user admin dédié)
   - Enable Digital Signature ON — upload cert public (générer paire avec `openssl req -x509 -sha256 -nodes -days 3650 -newkey rsa:2048 -keyout showcase.key -out showcase.crt`, garder `.key` pour Heroku `SF_SHOWCASE_PRIVATE_KEY`)
4. Save → attendre 10 min (propagation) → Manage → Edit Policies :
   - Permitted Users : "Admin approved users are pre-authorized"
   - Assigner un permset au user showcase-visitor pour autoriser la Connected App
5. Recopier Consumer Key + Consumer Secret
6. Recréer les 2 agents (Employee + Service) via `_agent/LWC_Library_Agent.yaml` + upload PDF KB dans Data Library + Feature Assignment
7. Update Heroku config vars (voir table ci-dessus) — batch en une commande :
   ```bash
   heroku config:set \
     SF_CLIENT_ID=<CK> SF_CLIENT_SECRET=<CS> \
     SF_AGENT_CLIENT_ID=<CK> SF_AGENT_CLIENT_SECRET=<CS> \
       SF_AGENT_LOGIN_HOST=<new-domain>.develop.my.salesforce.com \
       SF_AGENT_ID=<new-agent-id> \
     SF_SHOWCASE_CLIENT_ID=<CK> \
       SF_SHOWCASE_LOGIN_HOST=<new-domain>.develop.my.salesforce.com \
       SF_SHOWCASE_USERNAME=showcase-visitor@<new-domain> \
     -a lwc-library-se-fr
   ```
   (`SF_SHOWCASE_PRIVATE_KEY` inchangé si on garde le même keypair)
8. `heroku restart -a lwc-library-se-fr`
9. Smoke test : bouton Connect, chat widget, preview live

### Heroku app
- Nom actuel : `lwc-library-se-fr` (rename cible : `cco-fr-library`)
- Deploy manuel `git push heroku main` — pas d'auto-deploy GitHub
- Owner actuel : `lionel.braun@salesforce.com` — **à transférer à un compte équipe CCO FR** lors du handover

### 🧭 Apps + Tabs pré-configurées par "famille / use case" (TODO showcase org)

**Objectif** : quand on crée une nouvelle showcase org, on ne doit PAS avoir à bricoler manuellement Apps + Tabs + FlexiPages pour chaque famille de composants. L'équipe CCO FR doit pouvoir déployer en un `sf project deploy` les sets suivants pré-packagés dans la lib :

**Famille Transverse / Productivity** (Sales Rep classique) — App "SE FR Rep Home" avec tabs : Home (seFrFieldRepHome), Accounts, Opportunities, Tasks
**Famille Field / Retail Exec** (CPG, pharma, dental) — App "SE FR Field" avec tabs : Home (seFrStartVisit/seFrFieldRepHome), Store Map, Shelf Check, Orders
**Famille Service** — App "SE FR Service Desk" avec tabs : Home (seFrServiceHome), Cases, Knowledge, Conversation Summary
**Famille Dashboards & KPIs** — App "SE FR Analytics" avec tabs : Manager Cockpit, Products KPI, Revenue Dashboard
**Famille Marketing** — App "SE FR Marketing" (à définir : Active Segments, Engagement, Consent)
**Famille Agentforce / AI** — App "SE FR AI" avec tabs : Agent Launcher, Prompt Launcher, Smart Recommendations

**Livrable** : dossier `_deploy/showcase/<famille>/` dans la lib contenant `applications/`, `tabs/`, `flexipages/` prêts à `sf project deploy`.

**Priorité** : moyenne. À faire une fois 15-20 composants intégrés — avant d'ouvrir au reste de la team CCO FR.
