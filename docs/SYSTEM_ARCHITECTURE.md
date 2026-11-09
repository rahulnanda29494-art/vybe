# System architecture

VYBE is a modular monolith: one Next.js process serves the web app and the
API, and a separate worker process does the heavy media work. PostgreSQL is
the system of record; object storage holds every byte of media; nothing
binary is stored in the database.

See [DECISIONS.md](DECISIONS.md) for why this shape was chosen over the
NestJS/Prisma/Redis stack in the original blueprint.

## Processes

```
┌──────────────────────────────────────────────────────────────┐
│ next (app + api)            npm run dev / next start         │
│   app/            routes, server components, route handlers  │
│   server/         domain modules — the backend               │
└───────────────┬───────────────────────────┬──────────────────┘
                │ SQL                       │ enqueue (same txn)
                ▼                           ▼
        ┌───────────────┐          ┌──────────────────┐
        │  PostgreSQL   │◀────────▶│ processing_jobs  │
        └───────┬───────┘  claim   └────────┬─────────┘
                │          SKIP LOCKED      │
                │                           ▼
                │                ┌──────────────────────┐
                │                │ worker  npm run worker│
                │                │  ffmpeg / ffprobe     │
                │                └──────────┬───────────┘
                ▼                           ▼
        ┌────────────────────────────────────────────┐
        │ object storage  (local disk | S3/R2/MinIO) │
        │   original/  hls/  thumbs/  subs/          │
        └────────────────────────────────────────────┘
```

A third external dependency is optional: the YouTube Data API for the
catalogue layer, and Groq for AI features. Both degrade to "feature hidden"
rather than "app broken" when their keys are absent.

## Module map (`server/`)

| Module | Owns |
| --- | --- |
| `db/` | pool, migrations, migration runner, seed |
| `auth/` | password hashing, JWT, sessions, guards, RBAC checks |
| `storage/` | object-storage adapters: local disk, S3-compatible |
| `media/` | ffprobe metadata, ABR ladder, HLS packaging, thumbnails |
| `jobs/` | queue driver (claim/lease/retry), job kinds, worker loop |
| `videos/` | upload sessions, video CRUD, publishing rules, playback |
| `social/` | likes, comments, subscriptions, playlists, notifications |
| `discovery/` | feeds, trending, search, recommendation candidates |
| `studio/` | creator analytics reads |
| `commerce/` | ledger postings, memberships, payouts |
| `moderation/` | reports, actions, copyright, audit log |
| `youtube/` | external catalogue (API + RSS fallback + ranking) |
| `ai/` | Groq adapters: smarter search, summaries, metadata |

Route handlers in `app/api/` are adapters only: parse and validate input,
check authorization, call a module, serialise the result. Business rules live
in the modules so they are reachable from the worker too.

## Request paths that matter

**Upload.** `POST /api/uploads/sessions` creates a `videos` row (status
`draft`) and an `upload_sessions` row in one transaction, and returns part
targets. The client PUTs parts directly to storage and reports each one.
`POST /api/uploads/sessions/:id/complete` verifies the part count and
checksum, flips the video to `queued`, and enqueues a `transcode` job — same
transaction, so a queued job always has a video.

**Processing.** The worker claims the job, runs `ffprobe` for duration and
streams, rejects anything that is not decodable video, transcodes the ABR
ladder, writes HLS segments and playlists to storage, extracts thumbnails,
inserts `video_assets` / `video_variants`, then sets the video to `ready` and
`published_at` according to its schedule. Progress is written to
`processing_jobs.progress` so Studio can show it.

**Playback.** The watch page reads the video and its variants. An own upload
plays through the VYBE HLS player (`hls.js`, native HLS on Safari); a
catalogue row mirroring YouTube plays through the YouTube IFrame player with
its controls intact. Private and unlisted videos resolve through signed,
expiring URLs.

**Views.** The player reports watch progress. A playback is only a view once
it passes `views.count_after_seconds`, and only monetizable past
`views.monetizable_after_seconds`; `(video, session, hour)` is unique, so
replays and refreshes cannot inflate counts.

## Environments

| | development | staging | production |
| --- | --- | --- | --- |
| database | local PostgreSQL 17 | managed, separate | managed, separate, backed up |
| storage | `./.storage` on disk | isolated bucket | bucket + CDN |
| media | local FFmpeg worker | same | worker containers, scaled separately |
| payments | provider test keys | test keys | live keys |
| secrets | `.env.local`, git-ignored | platform secrets | secrets manager |

No production data is ever copied into development.

## Scaling path

The parts that saturate first, in order: media transcoding (add worker
processes — the queue lease makes that safe), bandwidth (CDN in front of
storage), read-heavy feed queries (cache layer and read replica), then event
tables (`video_views`, `ad_impressions`, `recommendation_events` are designed
to be partitioned by month when volume justifies it).
