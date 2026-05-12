'use strict';

// Agent module — proxies the site chat widget to the Einstein AI Agent API
// (LWC Library Web Agent on SE_FR_SDO).
//
// Flow:
//   1. POST /api/agent/session — opens an Agent API session, returns sessionId
//   2. POST /api/agent/message — { sessionId, message } -> agent reply text
//   3. POST /api/agent/end (optional) — closes the session
//
// Auth: client_credentials grant on the dedicated Connected App
// 'LWC Library Web Agent Bridge', token cached in memory and refreshed
// when expired. Secrets stay server-side, never exposed to the browser.
//
// Rate-limit: simple in-memory bucket per ip_hash (5 messages / minute).

const crypto = require('node:crypto');
const { hashIp } = require('./db');

const SF_AGENT_CLIENT_ID = process.env.SF_AGENT_CLIENT_ID || '';
const SF_AGENT_CLIENT_SECRET = process.env.SF_AGENT_CLIENT_SECRET || '';
const SF_AGENT_LOGIN_HOST = (process.env.SF_AGENT_LOGIN_HOST || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
const SF_AGENT_ID = process.env.SF_AGENT_ID || '';

// Einstein AI Agent API — base on https://api.salesforce.com (same for all orgs).
// The 'agent reference' we use against this base is the agent id (0Xx…).
const AGENT_API_BASE = 'https://api.salesforce.com';
const TOKEN_URL_PATH = '/services/oauth2/token';

// ─── Token cache ────────────────────────────────────────────────────────────

let cachedToken = null;          // { accessToken, instanceUrl, expiresAt }

async function fetchAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30000) {
    return cachedToken;
  }
  if (!SF_AGENT_CLIENT_ID || !SF_AGENT_CLIENT_SECRET || !SF_AGENT_LOGIN_HOST) {
    throw new Error('agent_not_configured');
  }
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: SF_AGENT_CLIENT_ID,
    client_secret: SF_AGENT_CLIENT_SECRET,
  });
  const resp = await fetch(`https://${SF_AGENT_LOGIN_HOST}${TOKEN_URL_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.access_token) {
    const err = new Error('token_exchange_failed');
    err.details = data;
    throw err;
  }
  // client_credentials tokens typically last ~2h; we refresh every 90 min by default
  cachedToken = {
    accessToken: data.access_token,
    instanceUrl: (data.instance_url || '').replace(/\/+$/, ''),
    expiresAt: Date.now() + 90 * 60 * 1000,
  };
  return cachedToken;
}

// ─── Rate limit (per ip_hash) ──────────────────────────────────────────────

const rateBuckets = new Map(); // ipHash -> { count, resetAt }
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 8;  // 8 messages per minute per IP

function rateLimit(req) {
  const key = hashIp(req.ip) || 'anon';
  const now = Date.now();
  const b = rateBuckets.get(key);
  if (!b || b.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true };
  }
  if (b.count >= RATE_MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true };
}

// Periodically prune the buckets map so it doesn't grow forever.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateBuckets) if (v.resetAt < now) rateBuckets.delete(k);
}, 5 * 60 * 1000).unref?.();

// ─── Salesforce Agent API helpers ──────────────────────────────────────────

async function sfFetch(path, opts) {
  const tok = await fetchAccessToken();
  const url = AGENT_API_BASE + path;
  const headers = Object.assign({}, (opts && opts.headers) || {}, {
    Authorization: 'Bearer ' + tok.accessToken,
    'Content-Type': 'application/json',
  });
  let resp = await fetch(url, Object.assign({}, opts, { headers }));
  if (resp.status === 401) {
    // Token expired or revoked — purge and retry once
    cachedToken = null;
    const fresh = await fetchAccessToken();
    headers.Authorization = 'Bearer ' + fresh.accessToken;
    resp = await fetch(url, Object.assign({}, opts, { headers }));
  }
  return resp;
}

async function openSession() {
  if (!SF_AGENT_ID) throw new Error('agent_id_not_configured');
  const tok = await fetchAccessToken();
  const externalSessionKey = crypto.randomUUID();
  const body = {
    externalSessionKey,
    instanceConfig: { endpoint: tok.instanceUrl },
    streamingCapabilities: { chunkTypes: ['Text'] },
    bypassUser: true,
  };
  const resp = await sfFetch(`/einstein/ai-agent/v1/agents/${SF_AGENT_ID}/sessions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data.sessionId) {
    const err = new Error('session_open_failed');
    err.status = resp.status;
    err.details = data;
    throw err;
  }
  return data.sessionId;
}

