'use strict';

// Shared security helpers: output escaping, constant-time compares, per-purpose
// key derivation, rate limiting, attachment tokens, Salesforce host validation
// and HTTP security headers. No third-party dependency.

const crypto = require('node:crypto');

// ─── Escaping ──────────────────────────────────────────────────────────────

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// JSON that is safe to inline in a <script> block.
function jsonForScript(v) {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

// ─── Constant-time compare ─────────────────────────────────────────────────

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a == null ? '' : a)).digest();
  const hb = crypto.createHash('sha256').update(String(b == null ? '' : b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ─── Key derivation (one key per purpose, never reuse a raw secret) ─────────

function deriveKey(master, purpose) {
  return crypto.createHmac('sha256', master).update('sefr-lib:' + purpose).digest();
}

function pickSecret(names, purpose) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.length >= 16) return { value: v, name: n };
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${names[0]} env var is required in production (>= 16 chars) for ${purpose}.`);
  }
  return { value: 'dev-only-placeholder-' + purpose, name: 'dev' };
}

// ─── Rate limiting (in-memory, per ip-hash + bucket) ───────────────────────

const buckets = new Map(); // key -> { n, resetAt }

function hit(key, windowMs, max) {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { n: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.n >= max) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  b.n++;
  return { ok: true };
}

function peek(key, max) {
  const b = buckets.get(key);
  return !!(b && b.resetAt >= Date.now() && b.n >= max);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
}, 5 * 60 * 1000).unref();

// Route rules: [method, regex on path, bucket name, windowMs, max]
const MIN = 60 * 1000, HOUR = 60 * MIN;
const RULES = [
  ['POST', /^\/api\/feedback$/, 'feedback', 10 * MIN, 5],
  ['POST', /^\/api\/submit-component$/, 'submit', HOUR, 5],
  ['POST', /^\/api\/track\/like$/, 'like', 10 * MIN, 60],
  ['POST', /^\/api\/track\//, 'track', MIN, 60],
  ['POST', /^\/api\/oauth\//, 'oauth', MIN, 20],
  ['POST', /^\/api\/deploy$/, 'deploy', MIN, 10],
  ['GET',  /^\/api\/deploy\/status\//, 'deploy-status', MIN, 120],
  ['GET',  /^\/api\/showcase\/url$/, 'showcase', MIN, 10],
  ['GET',  /^\/api\/submissions\//, 'attachment', MIN, 20],
  ['POST', /^\/api\/admin\/login$/, 'admin-login-any', 15 * MIN, 30],
];
const GLOBAL_API = { windowMs: MIN, max: 300 };

function rateLimitHook(hashIp) {
  return async function (req, reply) {
    const url = req.url.split('?')[0];
    if (!url.startsWith('/api/')) return;
    const ip = hashIp(req.ip) || 'anon';
    let res = hit(`g:${ip}`, GLOBAL_API.windowMs, GLOBAL_API.max);
    if (res.ok) {
      for (const [method, re, name, win, max] of RULES) {
        if (req.method === method && re.test(url)) {
          res = hit(`${name}:${ip}`, win, max);
          break;
        }
      }
    }
    if (!res.ok) {
      reply.code(429).header('Retry-After', res.retryAfter).send({ error: 'rate_limited' });
      return reply;
    }
  };
}

// Failed-login tracking (admin): 5 failures / 15 min / ip-hash, 30 / 15 min overall.
function loginLocked(ipHash) {
  return peek(`admin-fail:${ipHash}`, 5) || peek('admin-fail:*', 30);
}
function loginFailed(ipHash) {
  hit(`admin-fail:${ipHash}`, 15 * MIN, 5);
  hit('admin-fail:*', 15 * MIN, 30);
}

// ─── Attachment download tokens (expiring HMAC) ────────────────────────────

let _attachKey = null;
function attachKey() {
  if (!_attachKey) {
    const s = pickSecret(['ATTACHMENT_TOKEN_SECRET', 'SF_CLIENT_SECRET', 'SESSION_SECRET', 'IP_HASH_SALT'], 'attachment-tokens');
    if (s.name !== 'ATTACHMENT_TOKEN_SECRET' && process.env.NODE_ENV === 'production') {
      console.warn(`[security] ATTACHMENT_TOKEN_SECRET not set — deriving the attachment key from ${s.name}. Set a dedicated secret.`);
    }
    _attachKey = deriveKey(s.value, 'attachment-tokens');
  }
  return _attachKey;
}
function attachmentToken(id, exp) {
  return crypto.createHmac('sha256', attachKey()).update(`submission:${id}:${exp}`).digest('hex').slice(0, 40);
}
function attachmentUrlParams(id, ttlMs) {
  const exp = Date.now() + ttlMs;
  return `exp=${exp}&token=${attachmentToken(id, exp)}`;
}
function verifyAttachmentToken(id, exp, token) {
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Date.now() || e > Date.now() + 30 * 24 * HOUR) return false;
  return typeof token === 'string' && safeEqual(token, attachmentToken(id, e));
}

// ─── Salesforce host validation ────────────────────────────────────────────

const FIXED_LOGIN_HOSTS = new Set(['login.salesforce.com', 'test.salesforce.com']);
// Host label charset only: no '/', '?', '#', '@', ':', spaces… so nothing can smuggle a path/port/userinfo.
const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;

function isAllowedSalesforceHost(hostname) {
  if (typeof hostname !== 'string') return false;
  const h = hostname.trim().toLowerCase();
  if (!HOSTNAME_RE.test(h)) return false;
  if (FIXED_LOGIN_HOSTS.has(h)) return true;
  return h.endsWith('.my.salesforce.com'); // HOSTNAME_RE already guarantees a label before the suffix
}

// Returns a normalized host from a user-supplied login host string, or null.
function normalizeLoginHost(input) {
  if (typeof input !== 'string') return null;
  const h = input.trim().toLowerCase();
  return isAllowedSalesforceHost(h) ? h : null;
}

// Returns a clean "https://host" origin from a user-supplied URL, or null.
function sfOrigin(input) {
  let u;
  try { u = new URL(String(input)); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.port) return null;
  return isAllowedSalesforceHost(u.hostname) ? 'https://' + u.hostname : null;
}

// ─── HTTP security headers ─────────────────────────────────────────────────

const SITE_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
].join('; ');

function securityHeadersHook() {
  return async function (req, reply, payload) {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(self), geolocation=(self), payment=()');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (!reply.hasHeader('Content-Security-Policy')) reply.header('Content-Security-Policy', SITE_CSP);
    return payload;
  };
}

// Reject cross-site state-changing requests (CSRF defence in depth on top of SameSite).
function sameOriginOnly(req) {
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  const origin = req.headers.origin;
  if (origin) {
    try { return new URL(origin).host === req.headers.host; } catch { return false; }
  }
  return true;
}

module.exports = {
  escapeHtml, jsonForScript, safeEqual, deriveKey, pickSecret,
  rateLimitHook, loginLocked, loginFailed, hit,
  attachmentUrlParams, verifyAttachmentToken,
  isAllowedSalesforceHost, normalizeLoginHost, sfOrigin,
  securityHeadersHook, sameOriginOnly, SITE_CSP,
};
