#!/usr/bin/env node
// Migration runner.  node server/db/migrate.mjs [--status] [--reset]
//
// Every migration runs inside one transaction and is recorded with a
// checksum, so an edited-after-the-fact migration is reported rather than
// silently ignored. No ORM: the SQL in migrations/ is the schema.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, 'migrations');
const ROOT = path.resolve(HERE, '..', '..');

/** Minimal .env loader — this script runs outside Next, which usually does it. */
export function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    try {
      for (const line of readFileSync(path.join(ROOT, file), 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
        if (!m) continue;
        const value = m[2].replace(/^["']|["']$/g, '');
        if (!(m[1] in process.env) || !process.env[m[1]]) process.env[m[1]] = value;
      }
    } catch {
      /* file is optional */
    }
  }
}

export function connectionString() {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set. Add it to .env.local (see .env.example).');
    process.exit(1);
  }
  return url;
}

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);

function migrations() {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((file) => {
      const sql = readFileSync(path.join(DIR, file), 'utf8');
      return { version: file.replace(/\.sql$/, ''), file, sql, checksum: sha(sql) };
    });
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const client = new pg.Client({ connectionString: connectionString() });
  await client.connect();

  if (args.has('--reset')) {
    if (process.env.NODE_ENV === 'production') throw new Error('--reset is refused in production');
    console.log('! dropping and recreating schema public');
    await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version     text PRIMARY KEY,
      checksum    text NOT NULL,
      duration_ms integer NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )`);

  const { rows } = await client.query('SELECT version, checksum FROM schema_migrations');
  const applied = new Map(rows.map((r) => [r.version, r.checksum]));
  const all = migrations();

  if (args.has('--status')) {
    for (const m of all) {
      const was = applied.get(m.version);
      const state = !was ? 'pending' : was === m.checksum ? 'applied' : 'CHANGED AFTER APPLY';
      console.log(`${state.padEnd(20)} ${m.version}`);
    }
    await client.end();
    return;
  }

  let ran = 0;
  for (const m of all) {
    const was = applied.get(m.version);
    if (was === m.checksum) continue;
    if (was) {
      throw new Error(
        `${m.file} changed after it was applied. Write a new migration instead of editing it.`,
      );
    }
    const started = Date.now();
    try {
      await client.query('BEGIN');
      await client.query(m.sql);
      await client.query(
        'INSERT INTO schema_migrations (version, checksum, duration_ms) VALUES ($1, $2, $3)',
        [m.version, m.checksum, Date.now() - started],
      );
      await client.query('COMMIT');
      console.log(`applied  ${m.version}  (${Date.now() - started}ms)`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`FAILED   ${m.version}\n${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log(ran ? `\n${ran} migration(s) applied.` : 'Database already up to date.');
  await client.end();
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('migrate.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
