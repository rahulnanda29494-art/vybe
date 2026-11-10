# Changelog

Verified milestones only — an entry here means the workflow was run, not that
the code was written.

## 2026-11-10 — Database foundation (roadmap phase 3, partial)

**Added**
- Five SQL migrations: identity and RBAC, content and media assets,
  engagement, commerce with a double-entry ledger, live/AI/safety/audit.
- Migration runner with per-file checksums (`npm run db:migrate`), idempotent
  seed with optional demo accounts (`npm run db:seed -- --demo`).
- 18 integration tests against a real PostgreSQL (`npm run test`).
- `scripts/pg.mjs` to start/stop a portable local PostgreSQL;
  `scripts/import-local-users.mjs` to move dev JSON-store accounts into it.
- `docs/`: system architecture, database design, decisions (4 ADRs), roadmap.
- `CLAUDE.md` with the engineering rules for this repo.

**Verified**
- PostgreSQL 17.11 running locally on port 5433 (5432 was already occupied);
  all five migrations applied from empty.
- Seed loaded 14 permissions, 14 categories, 11 platform settings and the
  7-account chart of accounts.
- Tests pass 18/18: counter triggers (likes, dislikes, subscribers, comments,
  replies), search vector including tags added after insert, per-session-hour
  view deduplication, ledger balance enforcement and immutability, duplicate
  idempotency keys refused, audit log append-only, external-video constraints,
  publish-before-ready refused, job claim with `SKIP LOCKED`.
- `POST /api/auth/register` → row in `users` → session cookie →
  `GET /api/auth/me` returns the account. Auth now runs on Postgres.
- The two existing JSON-store accounts were imported with their password
  hashes, so their passwords still work.

**Fixed**
- `video_views.hour_bucket` pinned to UTC: `date_trunc` over a `timestamptz`
  reads the session time zone and cannot back a generated column.

**Not done yet**
- Upload, transcoding and playback (phases 6–7) — FFmpeg 9.0.2 is installed,
  the worker is not written.
- The app's feeds still read the YouTube catalogue layer, not `videos`.
- Library actions (likes, history, playlists, subscriptions) still live in
  `localStorage` rather than the tables that now exist.

## Earlier

See git history — design system, discovery screens, search with AI query
interpretation, auth, and the YouTube catalogue layer predate this changelog.
