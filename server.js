'use strict';

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');
const fastify = require('fastify');
const { query, hashIp, getPool } = require('./db');

// ───────────────────────────────────────────────────────────────────────────
// Config

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';
const SITE_DIR = path.join(__dirname, '_site');
const ZIPS_DIR = path.join(__dirname, '_zips');

// Connected App credentials — set via `heroku config:set SF_CLIENT_ID=... SF_CLIENT_SECRET=...`
// Used for the user-agent flow (SE connects to their own org for deploy).
const SF_CLIENT_ID = process.env.SF_CLIENT_ID || '';
const SF_CLIENT_SECRET = process.env.SF_CLIENT_SECRET || '';

// Showcase Connected App — JWT Bearer Token Flow, runs as the Showcase Visitor bot
// user on the SE FR showcase org. We need a UI-capable session (web scope) so
// frontdoor.jsp accepts it; client_credentials only mints api-only tokens which
// frontdoor refuses, hence the JWT path.
//
// Required env vars:
//   SF_SHOWCASE_CLIENT_ID    — Connected App Consumer Key
//   SF_SHOWCASE_LOGIN_HOST   — org My Domain (e.g. storm-xxx.my.salesforce.com)
//   SF_SHOWCASE_USERNAME     — bot user's Username (e.g. showcase-visitor@...)
//   SF_SHOWCASE_PRIVATE_KEY  — RSA private key PEM (the matching .crt is uploaded
//                              to the Connected App as the digital signature cert)
const SF_SHOWCASE_CLIENT_ID = process.env.SF_SHOWCASE_CLIENT_ID || '';
const SF_SHOWCASE_LOGIN_HOST = (process.env.SF_SHOWCASE_LOGIN_HOST || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const SF_SHOWCASE_USERNAME = process.env.SF_SHOWCASE_USERNAME || '';
const SF_SHOWCASE_PRIVATE_KEY = (process.env.SF_SHOWCASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
// Where on the showcase org we drop the SE after frontdoor (default = LEX home).
const SF_SHOWCASE_LANDING = process.env.SF_SHOWCASE_LANDING || '/lightning/page/home';

// Light in-memory click counter for the showcase button (resets on dyno restart;
// good enough for a "is anyone using it" pulse — proper analytics live in Plausible
// later). Map<dateString, count>.
const SHOWCASE_CLICKS = new Map();

// ─── Mailgun (notification emails) ──────────────────────────────────────────
// Heroku addon sets MAILGUN_API_KEY + MAILGUN_DOMAIN. Best-effort — DB inserts
// never fail because of an email hiccup.
const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY || '';
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || '';
const NOTIFY_TO = process.env.NOTIFY_EMAIL || 'lionel.braun@salesforce.com';
const NOTIFY_FROM = process.env.NOTIFY_FROM || (MAILGUN_DOMAIN ? `SE FR Library <noreply@${MAILGUN_DOMAIN}>` : '');

async function sendNotificationEmail({ subject, text, html, replyTo }) {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) return; // not configured
  try {
    const form = new URLSearchParams();
    form.set('from', NOTIFY_FROM);
    form.set('to', NOTIFY_TO);
    form.set('subject', subject);
    form.set('text', text || '');
    if (html) form.set('html', html);
    // Reply-To = the actual SE so a reply from your inbox lands directly with them.
    // Putting their email here (header) instead of in the body avoids Gmail
    // 'espblock' (looks like spoofing when sandbox.mailgun.org sends a body
    // claiming "from <name>@salesforce.com").
    if (replyTo) form.set('h:Reply-To', replyTo);
    const auth = Buffer.from('api:' + MAILGUN_API_KEY).toString('base64');
    const resp = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('Mailgun send failed:', resp.status, body.slice(0, 300));
    }
  } catch (err) {
    console.error('Mailgun send threw:', err.message);
  }
}

async function sendNotificationEmailWithAttachment({ subject, text, html, attachment, replyTo }) {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) return;
  try {
    // Build multipart/form-data manually so we can stream the binary attachment.
    const boundary = '----SeFrLib' + crypto.randomBytes(8).toString('hex');
    const lines = [];
    const push = (s) => lines.push(Buffer.from(s, 'utf-8'));
    function field(name, value) {
      push(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
    }
    field('from', NOTIFY_FROM);
    field('to', NOTIFY_TO);
    field('subject', subject);
    if (text) field('text', text);
    if (html) field('html', html);
    if (replyTo) field('h:Reply-To', replyTo);
    if (attachment && attachment.buffer && attachment.buffer.length) {
      push(`--${boundary}\r\nContent-Disposition: form-data; name="attachment"; filename="${attachment.filename}"\r\nContent-Type: ${attachment.mime}\r\n\r\n`);
      lines.push(attachment.buffer);
      push('\r\n');
    }
    push(`--${boundary}--\r\n`);
    const body = Buffer.concat(lines);
    const auth = Buffer.from('api:' + MAILGUN_API_KEY).toString('base64');
    const resp = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + auth,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      console.error('Mailgun (with attachment) failed:', resp.status, t.slice(0, 300));
    }
  } catch (err) {
    console.error('Mailgun (with attachment) threw:', err.message);
  }
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Salesforce Metadata API version used for package.xml + deployRequest endpoint
const SF_API_VERSION = '62.0';

