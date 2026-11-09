#!/usr/bin/env node
// Seed data.  node server/db/seed.mjs [--demo]
//
// Idempotent: every statement is an upsert, so it can be re-run after a
// migration without duplicating rows. --demo additionally creates sample
// accounts and channels for local development; never run it in production.
import { randomBytes, scrypt as scryptCb } from 'node:crypto';
import { promisify } from 'node:util';
import pg from 'pg';
import { connectionString } from './migrate.mjs';

const scrypt = promisify(scryptCb);

/** Same format as server/auth/jwt.ts — salt(hex):hash(hex). */
async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

const PERMISSIONS = [
  ['users.read', 'View user accounts'],
  ['users.manage', 'Suspend, restore and edit user accounts'],
  ['channels.manage', 'Edit or suspend any channel'],
  ['videos.read', 'View any video including private'],
  ['videos.moderate', 'Remove, age-restrict or restore videos'],
  ['comments.moderate', 'Remove comments and manage held queues'],
  ['reports.handle', 'Work the moderation queue'],
  ['copyright.handle', 'Process copyright claims and counter-notices'],
  ['ads.manage', 'Approve and manage advertising campaigns'],
  ['payments.read', 'View payments and ledger entries'],
  ['payouts.approve', 'Approve creator payouts'],
  ['settings.manage', 'Change platform settings'],
  ['roles.manage', 'Grant roles and permissions'],
  ['audit.read', 'Read the audit log'],
];

const ROLE_GRANTS = {
  moderator: ['users.read', 'videos.read', 'videos.moderate', 'comments.moderate', 'reports.handle'],
  admin: [
    'users.read', 'users.manage', 'channels.manage', 'videos.read', 'videos.moderate',
    'comments.moderate', 'reports.handle', 'copyright.handle', 'ads.manage',
    'payments.read', 'settings.manage', 'audit.read',
  ],
  superadmin: PERMISSIONS.map(([code]) => code),
};

// Mirrors the category rail in components/shell/nav-config.tsx.
const CATEGORIES = [
  ['music', 'Music', 'Music4', 1],
  ['gaming', 'Gaming', 'Gamepad2', 2],
  ['tech', 'Technology', 'Cpu', 3],
  ['coding', 'Coding', 'Code2', 4],
  ['ai', 'AI', 'Sparkles', 5],
  ['education', 'Education', 'GraduationCap', 6],
  ['sports', 'Sports', 'Trophy', 7],
  ['travel', 'Travel', 'Plane', 8],
  ['fashion', 'Fashion', 'Shirt', 9],
  ['food', 'Food', 'UtensilsCrossed', 10],
  ['podcasts', 'Podcasts', 'Mic', 11],
  ['comedy', 'Comedy', 'Laugh', 12],
  ['news', 'News', 'Newspaper', 13],
  ['general', 'General', 'Compass', 99],
];

