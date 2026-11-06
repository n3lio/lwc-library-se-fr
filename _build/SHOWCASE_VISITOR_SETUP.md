# Setup du bouton "Visiter la démo" — Showcase Visitor

**Date** : 2026-10-23
**Org** : `cco-fr-de` → `orgfarm-032613f3e0-dev-ed.develop.my.salesforce.com`

Le site Heroku (`server.js`) a **déjà** la plomberie côté app (endpoint `/showcase`, JWT bearer flow + `frontdoor.jsp`, counter clics). Il manque juste la config côté Salesforce + 4 env vars Heroku.

---

## État actuel (fait automatiquement, 2026-10-23)

| Composant | État |
|---|---|
| **User** `visiteur@cco-fr-showcase.demo` | ✅ créé, actif, Alias `visshw`, Profile `Minimum Access - Salesforce`, Locale fr_FR_EURO, TZ Europe/Paris. **User Id** : `005gK00008wZRlNQAW` |
| **PermSet** `CCO_FR_Showcase_Visitor` | ✅ déployé + assigné au user |
| **PermSet** `CCO_FR_Showcase_App` | ✅ updaté avec tab `CCO_FR_RetailExec_Home` |

### Ce que fait le permset `CCO_FR_Showcase_Visitor`

- **App** : `CCO_FR_Showcase` visible
- **Tabs** : 5 AppPage tabs (FieldSales/RetailExec/Telesales/Territory Pipeline/Marketing) + Visit__c + les 6 standards (Account/Contact/Opp/Case/Lead/Order)
- **Objects** (Read + Create + Edit, **no Delete, no Modify All, no View All**) :
  - Account, Contact, Opportunity, Case, Lead, Order, OrderItem, Task, Event, Visit__c
- **FLS** : full read+edit sur les 9 fields de Visit__c
- **System perms** : `ApiEnabled` + `RunReports` uniquement. Pas de Setup. Pas de Modify All Data. Pas d'export. Pas de mass email.

### Pourquoi ce scope (traçabilité)

Les composants de la lib qui écrivent en DB (grep `insert | update` dans `classes/SE_FR_*.cls` + `createRecord/updateRecord` dans les LWC) :

| Composant | Écrit sur | Raison |
|---|---|---|
| `seFrVoiceNoteTaker` | Task | `insert newTask` |
| `seFrRecordActions` (Flow Start Visit) | Visit__c | Flow crée Visit Planned |
| `seFrOrderEntry` | Order + OrderItem | Prise de commande |
| `seFrOrderSummary` | Order | update status/dates |
| `seFrKanbanBoard` | Account/Opp/Case | drag-and-drop stage |
| `seFrRecordHighlights` | current record | inline edit |
| `seFrMyTasks` | Task | mark complete |
| `seFrFilesGallery` + `seFrPromptLauncher` + `seFrImageFile` | ContentVersion/Note | pas besoin de perm objet (ownership) |

Donc Create+Edit nécessaires sur : Account, Contact, Opp, Case, Lead, Order, OrderItem, Task, Event, Visit__c. **Delete coupé** pour éviter qu'un visiteur vide la demo data.

---

## Étape manuelle 1 — Mot de passe du user (optionnel)

Le JWT flow (bouton Heroku) **n'a PAS besoin** de password : le user est pre-approved sur la Connected App via cert.

Si tu veux pouvoir te logger manuellement en tant que ce user pour tester (ou donner les creds à un client en dépannage) :

**Setup → Users → Users** → chercher "Visiteur Showcase" → **Reset Password**
- L'email de reset part vers `visiteur@cco-fr-showcase.demo` qui n'existe pas réellement
- Soit tu changes l'email vers le tien d'abord, soit tu utilises "Set Password" (lien Setup bouton direct en haut, si Enhanced Profile UI dispo)

Alternative plus simple :
```bash
# depuis l'org, dans Developer Console → Debug → Execute Anonymous :
System.setPassword('005gK00008wZRlNQAW', '<password_choisi>');
```

---

## Étape manuelle 2 — Connected App JWT

Il faut un cert RSA. Si tu en as déjà un pour l'admin login OAuth, tu peux réutiliser (ou en générer un neuf, cf. plus bas).

### Si pas de cert : générer

```bash
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout ~/.ssh/sf-showcase-visitor-jwt.key \
  -out ~/.ssh/sf-showcase-visitor-jwt.crt \
  -days 1825 \
  -subj "/CN=cco-fr-showcase-jwt"
```

`.key` = `SF_SHOWCASE_PRIVATE_KEY` (env var Heroku, avec `\n` réels).
`.crt` = à uploader côté Connected App.

### Connected App

**Setup → App Manager → New Connected App → New Connected App** (choisir "New Connected App", pas "External Client App") :