// Public base URL of this Heroku app (used to compute redirect_uri).
// Default falls back to the Heroku-assigned URL; override via env in case of custom domain.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ||
  'https://lwc-library-se-fr-9ccd5bd44381.herokuapp.com';
const REDIRECT_URI = `${PUBLIC_BASE_URL}/oauth/callback`;

// Allowed login hosts. We only ever forward token exchange to one of these
// (defense in depth: prevents an attacker from coercing us into hitting an
// arbitrary host by passing a custom `instanceUrl`).
const ALLOWED_LOGIN_HOSTS = new Set([
  'login.salesforce.com',
  'test.salesforce.com',
]);

function isAllowedSalesforceHost(hostname) {
  if (!hostname) return false;
  if (ALLOWED_LOGIN_HOSTS.has(hostname)) return true;
  // My Domain hosts: anything ending in .my.salesforce.com or .force.com
  return /\.(my\.salesforce\.com|force\.com)$/i.test(hostname);
}

// ───────────────────────────────────────────────────────────────────────────
// App

const app = fastify({ logger: true, trustProxy: true, bodyLimit: 5 * 1024 * 1024 });

// Static — site on /, zips on /zips/
// Multipart upload support (Submit Component form). We consume the stream
// manually with req.parts() so attachFieldsToBody must be off (otherwise the
// plugin auto-drains the body and req.parts() yields nothing).
app.register(require('@fastify/multipart'), {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB hard cap per file
    files: 1,
    fields: 20,
    fieldSize: 64 * 1024,
  },
});

app.register(require('@fastify/static'), {
  root: SITE_DIR,
  prefix: '/',
  index: ['index.html'],
  setHeaders(res, filePath) {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'public, max-age=300');
    } else if (/\.(css|js|png|jpg|jpeg|gif|webp|svg|woff2?)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
});

app.register(require('@fastify/static'), {
  root: ZIPS_DIR,
  prefix: '/zips/',
  decorateReply: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('.zip')) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);
    }
  },
});

app.get('/healthz', async () => ({ status: 'ok', time: new Date().toISOString() }));

// ───────────────────────────────────────────────────────────────────────────
// OAuth — public config endpoint so the frontend knows the client_id + redirect_uri
// without us hardcoding them in the bundled JS.

app.get('/api/oauth/config', async () => ({
  clientId: SF_CLIENT_ID,
  redirectUri: REDIRECT_URI,
  scopes: 'api refresh_token web',
}));

// OAuth callback — Salesforce redirects here after the user logs in.
// The page is opened as a popup by the frontend; we postMessage the
// authorization code back to the opener and close ourselves.
app.get('/oauth/callback', async (req, reply) => {
  const { code = '', state = '', error = '', error_description = '' } = req.query || {};
  // Inline a tiny page that posts the result back to the opener.
  const payload = JSON.stringify({ source: 'sefr-oauth', code, state, error, error_description });
  reply.code(200).type('text/html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Connecting…</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0e2a;color:#e6e9ff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center}p{opacity:.7}</style>
</head><body>
<div><h2>${error ? 'Erreur de connexion' : 'Connexion en cours…'}</h2><p>${error ? error_description || error : 'Vous pouvez fermer cette fenêtre.'}</p></div>
<script>
  try {
    var msg = ${payload};
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(msg, window.location.origin);
    }
  } catch (e) { /* ignore */ }
  setTimeout(function(){ try { window.close(); } catch(e){} }, 600);
</script>
</body></html>`);
});

// Exchange authorization code for access_token + refresh_token.
// The frontend POSTs { code, codeVerifier, loginHost } — we add the
// client_secret server-side and forward to Salesforce.
app.post('/api/oauth/token', async (req, reply) => {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET) {
    return reply.code(503).send({ error: 'oauth_not_configured', message: 'Set SF_CLIENT_ID and SF_CLIENT_SECRET on the Heroku app.' });
  }
  const { code, codeVerifier, loginHost } = req.body || {};
  if (!code || !codeVerifier || !loginHost) {
    return reply.code(400).send({ error: 'missing_params' });
  }
  if (!isAllowedSalesforceHost(loginHost)) {
    return reply.code(400).send({ error: 'invalid_login_host' });
  }
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });
  const resp = await fetch(`https://${loginHost}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    return reply.code(resp.status).send(data);
  }
  return reply.send({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    instanceUrl: data.instance_url,
    issuedAt: data.issued_at,
    id: data.id,
    scope: data.scope,
    tokenType: data.token_type,
  });
});

