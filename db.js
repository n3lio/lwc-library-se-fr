'use strict';

const { Pool } = require('pg');
const crypto = require('node:crypto');

let pool = null;

function getPool() {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    return null;
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
  });
  pool.on('error', (err) => {
    // Don't crash the dyno on transient PG errors — just log.
    console.error('pg pool error:', err.message);
  });
  return pool;
}

async function query(text, params) {
  const p = getPool();
  if (!p) throw new Error('database_not_configured');
  return p.query(text, params);
}

// IP_HASH_SALT must be set in production. In dev, we tolerate a placeholder
// so contributors can run the server locally without setting up secrets.
function resolveSalt() {
  const v = process.env.IP_HASH_SALT;
  if (v && v.length >= 16) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'IP_HASH_SALT env var is required in production (>= 16 chars). ' +
      'Generate one with: python3 -c "import secrets; print(secrets.token_urlsafe(48))"'
    );
  }
  // Dev-only placeholder. Visitor IPs hashed with this salt are NOT safe
  // to share — set a real IP_HASH_SALT before going to production.
  return 'dev-only-placeholder-set-IP_HASH_SALT-in-prod';
}
const SALT = resolveSalt();
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + ':' + SALT).digest('hex').slice(0, 32);
}

module.exports = { getPool, query, hashIp };
