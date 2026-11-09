# VYBE — engineering instructions

Watch. Create. Connect. A video-sharing, streaming and creator-monetization
platform: long-form video, Shorts, live, social, Studio, AI tooling. A real
product, not a prototype — read `docs/DEVELOPMENT_ROADMAP.md` for what is
actually built before claiming anything works.

## Stack as built

Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind ·
Framer Motion · Lucide · Recharts · PostgreSQL 17 via `pg` · SQL migrations ·
FFmpeg worker · object storage (local disk or S3-compatible) · Groq for AI.

Deviations from the original MyVibe blueprint (NestJS, Prisma, Redis/BullMQ)
are recorded with reasoning in `docs/DECISIONS.md`. Follow the decisions, or
write a new ADR superseding one — do not silently reintroduce a dropped
dependency.

## Layout

```
app/        routes + route handlers (thin HTTP adapters only)
components/ UI, grouped by surface
lib/        shared types, formatters, client-side stores
server/     the backend, one folder per domain — business logic lives here
  db/       pool, migrations/, migrate.mjs, seed.mjs
worker/     standalone process: media transcoding and background jobs
docs/       architecture, database, API, security, decisions, roadmap
```

Route handlers validate, authorize, call a `server/` module, serialise. No
business logic in them — the worker must be able to call the same code.

## Rules

1. **Never fake a workflow.** No mock responses standing in for a real one,
   no button that does nothing, no screen fed by placeholder data once the
   real table exists.
2. **Never claim done without running it.** "It typechecks" is not "it
   works". Exercise the path: UI → API → database → back.
3. **Migrations only.** Schema changes are a new file in
   `server/db/migrations/`; never edit an applied migration.
4. **Authorize on the server.** Hiding a control in the UI is not a
   permission check. Test with the wrong user.
5. **Validate every input** at the route boundary, with explicit length and
   type limits, before it reaches a module.
6. **Money is integer minor units**, every posting is double-entry and
   balanced, every external call carries an idempotency key, provider
   webhooks are signature-verified and deduplicated. Never trust a payment
   status from the client.
7. **Media never touches the database** — object storage holds bytes, the
   database holds keys and metadata.
8. **Secrets come from the environment.** Nothing hardcoded; `.env.local` is
   git-ignored and stays that way.
9. **Every screen needs loading, empty and error states**, keyboard access,
   visible focus, and no horizontal overflow from 320px to 1920px.
10. **AI output is reviewable and reversible.** Record provider, model,
    usage and cost in `ai_jobs`; show the user what the model did; never let
    a model's guess silently replace what they asked for.
11. **Match the surrounding code** — its naming, comment density and idiom.
    Comments explain why, not what.
12. Update `docs/` and `CHANGELOG.md` in the same commit as the change.

## Commands

```bash
npm run dev            # app on :3210
npm run worker         # media/background worker
npm run typecheck      # tsc --noEmit — must be clean before any commit
npm run db:migrate     # apply migrations
npm run db:seed -- --demo
npm run db:reset       # dev only: drop, migrate, seed
```

## Content sources

The catalogue layer (`server/youtube/`) mirrors YouTube videos into discovery
surfaces so the product is not empty before creators arrive. Those rows carry
`videos.external_source = 'youtube'` and must play through YouTube's IFrame
player with its controls visible, as its terms require. Own uploads play
through the VYBE HLS player. Keep the two paths distinct.