const SETTINGS = [
  ['uploads.max_bytes', 2147483648, 'Largest accepted upload (2 GiB)'],
  ['uploads.allowed_types', ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'], 'Accepted upload MIME types'],
  ['shorts.max_seconds', 180, 'Longest video still treated as a Short'],
  ['transcode.renditions', [1080, 720, 480, 360], 'Rendition heights produced for each upload'],
  ['views.count_after_seconds', 30, 'Watch time before a playback counts as a view'],
  ['views.monetizable_after_seconds', 60, 'Watch time before a view can carry an ad'],
  ['monetization.min_subscribers', 1000, 'Subscribers required to apply for monetization'],
  ['monetization.min_watch_hours', 4000, 'Watch hours in the last 365 days required to apply'],
  ['monetization.revenue_share_bps', 5500, 'Creator share of ad revenue, in basis points'],
  ['comments.default_enabled', true, 'Whether new uploads allow comments'],
  ['platform.registration_open', true, 'Allow new sign-ups'],
];

const LEDGER_ACCOUNTS = [
  ['platform.cash', 'asset', 'Money received from payment providers'],
  ['platform.revenue.ads', 'revenue', 'Gross advertising revenue'],
  ['platform.revenue.memberships', 'revenue', 'Gross membership revenue'],
  ['platform.revenue.premium', 'revenue', 'Gross premium subscription revenue'],
  ['platform.expense.processing', 'expense', 'Payment processing fees'],
  ['platform.liability.creator_payable', 'liability', 'Earnings owed to creators'],
  ['platform.liability.tax_withheld', 'liability', 'Tax withheld pending remittance'],
];

const PREMIUM_PLANS = [
  ['premium_monthly', 'VYBE Premium', 14900, 'month', ['Ad-free playback', 'Background play', 'Downloads']],
  ['premium_yearly', 'VYBE Premium (yearly)', 149000, 'year', ['Ad-free playback', 'Background play', 'Downloads', 'Two months free']],
];

async function seedCore(c) {
  for (const [code, description] of PERMISSIONS) {
    await c.query(
      `INSERT INTO permissions (code, description) VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET description = EXCLUDED.description`,
      [code, description],
    );
  }
  for (const [role, codes] of Object.entries(ROLE_GRANTS)) {
    for (const code of codes) {
      await c.query(
        `INSERT INTO role_permissions (role, permission) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [role, code],
      );
    }
  }
  for (const [slug, name, icon, position] of CATEGORIES) {
    await c.query(
      `INSERT INTO categories (slug, name, icon, position) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, position = EXCLUDED.position`,
      [slug, name, icon, position],
    );
  }
  for (const [key, value, description] of SETTINGS) {
    await c.query(
      `INSERT INTO platform_settings (key, value, description) VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE SET description = EXCLUDED.description`,
      [key, JSON.stringify(value), description],
    );
  }
  for (const [code, kind, note] of LEDGER_ACCOUNTS) {
    await c.query(
      `INSERT INTO ledger_accounts (code, kind, owner_type) VALUES ($1, $2, 'platform')
       ON CONFLICT (owner_type, owner_id, code) DO NOTHING`,
      [code, kind],
    );
    void note;
  }
  for (const [code, name, price, interval, features] of PREMIUM_PLANS) {
    await c.query(
      `INSERT INTO premium_plans (code, name, price_minor, interval, features)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, price_minor = EXCLUDED.price_minor`,
      [code, name, price, interval, JSON.stringify(features)],
    );
  }
}

const DEMO_USERS = [
  { email: 'admin@vybe.app', name: 'VYBE Admin', role: 'superadmin', password: 'vybe-admin' },
  {
    email: 'creator@vybe.app', name: 'Demo Creator', role: 'creator', password: 'vybe-demo',
    channel: { handle: 'democreator', name: 'Demo Creator', category: 'tech', bio: 'Sample channel created by the seed script.' },
  },
  { email: 'viewer@vybe.app', name: 'Demo Viewer', role: 'viewer', password: 'vybe-demo' },
];

async function seedDemo(c) {
  for (const u of DEMO_USERS) {
    const hash = await hashPassword(u.password);
    const { rows } = await c.query(
      `INSERT INTO users (email, password_hash, display_name, role, email_verified_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, role = EXCLUDED.role
       RETURNING id`,
      [u.email, hash, u.name, u.role],
    );
    const userId = rows[0].id;
    await c.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
    await c.query(`INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`, [userId]);
    await c.query(
      `INSERT INTO playlists (owner_id, name, system_kind) VALUES ($1, 'Watch later', 'watch_later'), ($1, 'Liked videos', 'liked')
       ON CONFLICT DO NOTHING`,
      [userId],
    );
    if (u.channel) {
      await c.query(
        `INSERT INTO channels (owner_id, handle, name, bio, category)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (owner_id) DO UPDATE SET name = EXCLUDED.name, bio = EXCLUDED.bio`,
        [userId, u.channel.handle, u.channel.name, u.channel.bio, u.channel.category],
      );
    }
  }
}

async function main() {
  const demo = process.argv.includes('--demo');
  if (demo && process.env.NODE_ENV === 'production') {
    throw new Error('--demo refuses to run in production');
  }
  const client = new pg.Client({ connectionString: connectionString() });
  await client.connect();
  try {
    await client.query('BEGIN');
    await seedCore(client);
    if (demo) await seedDemo(client);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  }
  const { rows } = await client.query(
    `SELECT (SELECT count(*) FROM permissions)      AS permissions,
            (SELECT count(*) FROM categories)       AS categories,
            (SELECT count(*) FROM platform_settings) AS settings,
            (SELECT count(*) FROM ledger_accounts)  AS ledger_accounts,
            (SELECT count(*) FROM users)            AS users,
            (SELECT count(*) FROM channels)         AS channels`,
  );
  console.log('seeded:', rows[0]);
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