// Refresh an expired access token using the stored refresh_token.
app.post('/api/oauth/refresh', async (req, reply) => {
  if (!SF_CLIENT_ID || !SF_CLIENT_SECRET) {
    return reply.code(503).send({ error: 'oauth_not_configured' });
  }
  const { refreshToken, loginHost } = req.body || {};
  if (!refreshToken || !loginHost) {
    return reply.code(400).send({ error: 'missing_params' });
  }
  if (!isAllowedSalesforceHost(loginHost)) {
    return reply.code(400).send({ error: 'invalid_login_host' });
  }
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SF_CLIENT_ID,
    client_secret: SF_CLIENT_SECRET,
  });
  const resp = await fetch(`https://${loginHost}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return reply.code(resp.status).send(data);
  return reply.send({
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
    issuedAt: data.issued_at,
    scope: data.scope,
  });
});

// User identity (used to display "✓ <name> · <org>" in the connect button).
app.post('/api/oauth/identity', async (req, reply) => {
  const { accessToken, idUrl } = req.body || {};
  if (!accessToken || !idUrl) {
    return reply.code(400).send({ error: 'missing_params' });
  }
  let url;
  try { url = new URL(idUrl); } catch { return reply.code(400).send({ error: 'invalid_id_url' }); }
  if (!isAllowedSalesforceHost(url.hostname)) {
    return reply.code(400).send({ error: 'invalid_id_host' });
  }
  const resp = await fetch(idUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return reply.code(resp.status).send(data);
  return reply.send({
    name: data.display_name || data.username,
    username: data.username,
    organizationId: data.organization_id,
    userId: data.user_id,
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Showcase — client_credentials grant on the showcase org, then frontdoor.jsp
// to drop the SE in LEX as the Showcase Visitor bot user. No SE login required.

// Lazy-loaded CryptoKey (jose imports the PEM once, reuses across requests).
let _showcasePrivateKey = null;
async function loadShowcasePrivateKey() {
  if (_showcasePrivateKey) return _showcasePrivateKey;
  if (!SF_SHOWCASE_PRIVATE_KEY) throw new Error('private_key_missing');
  const { importPKCS8 } = await import('jose');
  _showcasePrivateKey = await importPKCS8(SF_SHOWCASE_PRIVATE_KEY, 'RS256');
  return _showcasePrivateKey;
}

app.get('/api/showcase/url', async (req, reply) => {
  if (!SF_SHOWCASE_CLIENT_ID || !SF_SHOWCASE_LOGIN_HOST || !SF_SHOWCASE_USERNAME || !SF_SHOWCASE_PRIVATE_KEY) {
    return reply.code(503).send({ error: 'showcase_not_configured' });
  }
  if (!isAllowedSalesforceHost(SF_SHOWCASE_LOGIN_HOST)) {
    return reply.code(500).send({ error: 'invalid_showcase_host' });
  }
  // Bump click counter (per UTC date)
  const today = new Date().toISOString().slice(0, 10);
  SHOWCASE_CLICKS.set(today, (SHOWCASE_CLICKS.get(today) || 0) + 1);

  // Build the JWT assertion. Audience is login.salesforce.com (or test.* for
  // sandboxes) — NOT the My Domain — per Salesforce JWT spec.
  let assertion;
  try {
    const { SignJWT } = await import('jose');
    const key = await loadShowcasePrivateKey();
    const audience = /\.sandbox\.|--/.test(SF_SHOWCASE_LOGIN_HOST) || SF_SHOWCASE_LOGIN_HOST === 'test.salesforce.com'
      ? 'https://test.salesforce.com'
      : 'https://login.salesforce.com';
    assertion = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(SF_SHOWCASE_CLIENT_ID)
      .setSubject(SF_SHOWCASE_USERNAME)
      .setAudience(audience)
      .setExpirationTime('3m')
      .sign(key);
  } catch (err) {
    req.log.error({ err: String(err) }, 'jwt sign failed');
    return reply.code(500).send({ error: 'jwt_sign_failed', message: String(err.message || err) });
  }

  const tokenUrl = `https://${SF_SHOWCASE_LOGIN_HOST}/services/oauth2/token`;
  const params = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion,
  });
  const resp = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    req.log.error({ status: resp.status, data }, 'showcase token exchange failed');
    return reply.code(resp.status || 502).send({ error: 'token_failed', details: data });
  }
  const instance = (data.instance_url || '').replace(/\/+$/, '');
  if (!instance) return reply.code(502).send({ error: 'no_instance_url' });
  // frontdoor.jsp: drops the user directly into the org with a valid UI session
  const url = `${instance}/secur/frontdoor.jsp?sid=${encodeURIComponent(data.access_token)}&retURL=${encodeURIComponent(SF_SHOWCASE_LANDING)}`;
  return reply.send({ url });
});

app.get('/api/showcase/stats', async () => {
  // Tiny stats endpoint — useful for debugging "is anyone clicking?".
  const out = {};
  for (const [d, n] of SHOWCASE_CLICKS) out[d] = n;
  return { clicks: out };
});

// ───────────────────────────────────────────────────────────────────────────
// Deploy — merge selected component zips into one Metadata API package, POST
// to Salesforce, return deployRequest id. The browser then polls /api/deploy/status/:id.

