#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', '_migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set — skipping migrations');
    process.exit(0); // do not fail the release
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Ensure migration tracking table exists before we read from it.
  await pool.query(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);

  const applied = new Set(
    (await pool.query('SELECT name FROM _migrations')).rows.map(r => r.name)
  );

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`✓ skip ${f} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8');
    console.log(`▶ apply ${f}`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [f]);
      await client.query('COMMIT');
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ ${f} failed:`, err.message);
      throw err;
    } finally {
      client.release();
    }
  }
  console.log(`Done. Applied ${ran}/${files.length} migration(s).`);
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
