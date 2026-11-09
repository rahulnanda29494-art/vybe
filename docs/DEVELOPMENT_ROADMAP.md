# Development roadmap

Status is deliberately conservative: **done** means the workflow was run end
to end against the real database or service, not that a screen renders.

Legend — ✅ done · 🟡 partial · ⬜ not started

| # | Phase | Status | Where it stands |
| --- | --- | --- | --- |
| 1 | Requirements and architecture | ✅ | `docs/` — architecture, database design, decisions, this roadmap |
| 2 | Project foundation | 🟡 | Next.js 15 + TS strict + Tailwind + lint/typecheck run clean; no CI workflow, no containers yet |
| 3 | Database and authentication | 🟡 | 5 migrations + runner + seed written; email/password auth with scrypt + HS256 JWT in an httpOnly cookie works. Missing: migrations applied to a live DB (in progress), Google OAuth, email verification, password reset, RBAC enforcement |
| 4 | Design system | ✅ | CSS-variable tokens, glass/gradient primitives, responsive 320→1920, keyboard and ARIA passes |
| 5 | Home and discovery | 🟡 | All discovery screens built and fast, but fed by the YouTube catalogue layer rather than own `videos` rows |
| 6 | Upload and storage | ⬜ | Multi-step wizard UI exists; resumable multipart upload, validation and upload sessions are the next build |
| 7 | Processing and playback | ⬜ | FFmpeg installed; worker, ABR ladder, HLS packaging and the VYBE player are the next build |
| 8 | Shorts | 🟡 | Vertical feed, snap scrolling and engagement UI exist on catalogue data; needs own-upload Shorts |
| 9 | Social features | 🟡 | Likes, watch later, playlists, subscriptions and history work client-side in `localStorage`; must move to the server tables so they survive devices |
| 10 | Creator Studio | 🟡 | Studio shell, charts and upload wizard exist on sample data; real analytics come from `video_views` once uploads flow |
| 11 | AI Studio | 🟡 | Smarter search (Groq) live and verified; video summary module written but not wired; dubbing, highlights, thumbnails not started |
| 12 | Monetization | ⬜ | Full schema including double-entry ledger; no service, no provider, no UI |
| 13 | Live streaming | ⬜ | Schema and a Live page on catalogue data; no ingest, no chat backend |
| 14 | Admin and governance | ⬜ | Schema for reports, actions, copyright and audit; no admin UI |
| 15 | Production readiness | ⬜ | Security review, load testing, backups, deploy pipeline |

## Order of work from here

1. **Apply migrations to the local database and seed it.** Nothing below is
   verifiable until this runs.
2. **Phase 6 — upload.** Upload sessions, resumable parts, validation,
   Studio wiring. Acceptance: a file leaves the browser, lands in storage,
   and a `videos` row reaches `queued`.
3. **Phase 7 — processing and playback.** Worker loop, ffprobe validation,
   ABR ladder, HLS, thumbnails, player. Acceptance: that same upload plays
   back at multiple qualities from storage.
4. **Phase 9 — move the library server-side.** History, likes, watch later,
   playlists and subscriptions against the real tables, with the
   `localStorage` store becoming the signed-out fallback only.
5. **Phase 5 completion.** Feeds read own uploads first, catalogue second.
6. **Phase 10 — Studio analytics** from `video_views`.
7. **Phase 14 — admin and moderation**, then 12 and 13.

## Quality gates

A phase is not done until, for everything it touched:

- migrations apply cleanly from empty and the constraints are exercised;
- the workflow runs end to end from UI through API to database and back;
- authorization is enforced server-side and tested with the wrong user;
- loading, empty and error states exist;
- the screens hold at 320px and at 1920px;
- `npm run typecheck` is clean and the relevant tests pass;
- `docs/` and `CHANGELOG.md` are updated in the same commit.