// Cache: parse each component zip once, reuse buffers across requests.
const ZIP_CACHE = new Map();

async function loadComponentZip(apiName) {
  if (ZIP_CACHE.has(apiName)) return ZIP_CACHE.get(apiName);
  // Whitelist apiName format: seFr<PascalCase>
  if (!/^seFr[A-Z][A-Za-z0-9]+$/.test(apiName)) {
    throw new Error(`invalid_api_name:${apiName}`);
  }
  const file = path.join(ZIPS_DIR, `${apiName}.zip`);
  if (!fs.existsSync(file)) {
    throw new Error(`zip_not_found:${apiName}`);
  }
  const buf = await fsp.readFile(file);
  const zip = new AdmZip(buf);
  // Each per-component zip has shape <apiName>/{INSTALL.md, README.md, force-app/main/default/{lwc,classes}/...}.
  // We strip the leading <apiName>/force-app/main/default/ prefix and keep
  // only metadata-relevant entries (lwc/<name>/* and classes/*).
  const entries = [];
  for (const e of zip.getEntries()) {
    if (e.isDirectory) continue;
    const name = e.entryName;
    // Match LWC bundle, Apex class, and Static Resource files
    const m = name.match(/^[^/]+\/force-app\/main\/default\/(lwc\/[^/]+\/[^/]+|classes\/[^/]+|staticresources\/[^/]+)$/);
    if (!m) continue;
    entries.push({ relPath: m[1], data: e.getData() });
  }
  ZIP_CACHE.set(apiName, entries);
  return entries;
}

