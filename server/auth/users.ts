import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/server/db/client';
import { hashPassword, verifyPassword } from './jwt';

/**
 * Account storage.
 *  - DATABASE_URL set → PostgreSQL `users` table (see server/db/schema.sql).
 *  - Development without a database → a JSON file in ./.storage, so sign-up
 *    and sign-in work locally with zero setup. Never used in production.
 */

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  handle?: string;
}

interface StoredUser extends PublicUser {
  passwordHash: string;
  createdAt: string;
}

export class AccountsUnavailableError extends Error {}

const FILE = path.join(process.cwd(), '.storage', 'users.json');

// Local development account — seeded into the file store only, never into Postgres.
const DEMO = { email: 'demo@vybe.app', password: 'vybe-demo', name: 'Demo Creator', handle: 'democreator' };

function assertFileStoreAllowed() {
  if (process.env.NODE_ENV === 'production') {
    throw new AccountsUnavailableError('Accounts require DATABASE_URL in production.');
  }
}

let writeChain: Promise<unknown> = Promise.resolve();

async function readFileStore(): Promise<StoredUser[]> {
  assertFileStoreAllowed();
  try {
    return JSON.parse(await readFile(FILE, 'utf8')) as StoredUser[];
  } catch {
    const seeded: StoredUser[] = [
      {
        id: randomUUID(),
        email: DEMO.email,
        name: DEMO.name,
        handle: DEMO.handle,
        passwordHash: await hashPassword(DEMO.password),
        createdAt: new Date().toISOString(),
      },
    ];
    await writeFileStore(seeded);
    return seeded;
  }
}

async function writeFileStore(users: StoredUser[]) {
  // Serialise writes so two sign-ups can't clobber each other.
  writeChain = writeChain.then(async () => {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(users, null, 2));
  });
  await writeChain;
}

const toPublic = ({ id, email, name, handle }: PublicUser): PublicUser => ({ id, email, name, handle });

export async function authenticate(email: string, password: string): Promise<PublicUser | null> {
  const pool = db();
  if (pool) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name AS name, u.password_hash, c.handle
         FROM users u LEFT JOIN channels c ON c.owner_id = u.id
        WHERE u.email = $1`,
      [email],
    );
    const row = rows[0];
    if (!row) {
      // Spend the same time as a real check so response timing can't reveal which emails exist.
      await verifyPassword(password, 'aa:' + 'bb'.repeat(64));
      return null;
    }
    return (await verifyPassword(password, row.password_hash))
      ? { id: row.id, email: row.email, name: row.name, handle: row.handle ?? undefined }
      : null;
  }

  const users = await readFileStore();
  const user = users.find((u) => u.email === email);
  if (!user) {
    await verifyPassword(password, 'aa:' + 'bb'.repeat(64));
    return null;
  }
  return (await verifyPassword(password, user.passwordHash)) ? toPublic(user) : null;
}

export async function createUser(input: { email: string; name: string; password: string }): Promise<PublicUser | 'exists'> {
  const passwordHash = await hashPassword(input.password);
  const pool = db();
  if (pool) {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, display_name AS name`,
      [input.email, passwordHash, input.name],
    );
    return rows[0] ? { id: rows[0].id, email: rows[0].email, name: rows[0].name } : 'exists';
  }

  const users = await readFileStore();
  if (users.some((u) => u.email === input.email)) return 'exists';
  const user: StoredUser = {
    id: randomUUID(),
    email: input.email,
    name: input.name,
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  await writeFileStore([...users, user]);
  return toPublic(user);
}
