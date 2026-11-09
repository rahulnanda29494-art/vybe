# Database design

PostgreSQL 17. Schema lives in `server/db/migrations/*.sql` — those files are
the specification; this document explains the parts that are not obvious from
reading them.

```bash
npm run db:migrate          # apply pending migrations
npm run db:migrate:status   # what is applied, pending or changed-after-apply
npm run db:seed -- --demo   # reference data (+ demo accounts)
npm run db:reset            # drop schema, re-migrate, re-seed  (dev only)
```

## Conventions

- **uuid primary keys** (`gen_random_uuid()`), safe to expose in URLs. The
  three append-only event tables use `bigserial` because they are written far
  more often than they are joined by id.
- **`created_at` / `updated_at`** on every mutable table; `updated_at` is
  maintained by the `touch_updated_at()` trigger, never by application code.
- **`deleted_at`** where a row must outlive deletion for moderation or audit
  (users, channels, videos, comments, community posts). Feed indexes are
  partial on `deleted_at IS NULL`, so soft-deleted rows cost nothing to skip.
- **Money is integer minor units** (`bigint`, paise/cents) plus an explicit
  `currency`. No floats anywhere near money.
- **Counters are caches.** `videos.like_count`, `channels.subscriber_count`
  and friends are maintained by triggers over the record tables, so they can
  always be rebuilt by a reconciliation job.
- Every foreign key states its `ON DELETE` behaviour; financial rows use
  `RESTRICT` so history cannot be deleted out from under a ledger entry.

## Migrations

| File | Contents |
| --- | --- |
| `0001_core` | users, profiles, settings, identities, refresh and auth tokens, permissions/RBAC, channels, platform settings |
| `0002_content` | categories, channel members, videos + search, tags, video assets, ABR variants, subtitles, chapters, upload sessions and parts, processing jobs |
| `0003_engagement` | views, watch history, likes, comments, comment likes, subscriptions, blocks, shares, notifications, playlists, search history, recommendation events, trending scores, community posts |
| `0004_commerce` | monetization accounts, ad campaigns/creatives/impressions, membership tiers and memberships, premium plans, payments, webhook events, double-entry ledger, creator earnings, payouts |
| `0005_live_ai_safety` | live streams, live chat, viewer sessions, AI jobs, content reports, moderation actions, copyright claims, audit log, privacy requests |

The runner records a checksum per migration and refuses to proceed if an
applied file changed — fix forward with a new migration.

## Decisions worth knowing

**Search.** `videos.search` is a `tsvector` maintained by trigger rather than
a generated column, because it folds in the channel name and the tag list,
which a generated column cannot reach. Weighting is title (A), tags and
channel (B), description (C). `pg_trgm` indexes on `videos.title` and
`channels.name` cover typo-tolerant prefix matching. This is enough until
measured search volume justifies OpenSearch.

**A view is not a playback.** `video_views` is append-only and carries
`counted` and `monetizable` flags set against the thresholds in
`platform_settings`. A unique index on `(video_id, session_hash, hour_bucket)`
deduplicates refreshes and replays within the hour. Session identifiers are
hashed before storage; raw IPs are never stored, only `ip_hash`.

**Jobs are transactional.** `processing_jobs` rows are inserted in the same
transaction as the work they describe. Workers claim with `FOR UPDATE SKIP
LOCKED` and hold a lease; `locked_until` in the past means the worker died and
the job is free again. `idempotency_key` is unique, so retrying an enqueue is
harmless.

**The ledger cannot lie.** `ledger_entries` has a `BEFORE UPDATE OR DELETE`
trigger that raises — corrections are reversing transactions, never edits. A
deferred constraint trigger checks that every transaction's debits equal its
credits at COMMIT, so an unbalanced posting cannot exist even transiently
outside its transaction. Creator balances are derived from entries;
`creator_earnings` is only a daily rollup for fast Studio reads.

**Audit is append-only** by the same mechanism. Every privileged action
writes actor, role, before/after JSON and a hashed IP.

**External catalogue rows.** `videos.external_source` + `external_id` (unique
together) mark a row that mirrors a YouTube video rather than an upload. A
check constraint keeps the pair consistent; uploads have both null and own
`video_assets` rows instead.

## Retention and privacy

| Data | Retention |
| --- | --- |
| `video_views`, `recommendation_events` | 400 days, then aggregated and dropped |
| `ad_impressions` | 7 years (financial record) |
| `audit_logs`, ledger tables | 7 years, immutable |
| `refresh_tokens` | deleted 30 days after expiry |
| `upload_sessions` abandoned | aborted and storage reclaimed after 24h |
| Deleted account | profile and content soft-deleted immediately, hard-deleted after 30 days except rows under legal hold or financial record |

`privacy_requests` tracks export and erasure requests end to end; the export
job writes an archive to storage and records its key.

## Known gaps

- Partitioning for `video_views` / `ad_impressions` is designed for but not
  implemented; do it on measured volume, not speculation.
- Tax and withholding fields exist, but rates and compliance rules are not
  implemented and need professional review before any real payout.
