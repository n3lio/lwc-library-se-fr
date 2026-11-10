# Security policy

The SE FR Component Library is a community project of Salesforce Solution Engineers (France). It ships
Lightning Web Components, a public showcase site and a public demo assistant.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Write to
**lionel.braun@salesforce.com** with:

- what you found and where (URL, file, endpoint),
- steps to reproduce,
- the impact you foresee.

You will get an acknowledgement within a few working days. Fixes for confirmed issues are released
as soon as possible, and you will be credited if you wish.

## Scope

In scope:

- the showcase website and its API (`/api/*`, OAuth callback, tracking, assistant proxy),
- the code in this repository (site server, build scripts, components, Apex),
- the repository history (accidentally committed secrets).

Out of scope: denial-of-service by volume, social engineering, third-party services (Salesforce,
Heroku, GitHub), automated scanner output without a demonstrated impact.

## Things that are public on purpose

- The showcase org is a **Developer Edition populated with fictitious demo data** (no customer or
  personal data). Visitor access is limited to what the demo needs.
- Component source code, READMEs and the knowledge base the assistant answers from.

## How secrets are handled

- No credential is committed. Runtime secrets (OAuth client secret, JWT private key, session and
  hashing salts, admin password, assistant client credentials) live in Heroku config vars only.
  `.env.example` documents the variable names, never values.
- Visitor IP addresses are never stored in clear: they are hashed with a salt before any tracking
  insert.
- The assistant runs as a dedicated low-privilege user and answers only from the library knowledge
  base; it has no write action.

## If you deploy this site yourself

Set strong random values for `IP_HASH_SALT`, `SESSION_SECRET`, `OAUTH_HMAC_SECRET` and
`ADMIN_PASSWORD` (e.g. `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`). In
production the server refuses to start without a strong `IP_HASH_SALT` / `SESSION_SECRET`.
