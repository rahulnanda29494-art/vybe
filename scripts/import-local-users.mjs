#!/usr/bin/env node
// Move accounts from the development JSON store into PostgreSQL.
//   node scripts/import-local-users.mjs
//
// The file store (.storage/users.json) is what runs before a database is
// configured. Once DATABASE_URL is set the app reads Postgres instead, and
// those accounts would otherwise stop working. Password hashes are carried
// over unchanged — same scrypt format — so existing passwords still work.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { connectionString } from '../server/db/migrate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let users;
try {
  users = JSON.parse(readFileSync(path.join(ROOT, '.storage', 'users.json'), 'utf8'));
} catch {
  console.log('No .storage/users.json — nothing to import.');
  process.exit(0);
}

const client = new pg.Client({ connectionString: connectionString() });
await client.connect();

let imported = 0;
for (const u of users) {
  const { rows } = await client.query(
    `INSERT INTO users (email, password_hash, display_name, created_at, email_verified_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [u.email, u.passwordHash, u.name, u.createdAt],
  );
  if (!rows[0]) {
    console.log(`skipped (already present): ${u.email}`);
    continue;
  }
  const id = rows[0].id;
  await client.query('INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
  await client.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [id]);
  await client.query(
    `INSERT INTO playlists (owner_id, name, system_kind)
     VALUES ($1, 'Watch later', 'watch_later'), ($1, 'Liked videos', 'liked')
     ON CONFLICT DO NOTHING`,
    [id],
  );
  if (u.handle) {
    await client.query(
      `INSERT INTO channels (owner_id, handle, name, category)
       VALUES ($1, $2, $3, 'general') ON CONFLICT DO NOTHING`,
      [id, u.handle, u.name],
    );
  }
  console.log(`imported: ${u.email}`);
  imported++;
}

const { rows } = await client.query('SELECT email, role FROM users ORDER BY created_at');
console.log(`\n${imported} imported. Accounts now in the database:`);
console.table(rows);
await client.end();
