# Architecture decisions

Each entry records what was chosen, what it was chosen over, and what would
make us revisit it. Decisions are append-only; supersede rather than edit.

---

## ADR-001 — Next.js route handlers as the application server, not a separate NestJS API

**Date:** 2026-11-09 · **Status:** accepted

The MyVibe blueprint specifies NestJS for the backend. VYBE already runs a
Next.js 15 App Router application with route handlers, session auth, a
storage adapter and 95 TypeScript modules in `server/`, all typechecked and
deployed from one process.

**Decision.** Keep the modular monolith in Next.js. `server/` is the backend:
one folder per domain (`auth/`, `db/`, `youtube/`, `ai/`, `storage/`, and the
modules added per phase), with route handlers in `app/api/` acting only as
thin HTTP adapters — validation, authorization, serialization. No business
logic in route handlers, so the modules stay portable.

**Why not NestJS.** It would duplicate the session layer, split deployment in
two, and force a rewrite of working code for no capability we lack today. The
blueprint's own principle is "modular monolith, avoid unnecessary
microservices"; this honours the principle while skipping the second runtime.

**Revisit when.** The API needs to scale or deploy independently of the web
tier, or a non-web client (native mobile) needs a stable versioned API
surface. The module boundary in `server/` is what makes that extraction
possible later.

---

## ADR-002 — PostgreSQL-backed job queue, not Redis + BullMQ

**Date:** 2026-11-09 · **Status:** accepted

**Decision.** `processing_jobs` is the queue. Workers claim jobs with
`SELECT … FOR UPDATE SKIP LOCKED`, hold a lease (`locked_by`,
`locked_until`), and renew it while running; an expired lease is reclaimed,
so a crashed worker loses nothing. Retries use `attempts` /`max_attempts`
with backoff via `run_after`, and `idempotency_key` makes enqueue safe to
repeat.

**Why.** It removes Redis from the development stack entirely — one fewer
service to install and keep running on the dev machine — while giving
transactional enqueue: a video row and its transcode job are committed in the
same transaction, so there is no "job queued for a video that doesn't exist"
state. Throughput of a Postgres queue is far beyond what this platform will
produce in its first year.

**Why not BullMQ.** It needs Redis running at all times and loses the
transactional enqueue property. The job row shape here deliberately matches
BullMQ's (kind, payload, attempts, priority, delay) so the driver can be
swapped behind `server/jobs/queue.ts` without touching producers.

**Revisit when.** Sustained job rates exceed a few hundred per second, or
multiple machines contend badly on the claim query.

---

## ADR-003 — SQL migrations and typed query modules, not Prisma

**Date:** 2026-11-09 · **Status:** accepted

**Decision.** Schema lives in `server/db/migrations/*.sql`, applied by
`server/db/migrate.mjs` which records a checksum per migration and refuses to
run one that changed after it was applied. Queries live in per-domain modules
using the `pg` driver with parameterised SQL and hand-written row types.

**Why.** The schema uses constraint triggers, deferred constraints, partial
and expression indexes, generated columns, `tsvector` search and an immutable
ledger — all of which Prisma either cannot express or pushes into raw SQL
anyway, leaving two sources of truth. Parameterised `pg` queries carry the
same injection safety.

**Cost accepted.** No generated client: row types are written by hand and must
be kept in step with migrations. Integration tests against a real database are
how that is caught, which the blueprint requires regardless.

**Revisit when.** The team grows past the point where hand-written types stay
accurate, or a second service needs the same models.

---

## ADR-004 — Local FFmpeg worker first, managed provider behind the same interface

**Date:** 2026-11-09 · **Status:** accepted

**Decision.** Implement `VideoProvider` (the blueprint's interface) with a
local FFmpeg adapter that transcodes to an ABR ladder and writes HLS to object
storage, driven by a standalone worker process. Mux/Cloudflare Stream adapters
slot in behind the same interface when delivery volume justifies the cost.

**Why.** The platform must work end to end before it can justify per-minute
provider pricing, and the pipeline (validate → probe → renditions → HLS →
thumbnails → publish) is the same either way.

---

## ADR-005 — YouTube catalogue stays, alongside own uploads

**Date:** 2026-11-09 · **Status:** accepted

VYBE's discovery surfaces are currently powered by YouTube data
(`server/youtube/`). The platform's own uploads are the product; the YouTube
catalogue is a seeded discovery layer so the app is not empty on day one.

**Decision.** `videos.external_source` / `external_id` mark a catalogue row as
mirroring a YouTube video. Own uploads have those columns null and carry
`video_assets` / `video_variants` rows instead. The watch page picks its
player from that flag: YouTube IFrame for mirrored rows (whose controls must
remain visible under YouTube's terms), the VYBE HLS player for uploads.

**Revisit when.** Owned content is sufficient to fill the feeds, at which
point the YouTube layer can be switched off per surface without schema change.
