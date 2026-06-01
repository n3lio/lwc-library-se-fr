# LWC Library — Security Audit before Public Release
**Date** : 2026-05-31
**Repo** : `/Users/lionel.braun/Projects/lwc-library/` (currently `n3lio/lwc-library-se-fr`, private)
**Scope** : 817 tracked files, 50 commits, full history scanned

---

## Verdict global : **needs-cleanup** (low severity)

No bloquant. No real secret was ever committed. All findings are PII/internal-attribution choices to confirm with the contributors before flipping the repo public.

---

## Clean (OK as-is)

- **No secrets in HEAD or in git history.** `.env*`, `*.pem`, `*.key`, `.secrets/`, `_staging/`, `backups/`, `original-assets/` are all gitignored AND never committed (`git log --all --full-history` returns empty for those patterns).
- **`.gitignore` is comprehensive** : env, secrets, pem/key, staging, backups, IDE, sfdx, node_modules, python, claude-local — all covered.
- **OAuth Connected App** : `SF_CLIENT_ID`, `SF_CLIENT_SECRET`, `SF_AGENT_CLIENT_ID/SECRET`, `SF_SHOWCASE_CLIENT_ID`, `SF_SHOWCASE_PRIVATE_KEY` are 100 % env-var driven (server.js / agent.js). Public `/api/oauth/config` exposes only `clientId` (which is the public half by design) + redirect_uri.
- **Tracking endpoints** (`/api/track/visit|download|deploy|intent|like|counts`) sanitize input, cap field sizes, hash IPs (SHA-256 + salt). Admin panel is gated by HMAC-signed cookie + `ADMIN_PASSWORD` env var.
- **Heroku files** : `Procfile`, `package.json`, `db.js`, `scripts/migrate.js` reference `DATABASE_URL` only via `process.env`. No hardcoded URLs.
- **Embedded Messaging config** (`00DJ9000001uyAv` + `storm-ea9bc09d78eb59.my.site.com`) — confirmed public by design (this is the showcase SDO already exposed via the deployed site).
- **No certificates / JWT / Bearer / AKIA / sk_live / ghp_ tokens** anywhere in tracked files or history.
- **Mock data** (`_tools/seed_omega.apex`, `Omega, Inc.`, `Lauren Bailey`, phones `+33 1 00 00 0X`) is fictitious — safe.
- **No real customer / opp / prospect names** found (BNP, LVMH, Renault, Carrefour, Decathlon, EDF, Orange-as-company, etc. all clear).
- **No Drive sharing tokens** with credentials inline. The single Drive folder URL (`/drive/folders/1J0g2k5mMvS5lHUKdisWgOiCDjsOTtpr9`) is a folder id only — sharing is controlled at Drive level, not via URL token.

---

## A nettoyer avant public (warnings, actionable)

1. **Internal `@salesforce.com` emails in tracked source** :
   - `lionel.braun@salesforce.com` : in `server.js:52` (NOTIFY_TO default), `_doc/SE_FR_LIBRARY_USER_GUIDE_FR.md:862`, `_site/assets/user-guide-fr.md:862`, `_agent/LWC_Library_Agent.yaml:278`, `_build/build_site.py:1271,1400`, `_site/assets/site.js:116,245`, `_deck/index.html:2847`, `_deck/AppsScript_GenerateSlides.gs:1283`, `_build/build_apps_script.py:270`. **Action** : confirm Lionel is OK exposing his SF email publicly (it is the maintainer contact), or replace by a generic alias / GitHub Issues link.
   - `REDACTED` : `seFrContactCard/README.md:14,33`, `_build/manifest.json:926`, `_build/manifest.fr.json:950`. **Action** : ask Charly's consent before publishing his email.
   - `REDACTED` : 3× README + 3× manifest entries. **Action** : ask Thomas's consent.

2. **Real names + role on contributors page** : `_site/contributors.html:73,91,105` lists "Lionel Braun · Solution Engineer France", "Charly Ansel · Solution Engineer France", "Thomas Plaindoux · Solution Engineer France". Public attribution is the explicit purpose of the page, but **explicit opt-in from Charly + Thomas is required** before flipping public.

3. **Local Google Drive paths** in build scripts : `_build/build_site.py:56`, `_build/sync_zips_to_drive.py:27` hardcode `GoogleDrive-lionel.braun@salesforce.com/Mon Drive/`. Not a security risk (path on Lionel's laptop), but it leaks the maintainer's Drive account name. **Action** : parameterize via env var or `os.path.expanduser('~')` lookup.

4. **Weak default fallback secrets** in code :
   - `db.js:32` : `IP_HASH_SALT || 'sefr-default-salt-change-me'`
   - `admin.js:13` : `SESSION_SECRET || IP_HASH_SALT || 'sefr-admin-default'`
   - `admin.js:432` : `SF_CLIENT_SECRET || 'sefr-default'` (HMAC fallback)
   These defaults are now public knowledge after the repo flips. **Action** : on Heroku, verify `IP_HASH_SALT`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `SF_CLIENT_SECRET` are all set with strong values (Heroku already does, but worth a `heroku config` sanity check). Consider hard-failing instead of falling back to a default — log + 503 if these are missing.

5. **Internal-flavored docs** : `_doc/SITE_IDEAS.md`, `_agent/LWC_Library_Agent.yaml` describe the project from an "internal SE FR" angle ("Internal assistant for the SE FR Component Library", "SE EMEA"). Not sensitive, but reads as internal-only. **Action** : optional rephrase, not blocking.

6. **Storm SDO record IDs** in `_agent/LWC_Library_Agent.yaml` (Account `001J900000Jz1FuIAJ`, Contact `003J900000IRlytIAD`, RAG config `ARFPC_1JDJ900000080jzOAE`, agent user `lwc_library_agent@00dj9000001uyav1559600899.ext`). The org itself is public, but exposing the RAG feature config ID and the agent integration user could enable enumeration. **Action** : low priority — document acceptable risk or move IDs to env vars.

---

## Bloquant : **none**

No hardcoded production secret, no customer PII, no real prospect data, no certificate / private key in HEAD or history. **No `git filter-repo` rewrite needed.**

---

## Recommandations finales avant `gh repo edit --visibility public`

1. Get explicit OK from Charly Ansel + Thomas Plaindoux for email + name publication.
2. Decide if `lionel.braun@salesforce.com` stays as the public maintainer contact, or switch to a GitHub Issues link / aliased mailbox.
3. `heroku config` sanity check : confirm `IP_HASH_SALT`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `SF_CLIENT_SECRET`, `SF_AGENT_CLIENT_SECRET`, `SF_SHOWCASE_PRIVATE_KEY`, `MAILGUN_API_KEY`, `DATABASE_URL` are all set with strong values.
4. (Optional) Replace `GoogleDrive-lionel.braun@salesforce.com/Mon Drive/` hardcoded paths with `~/Library/CloudStorage/GoogleDrive-*/Mon Drive/` glob or env var.
5. (Optional) Add a `SECURITY.md` describing the responsible-disclosure path and clarify that the showcase SDO `storm-ea9bc09d78eb59` is intentionally public.
6. Update `package.json` `"private": true` → `false` if you intend npm publishing (not required for GitHub-only public).

Once 1-3 are confirmed, the repo is **safe to publish**.