async function sendMessage(sessionId, text) {
  // Body shape per https://developer.salesforce.com/docs/einstein/genai/guide/agent-api-send-message.html
  const body = {
    message: {
      sequenceId: Date.now(),
      type: 'Text',
      text,
    },
    variables: [],
  };
  const resp = await sfFetch(`/einstein/ai-agent/v1/sessions/${encodeURIComponent(sessionId)}/messages`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const err = new Error('message_send_failed');
    err.status = resp.status;
    err.details = data;
    throw err;
  }
  // Pull the latest message text from the messages array
  const messages = Array.isArray(data.messages) ? data.messages : [];
  const reply = messages.find(m => m.type === 'Inform' || m.type === 'Text' || m.message);
  const replyText = (reply && (reply.message || reply.text)) || '';
  return { text: replyText, raw: data };
}

async function endSession(sessionId) {
  try {
    await sfFetch(`/einstein/ai-agent/v1/sessions/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
      headers: { 'x-session-end-reason': 'UserRequest' },
    });
  } catch { /* best-effort */ }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

function register(app) {
  // Open a session — frontend keeps the sessionId in JS memory for the chat
  app.post('/api/agent/session', async (req, reply) => {
    if (!SF_AGENT_CLIENT_ID || !SF_AGENT_CLIENT_SECRET || !SF_AGENT_LOGIN_HOST || !SF_AGENT_ID) {
      return reply.code(503).send({ error: 'agent_not_configured' });
    }
    const rl = rateLimit(req);
    if (!rl.ok) return reply.code(429).header('Retry-After', rl.retryAfter).send({ error: 'rate_limited' });
    try {
      const sessionId = await openSession();
      reply.send({ sessionId });
    } catch (err) {
      req.log.error({ err: err.message, details: err.details }, 'agent session open failed');
      reply.code(err.status || 502).send({ error: 'session_open_failed', details: err.details });
    }
  });

  // Send a message in a session — returns the agent's reply
  app.post('/api/agent/message', async (req, reply) => {
    if (!SF_AGENT_CLIENT_ID || !SF_AGENT_CLIENT_SECRET || !SF_AGENT_ID) {
      return reply.code(503).send({ error: 'agent_not_configured' });
    }
    const rl = rateLimit(req);
    if (!rl.ok) return reply.code(429).header('Retry-After', rl.retryAfter).send({ error: 'rate_limited' });
    const b = req.body || {};
    let sessionId = typeof b.sessionId === 'string' ? b.sessionId.trim() : '';
    const message = typeof b.message === 'string' ? b.message.trim() : '';
    if (!message || message.length > 2000) {
      return reply.code(400).send({ error: 'invalid_message' });
    }
    try {
      // Auto-open a session if none was passed (1-shot use case)
      if (!sessionId) sessionId = await openSession();
      const out = await sendMessage(sessionId, message);
      reply.send({ sessionId, text: out.text });
    } catch (err) {
      req.log.error({ err: err.message, details: err.details, status: err.status }, 'agent message failed');
      reply.code(err.status && err.status >= 400 && err.status < 600 ? err.status : 502)
        .send({ error: 'message_failed', details: err.details });
    }
  });

  app.post('/api/agent/end', async (req, reply) => {
    const sessionId = typeof (req.body && req.body.sessionId) === 'string' ? req.body.sessionId.trim() : '';
    if (sessionId) await endSession(sessionId);
    reply.send({ ok: true });
  });

  // Lightweight diagnostic — only returns whether the agent stack is ready.
  app.get('/api/agent/status', async () => ({
    configured: !!(SF_AGENT_CLIENT_ID && SF_AGENT_CLIENT_SECRET && SF_AGENT_LOGIN_HOST && SF_AGENT_ID),
  }));
}

module.exports = { register };
