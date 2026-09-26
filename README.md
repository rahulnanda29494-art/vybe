# VYBE

**Watch. Create. Connect.**

A next-generation video streaming and creator platform — dark, cinematic UI with
purple → pink → orange gradients, glassmorphism and soft neon glow. Built with
Next.js 15 (App Router), React 19, TypeScript and Tailwind. The catalogue is
YouTube: VYBE is an original front-end and creator experience layered over
YouTube's public data and its official embedded player.

## Features

**Viewer**
- Home feed with cinematic hero, category pills and a mixed video/shorts grid
- Continue watching with resume positions, Trending, Live, Shorts, Explore
- Watch page with the official YouTube player, related videos and comments
- Channel pages, search with suggestions, history, liked, watch later, playlists
- Library stored per-browser (no account required to keep history or playlists)

**Search**
- Google/YouTube-style autocomplete with recent searches and voice input
- Typo tolerance and relevance ranking (title / channel / tags / description weights)
- Sort by relevance, date or views; infinite "load more" pagination

**AI (optional, needs a Groq key)**
- *Smarter search* — turns a description like "that sad hindi movie where the dad
  hides a body" into precise YouTube searches, and always shows what it searched
  with a one-click "search exactly what I typed" escape hatch

**Creator**
- Creator Studio with audience/watch-time charts (Recharts)
- Multi-step upload wizard with an object-storage abstraction (local disk or S3/R2)

**Craft**
- CSS-variable design tokens, Framer Motion micro-interactions, skeleton loaders,
  empty and error states, responsive 320 → 1920 with no horizontal overflow
- Keyboard navigation, visible focus rings, ARIA labelling, AA contrast

## Quick start

```bash
npm install
cp .env.example .env.local   # optional: add your API keys
npm run dev                  # http://localhost:3210
```

It runs with an empty `.env.local`. Every key is optional — see below for what
each one unlocks.

## Configuration

| Variable | Default | What it does |
| --- | --- | --- |
| `YOUTUBE_API_KEY` | *(empty)* | Unlocks full-catalogue search via YouTube Data API v3. Without it, VYBE reads public channel RSS feeds for a curated pool of 67 channels — the UI works, but search only sees recent uploads from those channels. |
| `YOUTUBE_REGION` | `IN` | Region for trending and popular videos. |
| `YOUTUBE_LANGUAGE` | *(empty)* | Preferred result language. |
| `GROQ_API_KEY` | *(empty)* | Enables the AI features. Without it they stay hidden. |
| `DATABASE_URL` | *(empty)* | PostgreSQL for accounts. Without it, users are stored in a git-ignored dev JSON file. |
| `JWT_SECRET` | *(dev fallback)* | Session signing key — set 32+ random characters in production. |
| `STORAGE_DRIVER` | `local` | `local` writes uploads to `./.storage`; `s3` targets S3, R2 or MinIO. |

Getting a YouTube key: Google Cloud Console → APIs & Services → enable
**YouTube Data API v3** → Credentials → Create API key. The free tier is 10,000
units/day; VYBE spends `search.list` (100 units) only on real user queries and
caches results for 30 minutes, taking everything else from 1-unit endpoints and
free RSS feeds.

## Scripts

```bash
npm run dev        # dev server on port 3210
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
```

## Project structure

```
app/          routes (home, watch, search, channel, studio, auth, api)
components/   shell, media, watch, home, library, studio, ui, brand primitives
lib/          shared types, formatters, client-side library store (localStorage)
server/       youtube/ (data sources, ranking)  ai/ (Groq)  auth/  db/  storage/
```

`server/youtube/index.ts` is the single content interface — every screen reads
through it, so swapping or extending a source touches one file.

## Deploying

Works on any Node host; Vercel needs no extra configuration. Add the environment
variables from the table above in the host's dashboard, then build and start.
`.env.local` and `.storage/` are git-ignored and never leave your machine.

## Notes

Video playback uses YouTube's official IFrame Player API, whose controls stay
visible and unobscured as its terms require. VYBE's own branding, design system
and code are original; video content, thumbnails and metadata belong to their
respective creators.