function buildPackageXml(lwcNames, apexNames, staticResourceNames) {
  const renderType = (members, name) => {
    const lines = [...new Set(members)].sort().map(n => `    <members>${n}</members>`).join('\n');
    return `  <types>\n${lines}\n    <name>${name}</name>\n  </types>`;
  };
  const types = [];
  if (lwcNames.length) types.push(renderType(lwcNames, 'LightningComponentBundle'));
  if (apexNames.length) types.push(renderType(apexNames, 'ApexClass'));
  if (staticResourceNames && staticResourceNames.length) types.push(renderType(staticResourceNames, 'StaticResource'));
  return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${types.join('\n')}
  <version>${SF_API_VERSION}</version>
</Package>
`;
}

async function buildDeployZip(apiNames) {
  // Metadata API REST `deployRequest` expects the package.xml at the zip root,
  // NOT under an unpackaged/ folder (which is what `sf project deploy start`
  // and the SOAP API expect). Hence the flat layout below.
  const out = new AdmZip();
  const lwcSet = new Set();
  const apexSet = new Set();
  const staticResourceSet = new Set();
  for (const apiName of apiNames) {
    const entries = await loadComponentZip(apiName);
    for (const { relPath, data } of entries) {
      // Dedupe shared files (e.g. SE_FR_AgendaController appears in both
      // seFrMyTasks.zip and seFrMyEvents.zip — adm-zip would error).
      if (relPath.startsWith('classes/')) {
        const file = relPath.split('/').pop();
        if (out.getEntry(relPath)) continue;
        apexSet.add(file.replace(/\.cls(-meta\.xml)?$/, ''));
      } else if (relPath.startsWith('lwc/')) {
        const bundleName = relPath.split('/')[1];
        lwcSet.add(bundleName);
      } else if (relPath.startsWith('staticresources/')) {
        const file = relPath.split('/').pop();
        // Metadata API REST expects the binary at <name>.resource (NOT <name>.png).
        // The XML companion stays as <name>.resource-meta.xml. SFDX format uses
        // the original extension (e.g. .png) in source — we rewrite on the fly.
        let writePath = relPath;
        if (file.endsWith('.resource-meta.xml')) {
          // metadata file: keep as-is
          staticResourceSet.add(file.replace(/\.resource-meta\.xml$/, ''));
        } else {
          // binary file: rename to <name>.resource
          const baseName = file.replace(/\.[^./]+$/, '');
          writePath = `staticresources/${baseName}.resource`;
          staticResourceSet.add(baseName);
        }
        if (out.getEntry(writePath)) continue;
        out.addFile(writePath, data);
        continue;
      }
      out.addFile(relPath, data);
    }
  }
  out.addFile('package.xml', Buffer.from(buildPackageXml([...lwcSet], [...apexSet], [...staticResourceSet]), 'utf-8'));
  return out.toBuffer();
}

app.post('/api/deploy', async (req, reply) => {
  const { accessToken, instanceUrl, components } = req.body || {};
  if (!accessToken || !instanceUrl || !Array.isArray(components) || !components.length) {
    return reply.code(400).send({ error: 'missing_params' });
  }
  let inst;
  try { inst = new URL(instanceUrl); } catch { return reply.code(400).send({ error: 'invalid_instance_url' }); }
  if (!isAllowedSalesforceHost(inst.hostname)) {
    return reply.code(400).send({ error: 'invalid_instance_host' });
  }
  if (components.length > 50) {
    return reply.code(400).send({ error: 'too_many_components', max: 50 });
  }

  let zipBuf;
  try {
    zipBuf = await buildDeployZip(components);
  } catch (err) {
    return reply.code(400).send({ error: 'zip_build_failed', message: String(err.message || err) });
  }

  const url = `${instanceUrl.replace(/\/+$/, '')}/services/data/v${SF_API_VERSION}/metadata/deployRequest`;
  // Send a multipart/form-data with two parts:
  //  - "json" with deploy options
  //  - "file" with the binary package zip
  const boundary = '----SeFrLib' + crypto.randomBytes(8).toString('hex');
  const meta = JSON.stringify({
    deployOptions: {
      allowMissingFiles: false,
      autoUpdatePackage: false,
      checkOnly: false,
      ignoreWarnings: false,
      performRetrieve: false,
      purgeOnDelete: false,
      // Best-effort partial deploy: if 1 component fails, the others still
      // land. The frontend success modal already lists OK + failures.
      rollbackOnError: false,
      runTests: [],
      singlePackage: true,
      testLevel: 'NoTestRun',
    },
  });

  const head1 = `--${boundary}\r\nContent-Disposition: form-data; name="json"\r\nContent-Type: application/json\r\n\r\n${meta}\r\n`;
  const head2 = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="package.zip"\r\nContent-Type: application/zip\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([
    Buffer.from(head1, 'utf-8'),
    Buffer.from(head2, 'utf-8'),
    zipBuf,
    Buffer.from(tail, 'utf-8'),
  ]);

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return reply.code(resp.status).send(data);
  return reply.send({
    deployRequestId: data.id,
    state: data.deployResult ? data.deployResult.status : data.state,
    raw: data,
  });
});

app.get('/api/deploy/status/:id', async (req, reply) => {
  const { id } = req.params;
  const accessToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const instanceUrl = req.headers['x-sf-instance-url'] || '';
  if (!accessToken || !instanceUrl) {
    return reply.code(401).send({ error: 'missing_auth' });
  }
  let inst;
  try { inst = new URL(instanceUrl); } catch { return reply.code(400).send({ error: 'invalid_instance_url' }); }
  if (!isAllowedSalesforceHost(inst.hostname)) {
    return reply.code(400).send({ error: 'invalid_instance_host' });
  }
  if (!/^[A-Za-z0-9]{15,18}$/.test(id)) {
    return reply.code(400).send({ error: 'invalid_id' });
  }
  const url = `${instanceUrl.replace(/\/+$/, '')}/services/data/v${SF_API_VERSION}/metadata/deployRequest/${id}?includeDetails=true`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) return reply.code(resp.status).send(data);
  const r = data.deployResult || {};
  return reply.send({
    id: data.id,
    done: !!r.done,
    success: !!r.success,
    status: r.status,
    numberComponentsDeployed: r.numberComponentsDeployed,
    numberComponentsTotal: r.numberComponentsTotal,
    numberComponentErrors: r.numberComponentErrors,
    componentFailures: (r.details && r.details.componentFailures) || [],
    raw: data,
  });
});

// ───────────────────────────────────────────────────────────────────────────
// Tracking — fire-and-forget endpoints. We always return 200/204 so a DB hiccup
// never breaks the UX; failures are logged server-side but invisible to the
// client. All inserts are best-effort.

const API_NAME_RE = /^seFr[A-Z][A-Za-z0-9]+$/;

function safeApiName(s) {
  return typeof s === 'string' && API_NAME_RE.test(s) ? s : null;
}

function clientIp(req) {
  // Heroku sets X-Forwarded-For; trustProxy=true on fastify already parses it.
  return req.ip || (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || null;
}

async function safeInsert(sql, params, op) {
  if (!getPool()) return; // DATABASE_URL not configured — skip silently
  try {
    await query(sql, params);
  } catch (err) {
    // Don't surface to the client; log only.
    console.error(`tracking insert failed (${op}):`, err.message);
  }
}

app.post('/api/track/visit', async (req, reply) => {
  reply.code(204).send();
  const b = req.body || {};
  await safeInsert(
    `INSERT INTO visits (ip_hash, user_agent, referrer, lang, page) VALUES ($1, $2, $3, $4, $5)`,
    [
      hashIp(clientIp(req)),
      (req.headers['user-agent'] || '').slice(0, 500),
      typeof b.referrer === 'string' ? b.referrer.slice(0, 500) : null,
      typeof b.lang === 'string' ? b.lang.slice(0, 8) : null,
      typeof b.page === 'string' ? b.page.slice(0, 200) : null,
    ],
    'visit'
  );
});

app.post('/api/track/download', async (req, reply) => {
  reply.code(204).send();
  const b = req.body || {};
  const apiName = safeApiName(b.apiName);
  if (!apiName) return;
  await safeInsert(
    `INSERT INTO downloads (component_api_name, recipe_id, source_page, ip_hash) VALUES ($1, $2, $3, $4)`,
    [
      apiName,
      typeof b.recipeId === 'string' ? b.recipeId.slice(0, 60) : null,
      typeof b.sourcePage === 'string' ? b.sourcePage.slice(0, 200) : null,
      hashIp(clientIp(req)),
    ],
    'download'
  );
});

app.post('/api/track/deploy', async (req, reply) => {
  reply.code(204).send();
  const b = req.body || {};
  const components = Array.isArray(b.components)
    ? b.components.filter(safeApiName).slice(0, 100)
    : [];
  if (!components.length) return;
  await safeInsert(
    `INSERT INTO deploys (
       components_csv, recipe_id, target_host, sf_org_id, sf_user_id, sf_username,
       deploy_request_id, status, num_total, num_success, source_page, ip_hash
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      components.join(','),
      typeof b.recipeId === 'string' ? b.recipeId.slice(0, 60) : null,
      typeof b.targetHost === 'string' ? b.targetHost.slice(0, 200) : null,
      typeof b.sfOrgId === 'string' ? b.sfOrgId.slice(0, 32) : null,
      typeof b.sfUserId === 'string' ? b.sfUserId.slice(0, 32) : null,
      typeof b.sfUsername === 'string' ? b.sfUsername.slice(0, 200) : null,
      typeof b.deployRequestId === 'string' ? b.deployRequestId.slice(0, 32) : null,
      typeof b.status === 'string' ? b.status.slice(0, 40) : null,
      Number.isFinite(b.numTotal) ? b.numTotal : null,
      Number.isFinite(b.numSuccess) ? b.numSuccess : null,
      typeof b.sourcePage === 'string' ? b.sourcePage.slice(0, 200) : null,
      hashIp(clientIp(req)),
    ],
    'deploy'
  );
});