- **Name** : `Showcase Visitor JWT`
- **API Name** : `Showcase_Visitor_JWT`
- **Contact Email** : lionel.braun@salesforce.com
- **Enable OAuth Settings** : ✅
  - **Callback URL** : `https://login.salesforce.com/services/oauth2/success` (placeholder, pas utilisé par JWT)
  - **Use digital signatures** : ✅ → upload `.crt`
  - **Selected OAuth Scopes** :
    - `Access the identity URL service (id, profile, email, address, phone)`
    - `Perform requests at any time (refresh_token, offline_access)`
    - `Full access (full)` (pour qu'un visiteur bouge librement dans l'app)
  - **Require Secret for Web Server Flow** : ❌ (JWT bearer n'utilise pas de secret)
  - **Require Secret for Refresh Token Flow** : ❌

Save → attendre 2-10 min la propagation.

### Pre-authorize le user visiteur

**Manage** sur la Connected App → **Edit Policies** :
- **Permitted Users** : `Admin approved users are pre-authorized`
- **IP Relaxation** : `Relax IP restrictions` (sinon frontdoor peut rejeter)
- Save

Puis **Manage Permission Sets** → ajouter `CCO_FR_Showcase_Visitor` (ou **Manage Profiles** → ajouter `Minimum Access - Salesforce` si tu préfères le profile-level).

### Récupérer le Consumer Key

**Manage Consumer Details** (bouton en haut après Save) → copier le **Consumer Key** → c'est `SF_SHOWCASE_CLIENT_ID`.

---

## Étape manuelle 3 — Config Heroku

```bash
cd ~/Documents/Internal/lwc-library  # ou l'app Heroku rattachée
heroku config:set \
  SF_SHOWCASE_CLIENT_ID='<Consumer Key copié>' \
  SF_SHOWCASE_LOGIN_HOST='orgfarm-032613f3e0-dev-ed.develop.my.salesforce.com' \
  SF_SHOWCASE_USERNAME='visiteur@cco-fr-showcase.demo' \
  SF_SHOWCASE_PRIVATE_KEY="$(cat ~/.ssh/sf-showcase-visitor-jwt.key)" \
  SF_SHOWCASE_LANDING='/lightning/n/CCO_FR_RetailExec_Home' \
  --app lwc-library-se-fr
```

`SF_SHOWCASE_LANDING` est optionnel (défaut `/lightning/page/home`). Les 4 valeurs utiles pour tomber direct sur une page sexy :
- `/lightning/n/CCO_FR_RetailExec_Home` → AppPage Retail Execution (recommandé — c'est la plus riche)
- `/lightning/n/CCO_FR_FieldSales_Home` → AppPage Field Sales
- `/lightning/app/CCO_FR_Showcase` → app par défaut (standard home)
- `/lightning/n/Visit__c` → liste des visites

---

## Test de bout en bout

1. `heroku logs --tail --app lwc-library-se-fr` dans un terminal
2. Ouvrir https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com
3. Cliquer le bouton "Showcase visitor" (ou équivalent)
4. On doit atterrir sur la landing page, loggé en `Visiteur Showcase`
5. Vérifier dans l'URL en haut à droite du Lightning : avatar = "VS"

Si ça foire : regarder logs Heroku pour l'erreur JWT (invalid_client_id, invalid_app_access, user_hasnt_approved, etc.).

### Pièges fréquents

| Erreur JWT | Cause | Fix |
|---|---|---|
| `invalid_client_id` | Consumer Key coupé/mal collé | Re-copier depuis Manage Consumer Details |
| `invalid_grant: user hasn't approved this consumer` | Pre-authorize pas fait | Edit Policies + Manage Permission Sets |
| `invalid_grant: issued_at` | Horloge serveur Heroku vs org drifte | Rare — rebooter dyno |
| `invalid_grant: audience` | `aud` ne matche pas | server.js détecte `test.salesforce.com` vs `login.salesforce.com` auto, vérifier que `SF_SHOWCASE_LOGIN_HOST` ne contient pas `test.` par erreur |
| frontdoor renvoie login page | Scope `full` manquant OU IP Restrictions pas `Relax` | Fix Connected App settings |

---

## Rollback / désactiver le visiteur

```bash
# désactiver le user (sans delete)
sf data update record --target-org cco-fr-de --sobject User --record-id 005gK00008wZRlNQAW --values "IsActive=false"

# ou retirer le permset :
sf org assign permset --target-org cco-fr-de --name CCO_FR_Showcase_Visitor --on-behalf-of visiteur@cco-fr-showcase.demo --remove  # pas de flag --remove, utiliser l'UI ou l'API

# ou juste couper les env vars Heroku :
heroku config:unset SF_SHOWCASE_CLIENT_ID SF_SHOWCASE_PRIVATE_KEY --app lwc-library-se-fr
```
