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

## Hardening in place (2026-11-10 audit)

- Strict Salesforce host validation for OAuth/deploy (parsed hostname, allowlist, URL rebuilt, no redirects, timeouts).
- All dynamic output escaped (OAuth callback, admin dashboard); CSP (nonce on the callback page), HSTS,
  X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy on every response; SRI on third-party scripts.
- "Deploy to my org": scope `api` only, no refresh token, access token kept in `sessionStorage` (tab only).
- Per-route rate limits + global API limit (in memory, per hashed IP); admin login lockout (5 failures / 15 min).
- Admin: constant-time compares, 12 h session, `HttpOnly; Secure; SameSite=Strict` cookie, JSON-only writes with
  same-origin check. Attachment links are HMAC-signed and expire (7 days).
- Upstream error bodies are never returned to clients; usage stats are admin-only.

## If you deploy this site yourself

Also set a dedicated `ATTACHMENT_TOKEN_SECRET` (otherwise derived from another secret, with a warning). Set strong random values for `IP_HASH_SALT`, `SESSION_SECRET`, `OAUTH_HMAC_SECRET` and
`ADMIN_PASSWORD` (e.g. `python3 -c "import secrets; print(secrets.token_urlsafe(48))"`). In
production the server refuses to start without a strong `IP_HASH_SALT` / `SESSION_SECRET`.