// Toggle like — { apiName, fingerprint, action: 'like' | 'unlike' } → { liked, count }
app.post('/api/track/like', async (req, reply) => {
  const b = req.body || {};
  const apiName = safeApiName(b.apiName);
  const fp = typeof b.fingerprint === 'string' ? b.fingerprint.slice(0, 64) : null;
  if (!apiName || !fp) return reply.code(400).send({ error: 'missing_params' });
  if (!getPool()) return reply.send({ liked: false, count: 0 });
  try {
    if (b.action === 'unlike') {
      await query(
        `DELETE FROM likes WHERE component_api_name = $1 AND fingerprint = $2`,
        [apiName, fp]
      );
    } else {
      // upsert via ON CONFLICT for idempotence on re-clicks
      await query(
        `INSERT INTO likes (component_api_name, fingerprint) VALUES ($1, $2)
         ON CONFLICT (component_api_name, fingerprint) DO NOTHING`,
        [apiName, fp]
      );
    }
    const r = await query(
      `SELECT COUNT(*)::int AS c FROM likes WHERE component_api_name = $1`,
      [apiName]
    );
    const liked = b.action !== 'unlike';
    return reply.send({ liked, count: r.rows[0].c });
  } catch (err) {
    req.log.error({ err: err.message }, 'like toggle failed');
    return reply.code(500).send({ error: 'like_failed' });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// Forms — feedback, contact, showcase-request all share /api/feedback.
// V1: insert in `feedbacks` table only. Email notif comes later (Phase E).
// Submit-component form is separate (B1) because it carries a binary attachment.

const FEEDBACK_KINDS = new Set(['feedback', 'contact', 'showcase-request']);
const FEEDBACK_SUBKINDS = new Set(['bug', 'idea', 'other']);

function safeStr(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
}

function isValidEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 200;
}

app.post('/api/feedback', async (req, reply) => {
  const b = req.body || {};
  if (!FEEDBACK_KINDS.has(b.kind)) return reply.code(400).send({ error: 'invalid_kind' });
  if (!isValidEmail(b.email)) return reply.code(400).send({ error: 'invalid_email' });
  const message = safeStr(b.message, 4000);
  if (!message) return reply.code(400).send({ error: 'missing_message' });
  const subkind = b.kind === 'feedback' && FEEDBACK_SUBKINDS.has(b.subkind) ? b.subkind : null;
  if (!getPool()) {
    return reply.code(503).send({ error: 'database_not_configured' });
  }
  try {
    const fromEmail = b.email.trim().toLowerCase();
    const subject = safeStr(b.subject, 200);
    const page = safeStr(b.page, 200);
    await query(
      `INSERT INTO feedbacks (kind, subkind, email, subject, message, page)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [b.kind, subkind, fromEmail, subject, message, page]
    );
    // Fire-and-forget email notification (don't block the response on it).
    // The submitter's email goes into Reply-To header, not the visible body —
    // some ESPs (Gmail) block sandbox-domain mails that "look like spoofing"
    // by mentioning a different domain in the body text.
    const kindLabel = b.kind === 'feedback'
      ? `feedback${subkind ? ` (${subkind})` : ''}`
      : b.kind;
    const emailSubject = `[SE FR Lib] New ${kindLabel} via the site`;
    const emailHtml =
      `<h2>New ${escapeHtml(kindLabel)}</h2>` +
      (subject ? `<p><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : '') +
      (page ? `<p><strong>Page:</strong> <code>${escapeHtml(page)}</code></p>` : '') +
      `<p><strong>Message:</strong></p>` +
      `<blockquote style="border-left:3px solid #6c63ff;padding:8px 14px;margin:0;background:#fafbff;white-space:pre-wrap">${escapeHtml(message)}</blockquote>` +
      `<p style="font-size:12px;color:#888;margin-top:18px">Reply directly to this email to reach the sender.</p>`;
    const emailText =
      `New ${kindLabel}\n` +
      (subject ? `Subject: ${subject}\n` : '') +
      (page ? `Page: ${page}\n` : '') +
      `\n${message}\n\n` +
      `Reply directly to reach the sender.\n`;
    sendNotificationEmail({ subject: emailSubject, text: emailText, html: emailHtml, replyTo: fromEmail });
    return reply.code(201).send({ ok: true });
  } catch (err) {
    req.log.error({ err: err.message }, 'feedback insert failed');
    return reply.code(500).send({ error: 'insert_failed' });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// B1 — Submit a component (multipart with attachment)

const SUBMIT_ALLOWED_MIME = new Set([
  'application/zip', 'application/x-zip-compressed',
  'text/plain',
]);
const SUBMIT_ALLOWED_EXT = /\.(zip|txt)$/i;
const SUBMIT_MAX_BYTES = 5 * 1024 * 1024; // mirrors plugin cap, double-checked here

app.post('/api/submit-component', async (req, reply) => {
  // With attachFieldsToBody='keyValues', text fields appear as strings on req.body
  // and the file appears as the value of its field name (a Buffer-like object).
  // We use req.parts() instead for clearer per-field handling.
  let authorName = null, authorEmail = null, componentName = null;
  let description = null, useCase = null, notes = null;
  let attachmentBuf = null, attachmentName = null, attachmentMime = null;
  let tooLarge = false;

  try {
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        const chunks = [];
        let total = 0;
        for await (const chunk of part.file) {
          total += chunk.length;
          if (total > SUBMIT_MAX_BYTES) { tooLarge = true; break; }
          chunks.push(chunk);
        }
        if (tooLarge) {
          // Drain the rest to avoid hanging connection, then break.
          part.file.resume();
          break;
        }
        if (part.file.truncated) { tooLarge = true; break; }
        attachmentBuf = Buffer.concat(chunks);
        attachmentName = (part.filename || 'submission').slice(0, 200);
        attachmentMime = part.mimetype || 'application/octet-stream';
      } else {
        const v = typeof part.value === 'string' ? part.value : '';
        switch (part.fieldname) {
          case 'authorName':    authorName = v; break;
          case 'authorEmail':   authorEmail = v; break;
          case 'componentName': componentName = v; break;
          case 'description':   description = v; break;
          case 'useCase':       useCase = v; break;
          case 'notes':         notes = v; break;
        }
      }
    }
  } catch (err) {
    if (err && err.code === 'FST_REQ_FILE_TOO_LARGE') tooLarge = true;
    else {
      req.log.error({ err: err.message }, 'submit-component multipart parse failed');
      return reply.code(400).send({ error: 'invalid_multipart' });
    }
  }

  if (tooLarge) return reply.code(413).send({ error: 'file_too_large', max: SUBMIT_MAX_BYTES });
  if (!isValidEmail(authorEmail)) return reply.code(400).send({ error: 'invalid_email' });
  authorName = safeStr(authorName, 200);
  if (!authorName) return reply.code(400).send({ error: 'missing_author_name' });
  componentName = safeStr(componentName, 200);
  if (!componentName) return reply.code(400).send({ error: 'missing_component_name' });
  description = safeStr(description, 2000);
  useCase = safeStr(useCase, 2000);
  notes = safeStr(notes, 2000);

  // Validate attachment if present
  if (attachmentBuf) {
    if (!SUBMIT_ALLOWED_EXT.test(attachmentName)) {
      return reply.code(400).send({ error: 'invalid_file_extension', allowed: ['zip', 'txt'] });
    }
    if (!SUBMIT_ALLOWED_MIME.has(attachmentMime)) {
      // Fall back to extension trust if mime is generic — Safari sometimes sends
      // application/octet-stream for .zip. Don't be too strict.
      if (attachmentMime !== 'application/octet-stream') {
        return reply.code(400).send({ error: 'invalid_file_mime', got: attachmentMime });
      }
    }
  }

  if (!getPool()) return reply.code(503).send({ error: 'database_not_configured' });

  let submissionId;
  try {
    const r = await query(
      `INSERT INTO submissions (
         author_name, author_email, component_name, description, use_case, notes,
         attachment_blob, attachment_filename, attachment_mime
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        authorName,
        authorEmail.trim().toLowerCase(),
        componentName,
        description,
        useCase,
        notes,
        attachmentBuf,
        attachmentName,
        attachmentMime,
      ]
    );
    submissionId = r.rows[0].id;
  } catch (err) {
    req.log.error({ err: err.message }, 'submit-component insert failed');
    return reply.code(500).send({ error: 'insert_failed' });
  }

  // Fire email notification with the attachment inline.
  // Submitter email is exposed via Reply-To header (not body) to avoid Gmail
  // 'espblock' on sandbox.mailgun.org senders that look like spoofing.
  const subject = `[SE FR Lib] New component submission: ${componentName}`;
  const htmlParts = [
    `<h2>New component submission</h2>`,
    `<p><strong>Author:</strong> ${escapeHtml(authorName)}</p>`,
    `<p><strong>Component:</strong> <code>${escapeHtml(componentName)}</code></p>`,
  ];
  if (description) htmlParts.push(`<p><strong>Description:</strong></p><blockquote style="border-left:3px solid #6c63ff;padding:8px 14px;margin:0;background:#fafbff;white-space:pre-wrap">${escapeHtml(description)}</blockquote>`);
  if (useCase)     htmlParts.push(`<p><strong>Use case:</strong></p><blockquote style="border-left:3px solid #6c63ff;padding:8px 14px;margin:0;background:#fafbff;white-space:pre-wrap">${escapeHtml(useCase)}</blockquote>`);
  if (notes)       htmlParts.push(`<p><strong>Notes:</strong></p><blockquote style="border-left:3px solid #6c63ff;padding:8px 14px;margin:0;background:#fafbff;white-space:pre-wrap">${escapeHtml(notes)}</blockquote>`);
  if (attachmentBuf) htmlParts.push(`<p><strong>Attachment:</strong> ${escapeHtml(attachmentName)} (${(attachmentBuf.length / 1024).toFixed(1)} KB)</p>`);
  htmlParts.push(`<p style="font-size:12px;color:#888;margin-top:18px">Submission #${submissionId} — review on /admin. Reply directly to this email to reach the author.</p>`);

  const text =
    `New component submission #${submissionId}\n` +
    `Author: ${authorName}\n` +
    `Component: ${componentName}\n` +
    (description ? `\nDescription:\n${description}\n` : '') +
    (useCase ? `\nUse case:\n${useCase}\n` : '') +
    (notes ? `\nNotes:\n${notes}\n` : '') +
    (attachmentBuf ? `\nAttachment: ${attachmentName} (${(attachmentBuf.length / 1024).toFixed(1)} KB) — see attached\n` : '') +
    `\nReply directly to reach the author.\n`;

  // Mailgun multipart send — fire-and-forget but we want the attachment.
  sendNotificationEmailWithAttachment({
    subject,
    text,
    html: htmlParts.join(''),
    replyTo: authorEmail.trim().toLowerCase(),
    attachment: attachmentBuf
      ? { buffer: attachmentBuf, filename: attachmentName, mime: attachmentMime || 'application/octet-stream' }
      : null,
  });

  return reply.code(201).send({ ok: true, id: String(submissionId) });
});

// Aggregated counts for the components page — { components: { apiName: {downloads, likes} }, recipes: { id: count } }
app.get('/api/track/counts', async (req, reply) => {
  if (!getPool()) return reply.send({ components: {}, recipes: {} });
  try {
    const [dl, lk, rp] = await Promise.all([
      query(`SELECT component_api_name, COUNT(*)::int AS n FROM downloads GROUP BY 1`),
      query(`SELECT component_api_name, COUNT(*)::int AS n FROM likes GROUP BY 1`),
      query(`SELECT recipe_id, COUNT(*)::int AS n FROM downloads WHERE recipe_id IS NOT NULL GROUP BY 1`),
    ]);
    const components = {};
    for (const row of dl.rows) components[row.component_api_name] = { downloads: row.n, likes: 0 };
    for (const row of lk.rows) {
      components[row.component_api_name] = components[row.component_api_name] || { downloads: 0, likes: 0 };
      components[row.component_api_name].likes = row.n;
    }
    const recipes = {};
    for (const row of rp.rows) recipes[row.recipe_id] = row.n;
    // Cache 60s on the CDN/edge — fresh enough for a dashboard, fast for the SE
    reply.header('Cache-Control', 'public, max-age=60');
    return reply.send({ components, recipes });
  } catch (err) {
    req.log.error({ err: err.message }, 'counts query failed');
    return reply.send({ components: {}, recipes: {} });
  }
});

// ───────────────────────────────────────────────────────────────────────────
// 404

app.setNotFoundHandler((req, reply) => {
  reply.code(404).type('text/html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>404 — SE FR Library</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0a0e2a;color:#e6e9ff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h1{font-size:6rem;margin:0;background:linear-gradient(135deg,#6c63ff,#3b82f6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}p{opacity:.7;margin:1rem 0 2rem}a{color:#6c63ff;text-decoration:none;font-weight:600}</style>
</head><body><div><h1>404</h1><p>Page introuvable</p><a href="/">← Retour à la librairie</a></div></body></html>`);
});

app.listen({ port: PORT, host: HOST }).then(() => {
  app.log.info(`SE FR Library site listening on ${HOST}:${PORT}`);
}).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
