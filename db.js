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

const SALT = process.env.IP_HASH_SALT || 'sefr-default-salt-change-me';
function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + ':' + SALT).digest('hex').slice(0, 32);
}

module.exports = { getPool, query, hashIp };
