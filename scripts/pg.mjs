#!/usr/bin/env node
// Start/stop the local PostgreSQL used for development.
//   node scripts/pg.mjs start|stop|status
//
// This wraps pg_ctl for a portable (zip) PostgreSQL install, which is not a
// Windows service and so does not come back on its own after a reboot. Paths
// come from PG_BIN / PG_DATA in .env.local; a managed or containerised
// database needs none of this — just set DATABASE_URL.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadEnv } from '../server/db/migrate.mjs';

loadEnv();

const BIN = process.env.PG_BIN;
const DATA = process.env.PG_DATA;
const PORT = process.env.PG_PORT ?? '5433';
const action = process.argv[2] ?? 'status';

if (!BIN || !DATA) {
  console.error(
    'PG_BIN and PG_DATA are not set in .env.local.\n' +
      'They point at a local PostgreSQL install, e.g.\n' +
      '  PG_BIN=D:/pgsql/bin\n  PG_DATA=D:/pgdata\n' +
      'If your database is managed or containerised, you do not need this script.',
  );
  process.exit(1);
}

const exe = (name) => path.join(BIN, process.platform === 'win32' ? `${name}.exe` : name);
if (!existsSync(exe('pg_ctl'))) {
  console.error(`pg_ctl not found in ${BIN}`);
  process.exit(1);
}

const run = (name, args) =>
  spawnSync(exe(name), args, { stdio: 'inherit', windowsHide: true, timeout: 60_000 });

if (action === 'start') {
  const ready = run('pg_isready', ['-h', '127.0.0.1', '-p', PORT]);
  if (ready.status === 0) {
    console.log(`already running on port ${PORT}`);
    process.exit(0);
  }
  // Not -w: pg_ctl's wait holds this console open on Windows.
  run('pg_ctl', ['-D', DATA, '-l', path.join(DATA, 'server.log'), '-o', `-p ${PORT}`, 'start']);
  setTimeout(() => {
    const r = run('pg_isready', ['-h', '127.0.0.1', '-p', PORT]);
    process.exit(r.status ?? 1);
  }, 2000);
} else if (action === 'stop') {
  process.exit(run('pg_ctl', ['-D', DATA, '-m', 'fast', 'stop']).status ?? 1);
} else {
  process.exit(run('pg_isready', ['-h', '127.0.0.1', '-p', PORT]).status ?? 1);
}
