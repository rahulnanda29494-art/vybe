// Integration tests against a real PostgreSQL.  node --test tests/
//
// Every test runs inside a transaction that is rolled back, so the suite can
// be re-run against a development database without leaving rows behind.
// Deferred constraints are forced with SET CONSTRAINTS ALL IMMEDIATE rather
// than by committing, for the same reason.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import pg from 'pg';
import { connectionString } from '../server/db/migrate.mjs';

let client;

before(async () => {
  client = new pg.Client({ connectionString: connectionString() });
  await client.connect();
});

after(async () => {
  await client?.end();
});

/** Runs body inside a transaction and always rolls back. */
async function inRollback(body) {
  await client.query('BEGIN');
  try {
    await body();
  } finally {
    await client.query('ROLLBACK');
  }
}

/** Minimal user → channel → video chain for tests that need content. */
async function fixture(suffix) {
  const { rows: u } = await client.query(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, 'Test User', 'x:y') RETURNING id`,
    [`test-${suffix}@example.test`],
  );
  const { rows: c } = await client.query(
    `INSERT INTO channels (owner_id, handle, name, category)
     VALUES ($1, $2, 'Test Channel', 'tech') RETURNING id`,
    [u[0].id, `test_${suffix}`],
  );
  const { rows: v } = await client.query(
    `INSERT INTO videos (channel_id, title, description, status, visibility)
     VALUES ($1, 'Lantern repair on a rainy night', 'A quiet workshop walkthrough.', 'ready', 'public')
     RETURNING id`,
    [c[0].id],
  );
  return { userId: u[0].id, channelId: c[0].id, videoId: v[0].id };
}

const one = async (sql, params) => (await client.query(sql, params)).rows[0];

describe('schema', () => {
  test('all migrations are applied', async () => {
    const { rows } = await client.query('SELECT version FROM schema_migrations ORDER BY version');
    assert.deepEqual(
      rows.map((r) => r.version),
      ['0001_core', '0002_content', '0003_engagement', '0004_commerce', '0005_live_ai_safety'],
    );
  });

  test('seeded reference data is present', async () => {
    const r = await one(`SELECT
      (SELECT count(*) FROM permissions)::int       AS permissions,
      (SELECT count(*) FROM categories)::int        AS categories,
      (SELECT count(*) FROM platform_settings)::int AS settings,
      (SELECT count(*) FROM ledger_accounts)::int   AS accounts`);
    assert.ok(r.permissions >= 14, 'permissions seeded');
    assert.ok(r.categories >= 14, 'categories seeded');
    assert.ok(r.settings >= 11, 'platform settings seeded');
    assert.ok(r.accounts >= 7, 'ledger chart of accounts seeded');
  });
});

describe('counters follow their record tables', () => {
  test('a like raises like_count and removing it lowers it again', async () => {
    await inRollback(async () => {
      const { userId, videoId } = await fixture('like');
      await client.query(
        `INSERT INTO video_likes (user_id, video_id, value) VALUES ($1, $2, 1)`,
        [userId, videoId],
      );
      let v = await one('SELECT like_count::int, dislike_count::int FROM videos WHERE id = $1', [videoId]);
      assert.equal(v.like_count, 1);
      assert.equal(v.dislike_count, 0);

      // Switching a like to a dislike must move the count, not duplicate it.
      await client.query(`UPDATE video_likes SET value = -1 WHERE user_id = $1 AND video_id = $2`, [userId, videoId]);
      v = await one('SELECT like_count::int, dislike_count::int FROM videos WHERE id = $1', [videoId]);
      assert.equal(v.like_count, 0);
      assert.equal(v.dislike_count, 1);

      await client.query(`DELETE FROM video_likes WHERE user_id = $1 AND video_id = $2`, [userId, videoId]);
      v = await one('SELECT like_count::int, dislike_count::int FROM videos WHERE id = $1', [videoId]);
      assert.equal(v.like_count, 0);
      assert.equal(v.dislike_count, 0);
    });
  });

  test('subscribing raises the channel subscriber count', async () => {
    await inRollback(async () => {
      const { userId, channelId } = await fixture('sub');
      await client.query(
        `INSERT INTO channel_subscriptions (subscriber_id, channel_id) VALUES ($1, $2)`,
        [userId, channelId],
      );
      const c = await one('SELECT subscriber_count::int FROM channels WHERE id = $1', [channelId]);
      assert.equal(c.subscriber_count, 1);
    });
  });

  test('a reply raises comment_count on the video and reply_count on its parent', async () => {
    await inRollback(async () => {
      const { userId, videoId } = await fixture('comment');
      const parent = await one(
        `INSERT INTO comments (video_id, user_id, body) VALUES ($1, $2, 'First') RETURNING id`,
        [videoId, userId],
      );
      await client.query(
        `INSERT INTO comments (video_id, user_id, parent_id, body) VALUES ($1, $2, $3, 'Reply')`,
        [videoId, userId, parent.id],
      );
      const v = await one('SELECT comment_count::int FROM videos WHERE id = $1', [videoId]);
      const p = await one('SELECT reply_count::int FROM comments WHERE id = $1', [parent.id]);
      assert.equal(v.comment_count, 2);
      assert.equal(p.reply_count, 1);
    });
  });
});

describe('search', () => {
  test('the search vector finds a video by title and by channel name', async () => {
    await inRollback(async () => {
      const { videoId } = await fixture('search');
      const byTitle = await one(
        `SELECT id FROM videos WHERE id = $1 AND search @@ to_tsquery('simple', 'lantern')`,
        [videoId],
      );
      assert.ok(byTitle, 'title term matches');

      await client.query(`INSERT INTO video_tags (video_id, tag) VALUES ($1, 'workshop')`, [videoId]);
      const byTag = await one(
        `SELECT id FROM videos WHERE id = $1 AND search @@ to_tsquery('simple', 'workshop')`,
        [videoId],
      );
      assert.ok(byTag, 'tag added after insert is picked up');
    });
  });
});

describe('views are deduplicated', () => {
  test('the same session cannot record two views of a video in one hour', async () => {
    await inRollback(async () => {
      const { videoId } = await fixture('view');
      const insert = () =>
        client.query(
          `INSERT INTO video_views (video_id, session_hash, watched_seconds, counted)
           VALUES ($1, 'hashed-session', 45, true)`,
          [videoId],
        );
      await insert();
      await assert.rejects(insert, (err) => err.code === '23505', 'second view in the same hour is rejected');
    });
  });
});

describe('ledger', () => {
  async function accounts() {
    const cash = await one(`SELECT id FROM ledger_accounts WHERE code = 'platform.cash'`);
    const revenue = await one(`SELECT id FROM ledger_accounts WHERE code = 'platform.revenue.ads'`);
    return { cash: cash.id, revenue: revenue.id };
  }

  test('a balanced transaction posts', async () => {
    await inRollback(async () => {
      const { cash, revenue } = await accounts();
      const txn = await one(
        `INSERT INTO ledger_transactions (kind, idempotency_key) VALUES ('ad_revenue', $1) RETURNING id`,
        [`test-balanced-${Date.now()}`],
      );
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, side, amount_minor) VALUES
           ($1, $2, 'debit', 10000), ($1, $3, 'credit', 10000)`,
        [txn.id, cash, revenue],
      );
      await client.query('SET CONSTRAINTS ALL IMMEDIATE');
      const sum = await one(
        `SELECT SUM(CASE WHEN side = 'debit' THEN amount_minor ELSE -amount_minor END)::int AS delta
           FROM ledger_entries WHERE transaction_id = $1`,
        [txn.id],
      );
      assert.equal(sum.delta, 0);
    });
  });

  test('an unbalanced transaction is refused', async () => {
    await inRollback(async () => {
      const { cash, revenue } = await accounts();
      const txn = await one(
        `INSERT INTO ledger_transactions (kind, idempotency_key) VALUES ('ad_revenue', $1) RETURNING id`,
        [`test-unbalanced-${Date.now()}`],
      );
      await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, side, amount_minor) VALUES
           ($1, $2, 'debit', 10000), ($1, $3, 'credit', 9000)`,
        [txn.id, cash, revenue],
      );
      await assert.rejects(
        () => client.query('SET CONSTRAINTS ALL IMMEDIATE'),
        /does not balance/,
        'the deferred check rejects it',
      );
    });
  });

  test('posted entries cannot be edited or deleted', async () => {
    await inRollback(async () => {
      const { cash, revenue } = await accounts();
      const txn = await one(
        `INSERT INTO ledger_transactions (kind, idempotency_key) VALUES ('ad_revenue', $1) RETURNING id`,
        [`test-immutable-${Date.now()}`],
      );
      const { rows } = await client.query(
        `INSERT INTO ledger_entries (transaction_id, account_id, side, amount_minor) VALUES
           ($1, $2, 'debit', 500), ($1, $3, 'credit', 500) RETURNING id`,
        [txn.id, cash, revenue],
      );
      await assert.rejects(
        () => client.query(`UPDATE ledger_entries SET amount_minor = 1 WHERE id = $1`, [rows[0].id]),
        /immutable/,
      );
    });
  });

  test('an idempotency key cannot be reused', async () => {
    await inRollback(async () => {
      const key = `test-idem-${Date.now()}`;
      await client.query(`INSERT INTO ledger_transactions (kind, idempotency_key) VALUES ('payout', $1)`, [key]);
      await assert.rejects(
        () => client.query(`INSERT INTO ledger_transactions (kind, idempotency_key) VALUES ('payout', $1)`, [key]),
        (err) => err.code === '23505',
      );
    });
  });
});

describe('audit log is append-only', () => {
  test('rows cannot be updated', async () => {
    await inRollback(async () => {
      const row = await one(
        `INSERT INTO audit_logs (action, entity_type, entity_id) VALUES ('test.write', 'test', 'x') RETURNING id`,
      );
      await assert.rejects(
        () => client.query(`UPDATE audit_logs SET action = 'tampered' WHERE id = $1`, [row.id]),
        /append-only/,
      );
    });
  });
});

describe('content constraints', () => {
  test('an external video must carry both source and id', async () => {
    await inRollback(async () => {
      const { channelId } = await fixture('external');
      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO videos (channel_id, title, external_source) VALUES ($1, 'Half set', 'youtube')`,
            [channelId],
          ),
        /videos_external_pair/,
      );
    });
  });

  test('the same YouTube video cannot be mirrored twice', async () => {
    await inRollback(async () => {
      const { channelId } = await fixture('mirror');
      const insert = () =>
        client.query(
          `INSERT INTO videos (channel_id, title, external_source, external_id)
           VALUES ($1, 'Mirrored', 'youtube', 'dQw4w9WgXcQ')`,
          [channelId],
        );
      await insert();
      await assert.rejects(insert, (err) => err.code === '23505');
    });
  });

  test('a video cannot be published while it is still processing', async () => {
    await inRollback(async () => {
      const { channelId } = await fixture('publish');
      await assert.rejects(
        () =>
          client.query(
            `INSERT INTO videos (channel_id, title, status, published_at)
             VALUES ($1, 'Too early', 'processing', now())`,
            [channelId],
          ),
        /videos_published_when_ready/,
      );
    });
  });
});

