'use strict';

const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');
const fastify = require('fastify');

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

// Showcase Connected App — client_credentials flow, runs as the Showcase Visitor bot user
// on the SE FR showcase org. The host is the org's My Domain (NOT login.salesforce.com).
const SF_SHOWCASE_CLIENT_ID = process.env.SF_SHOWCASE_CLIENT_ID || '';
const SF_SHOWCASE_CLIENT_SECRET = process.env.SF_SHOWCASE_CLIENT_SECRET || '';
const SF_SHOWCASE_LOGIN_HOST = (process.env.SF_SHOWCASE_LOGIN_HOST || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
// Where on the showcase org we drop the SE after frontdoor (default = LEX home).
const SF_SHOWCASE_LANDING = process.env.SF_SHOWCASE_LANDING || '/lightning/page/home';

// Light in-memory click counter for the showcase button (resets on dyno restart;
// good enough for a "is anyone using it" pulse — proper analytics live in Plausible
// later). Map<dateString, count>.
const SHOWCASE_CLICKS = new Map();

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

app.get('/api/showcase/url', async (req, reply) => {
  if (!SF_SHOWCASE_CLIENT_ID || !SF_SHOWCASE_CLIENT_SECRET || !SF_SHOWCASE_LOGIN_HOST) {
    return reply.code(503).send({ error: 'showcase_not_configured' });
  }
  if (!isAllowedSalesforceHost(SF_SHOWCASE_LOGIN_HOST)) {
    return reply.code(500).send({ error: 'invalid_showcase_host' });
  }
  // Bump click counter (per UTC date)
  const today = new Date().toISOString().slice(0, 10);
  SHOWCASE_CLICKS.set(today, (SHOWCASE_CLICKS.get(today) || 0) + 1);

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: SF_SHOWCASE_CLIENT_ID,
    client_secret: SF_SHOWCASE_CLIENT_SECRET,
  });
  const tokenUrl = `https://${SF_SHOWCASE_LOGIN_HOST}/services/oauth2/token`;
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
  // frontdoor.jsp: drops the user directly into the org with a valid session
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
    const m = name.match(/^[^/]+\/force-app\/main\/default\/(lwc\/[^/]+\/[^/]+|classes\/[^/]+)$/);
    if (!m) continue;
    entries.push({ relPath: m[1], data: e.getData() });
  }
  ZIP_CACHE.set(apiName, entries);
  return entries;
}

function buildPackageXml(lwcNames, apexNames) {
  const lwc = [...new Set(lwcNames)].sort().map(n => `    <members>${n}</members>`).join('\n');
  const apex = [...new Set(apexNames)].sort().map(n => `    <members>${n}</members>`).join('\n');
  const types = [];
  if (lwcNames.length) {
    types.push(`  <types>\n${lwc}\n    <name>LightningComponentBundle</name>\n  </types>`);
  }
  if (apexNames.length) {
    types.push(`  <types>\n${apex}\n    <name>ApexClass</name>\n  </types>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
${types.join('\n')}
  <version>${SF_API_VERSION}</version>
</Package>
`;
}

async function buildDeployZip(apiNames) {
  const out = new AdmZip();
  const lwcSet = new Set();
  const apexSet = new Set();
  for (const apiName of apiNames) {
    const entries = await loadComponentZip(apiName);
    for (const { relPath, data } of entries) {
      // Avoid duplicating shared apex (e.g. SE_FR_AgendaController appears in
      // both seFrMyTasks.zip and seFrMyEvents.zip — adm-zip would error).
      if (relPath.startsWith('classes/')) {
        const file = relPath.split('/').pop();
        if (out.getEntry(`unpackaged/${relPath}`)) continue;
        apexSet.add(file.replace(/\.cls(-meta\.xml)?$/, ''));
      } else if (relPath.startsWith('lwc/')) {
        const bundleName = relPath.split('/')[1];
        lwcSet.add(bundleName);
      }
      out.addFile(`unpackaged/${relPath}`, data);
    }
  }
  out.addFile('unpackaged/package.xml', Buffer.from(buildPackageXml([...lwcSet], [...apexSet]), 'utf-8'));
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
      rollbackOnError: true,
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
