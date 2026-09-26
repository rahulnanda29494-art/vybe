import 'server-only';
import { Pool } from 'pg';

/**
 * Single shared pool. Returns `null` when DATABASE_URL is unset so the app
 * runs on bundled sample data in development and previews.
 */
declare global {
  // eslint-disable-next-line no-var
  var __vybePool: Pool | undefined;
}

export function db(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!globalThis.__vybePool) {
    globalThis.__vybePool = new Pool({
      connectionString: url,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    });
  }
  return globalThis.__vybePool;
}