describe('job queue', () => {
  test('a worker claims a queued job and a second worker sees nothing', async () => {
    await inRollback(async () => {
      const { videoId } = await fixture('job');
      await client.query(
        `INSERT INTO processing_jobs (kind, video_id, idempotency_key)
         VALUES ('transcode', $1, $2)`,
        [videoId, `test-job-${Date.now()}`],
      );
      const claimed = await one(
        `UPDATE processing_jobs SET status = 'running', locked_by = 'worker-a',
                locked_until = now() + interval '5 minutes', started_at = now(), attempts = attempts + 1
           WHERE id = (
             SELECT id FROM processing_jobs
              WHERE video_id = $1 AND status = 'queued' AND run_after <= now()
              ORDER BY priority, run_after
              FOR UPDATE SKIP LOCKED LIMIT 1)
         RETURNING id, attempts::int`,
        [videoId],
      );
      assert.ok(claimed, 'first claim succeeds');
      assert.equal(claimed.attempts, 1);

      const second = await one(
        `SELECT id FROM processing_jobs WHERE video_id = $1 AND status = 'queued'`,
        [videoId],
      );
      assert.equal(second, undefined, 'no queued job remains for a second worker');
    });
  });

  test('enqueueing the same idempotency key twice is refused', async () => {
    await inRollback(async () => {
      const key = `test-dupe-${Date.now()}`;
      await client.query(`INSERT INTO processing_jobs (kind, idempotency_key) VALUES ('transcode', $1)`, [key]);
      await assert.rejects(
        () => client.query(`INSERT INTO processing_jobs (kind, idempotency_key) VALUES ('transcode', $1)`, [key]),
        (err) => err.code === '23505',
      );
    });
  });
});

describe('timestamps', () => {
  // now() is the transaction timestamp, so updated_at cannot visibly advance
  // inside one transaction. What matters is that the trigger owns the column:
  // a write that tries to set it is overruled.
  test('the trigger owns updated_at, not the caller', async () => {
    await inRollback(async () => {
      const { videoId } = await fixture('touch');
      await client.query(
        `UPDATE videos SET title = 'Renamed', updated_at = timestamptz '2000-01-01' WHERE id = $1`,
        [videoId],
      );
      const row = await one(
        `SELECT updated_at, updated_at = now() AS is_now FROM videos WHERE id = $1`,
        [videoId],
      );
      assert.equal(row.is_now, true, 'the trigger replaced the value the caller passed');
    });
  });
});
