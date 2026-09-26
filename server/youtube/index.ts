import 'server-only';
import { cache } from 'react';
import type { CategoryKey, Channel, Video, YtComment } from '@/lib/types';
import {
  YT_CATEGORY_ID,
  apiChannelByHandle,
  apiChannelUploads,
  apiChannels,
  apiComments,
  apiMostPopular,
  apiSearch,
  apiVideosById,
  hasApiKey,
} from './api';
import { fetchChannelFeed } from './rss';
import { googleSuggest, isSpellingFix, normalize, rankVideos } from './search';
import { SOURCE_CHANNELS, sourceByHandle, sourceById } from './channels';
import { interpretQuery, looksDescriptive, type Interpretation } from '@/server/ai/search';

/**
 * The single content interface for VYBE. Every page reads from here.
 *
 *  - YOUTUBE_API_KEY set → YouTube Data API v3: search across all of
 *    YouTube, regional trending, durations, subscriber counts, comments.
 *  - No key             → public RSS feeds of ~70 curated channels.
 *
 * Quota budget (10,000 units/day free): search.list costs 100, everything
 * else ~1. So search.list is reserved for what the user types (cached 30
 * min per query) and the live page (cached 6 h). Shorts and the AI /
 * Coding / Podcasts categories come from the free channel feeds.
 *
 * Any API failure (quota exhausted, bad key, network) falls back to RSS.
 */

export const sourceMode = () => (hasApiKey() ? 'api' : 'rss') as 'api' | 'rss';

async function withFallback<T>(api: () => Promise<T>, rss: () => Promise<T>): Promise<T> {
  if (!hasApiKey()) return rss();
  try {
    return await api();
  } catch (err) {
    console.warn('[youtube] API unavailable, using RSS fallback:', (err as Error).message);
    return rss();
  }
}

/** Promise.all with a concurrency cap — ~70 feeds shouldn't open ~70 sockets at once. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Every curated channel's latest uploads, newest first, deduplicated. */
const pool = cache(async (): Promise<Video[]> => {
  const feeds = await mapLimit(SOURCE_CHANNELS, 12, fetchChannelFeed);
  const seen = new Set<string>();
  return feeds
    .flat()
    .filter((v) => (seen.has(v.id) ? false : (seen.add(v.id), true)))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
});

/** Engagement-weighted freshness — keeps RSS "trending" from being just "newest". */
function trendScore(v: Video, now: number) {
  const hours = Math.max(1, (now - new Date(v.publishedAt).getTime()) / 3_600_000);
  return v.views / Math.pow(hours + 2, 1.15);
}

/** Round-robin across channels so one prolific channel can't flood a feed. */
function interleave(videos: Video[]): Video[] {
  const byChannel = new Map<string, Video[]>();
  for (const v of videos) byChannel.set(v.channelId, [...(byChannel.get(v.channelId) ?? []), v]);
  const queues = [...byChannel.values()];
  const out: Video[] = [];
  for (let i = 0; out.length < videos.length; i++) {
    for (const q of queues) if (q[i]) out.push(q[i]);
  }
  return out;
}

const longform = (list: Video[]) => list.filter((v) => !v.isShort);

/* ------------------------------- feeds -------------------------------- */

export const getHomeFeed = cache(async (): Promise<Video[]> =>
  withFallback(
    async () => longform(await apiMostPopular(undefined, 50)),
    async () => interleave(longform(await pool())).slice(0, 40),
  ),
);

/** Every recent long-form upload we know about — used to build subscription feeds. */
export const getRecentUploads = cache(async (): Promise<Video[]> => {
  const recent = longform(await pool());
  if (!hasApiKey()) return recent;
  const popular = await apiMostPopular(undefined, 50).catch(() => []);
  return [...longform(popular), ...recent.filter((v) => !popular.some((p) => p.id === v.id))];
});

export const getTrending = cache(async (limit = 20): Promise<Video[]> =>
  withFallback(
    async () => longform(await apiMostPopular(undefined, Math.min(50, limit + 10))).slice(0, limit),
    async () => {
      const now = Date.now();
      return longform(await pool())
        .sort((a, b) => trendScore(b, now) - trendScore(a, now))
        .slice(0, limit);
    },
  ),
);

/** Shorts always come from the channel feeds — searching for them would burn quota. */
export const getShorts = cache(async (limit = 24): Promise<Video[]> =>
  interleave((await pool()).filter((v) => v.isShort)).slice(0, limit),
);

/** Live needs the Data API (RSS has no live signal). One search per 6 hours. */
export const getLive = cache(async (limit = 12): Promise<Video[]> => {
  if (!hasApiKey()) return [];
  try {
    const { videos } = await apiSearch('live', { live: true, order: 'viewCount', max: limit, revalidate: 21_600 });
    return videos;
  } catch {
    return [];
  }
});

export const getCategory = cache(async (category: CategoryKey): Promise<Video[]> => {
  const fromPool = async () => longform(await pool()).filter((v) => v.category === category);
  // YouTube has no category id for AI / Coding / Podcasts — the curated channels cover them for free.
  if (!YT_CATEGORY_ID[category]) return fromPool();
  return withFallback(async () => longform(await apiMostPopular(category, 40)), fromPool);
});

/* ------------------------------- search ------------------------------- */

export type SearchOrder = 'relevance' | 'date' | 'viewCount';

export interface SearchPage {
  results: Video[];
  channels: Channel[];
  /** Set when the query looked misspelled and we searched the correction instead. */
  correctedTo?: string;
  nextPageToken?: string;
  totalResults?: number;
  /** 'youtube' = all of YouTube; 'featured' = only the curated channels (no API key). */
  scope: 'youtube' | 'featured';
  /** Set when VYBE AI interpreted a described query ("that sad hindi movie…"). */
  ai?: {
    label: string;
    /** The search that produced these results. */
    searched: string;
    /** Other ways the AI would phrase it — offered as chips. */
    alternatives: string[];
    confidence: Interpretation['confidence'];
  };
}

async function searchOnce(q: string, order: SearchOrder, pageToken?: string): Promise<Omit<SearchPage, 'correctedTo'>> {
  return withFallback<Omit<SearchPage, 'correctedTo'>>(
    async () => {
      const r = await apiSearch(q, { order, pageToken, withChannels: !pageToken, max: 24 });
      return { results: r.videos, channels: r.channels, nextPageToken: r.nextPageToken, totalResults: r.totalResults, scope: 'youtube' };
    },
    async () => {
      const hits = rankVideos(await pool(), q);
      if (order === 'viewCount') hits.sort((a, b) => b.views - a.views);
      if (order === 'date') hits.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
      const nq = normalize(q);
      const channels = (await getSpotlightChannels()).filter(
        (c) => normalize(c.title).includes(nq) || normalize(c.handle ?? '') === nq.replace(/ /g, ''),
      );
      return { results: hits.slice(0, 60), channels, scope: 'featured' };
    },
  );
}

/** Search an AI interpretation: one YouTube call in API mode, every phrasing merged in feed mode (free). */
async function searchInterpretation(ai: Interpretation, original: string, order: SearchOrder) {
  const primary = await searchOnce(ai.queries[0], order);
  if (primary.scope === 'youtube') return primary;
  const seen = new Set(primary.results.map((v) => v.id));
  const extra: Video[] = [];
  for (const phrasing of [...ai.queries.slice(1), original]) {
    for (const v of (await searchOnce(phrasing, order)).results) {
      if (!seen.has(v.id)) {
        seen.add(v.id);
        extra.push(v);
      }
    }
  }
  return { ...primary, results: [...primary.results, ...extra].slice(0, 60) };
}

const aiMeta = (ai: Interpretation, searched: string): NonNullable<SearchPage['ai']> => ({
  label: ai.label,
  searched,
  alternatives: ai.queries.filter((x) => x !== searched),
  confidence: ai.confidence,
});

/**
 * Search the way people expect from Google:
 *  1. Described something? VYBE AI (Groq) turns it into what they'd search —
 *     "that sad hindi movie where the dad hides a body" → "Drishyam 2015".
 *  2. Misspelled? Search the correction ("Showing results for …").
 *  3. Otherwise a plain ranked search, with a last-chance retry via Google's
 *     suggestion and then the AI when nothing matches.
 * `exact` disables all rewriting (the "Search exactly what I typed" link);
 * `ai` forces the AI interpretation even for short queries.
 */
export const searchPage = cache(
  async (
    q: string,
    order: SearchOrder = 'relevance',
    opts: { pageToken?: string; exact?: boolean; ai?: boolean } = {},
  ): Promise<SearchPage> => {
    if (opts.exact || opts.pageToken) return searchOnce(q, order, opts.pageToken);

    let triedAi: Interpretation | null = null;
    if (opts.ai || looksDescriptive(q)) {
      triedAi = await interpretQuery(q);
      if (triedAi) {
        const page = await searchInterpretation(triedAi, q, order);
        if (page.results.length || page.channels.length) return { ...page, ai: aiMeta(triedAi, triedAi.queries[0]) };
      }
    }

    // Check spelling first (free, cached) so a typo costs one search, not two.
    const top = (await googleSuggest(q))[0];
    if (top && isSpellingFix(q, top)) {
      const fixed = normalize(top).split(' ').slice(0, normalize(q).split(' ').length).join(' ');
      const corrected = await searchOnce(fixed, order);
      if (corrected.results.length) return { ...corrected, correctedTo: fixed };
    }

    const first = await searchOnce(q, order);
    if (first.results.length || first.channels.length) {
      // The AI's idea didn't match anything, but offer it as a suggestion anyway.
      return triedAi ? { ...first, ai: aiMeta(triedAi, q) } : first;
    }

    if (top && normalize(top) !== normalize(q)) {
      const fallback = await searchOnce(top, order);
      if (fallback.results.length) return { ...fallback, correctedTo: top };
    }

    // Last chance: a plain query that found nothing may still be a description.
    triedAi ??= await interpretQuery(q);
    if (triedAi) {
      const page = await searchInterpretation(triedAi, q, order);
      return { ...(page.results.length ? page : first), ai: aiMeta(triedAi, page.results.length ? triedAi.queries[0] : q) };
    }
    return first;
  },
);

/** Plain list form, for the JSON API. */
export const searchVideos = cache(async (q: string, order: SearchOrder = 'relevance'): Promise<Video[]> =>
  (await searchPage(q, order)).results,
);

/** Autocomplete: Google's YouTube completions, falling back to titles we already have. */
export const suggest = cache(async (q: string): Promise<string[]> => {
  const google = await googleSuggest(q);
  if (google.length) return google;
  return rankVideos(await pool(), q)
    .slice(0, 6)
    .map((v) => v.title);
});

/* ------------------------------ entities ------------------------------ */

export const getVideo = cache(async (id: string): Promise<Video | null> => {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return null;
  return withFallback(
    async () => (await apiVideosById([id]))[0] ?? null,
    async () => (await pool()).find((v) => v.id === id) ?? oembedVideo(id),
  );
});

/** Any public YouTube video can be watched, even outside the curated feed. */
async function oembedVideo(id: string): Promise<Video | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const o = (await res.json()) as { title: string; author_name: string; author_url: string };
    const handle = o.author_url.split('/@')[1];
    const source = handle ? sourceByHandle(handle) : undefined;
    return {
      id,
      title: o.title,
      description: '',
      channelId: source?.id ?? (handle ? `@${handle}` : ''),
      channelTitle: o.author_name,
      channelVerified: Boolean(source),
      publishedAt: '',
      views: 0,
      category: source?.category ?? 'tech',
      tags: [],
      isShort: false,
      isLive: false,
    };
  } catch {
    return null;
  }
}

/**
 * Up next: more from the same channel first, then popular videos in the
 * same category. Relevant without spending search quota (~2 units).
 */
export const getRelated = cache(async (video: Video, limit = 14): Promise<Video[]> => {
  const dedupe = (list: Video[]) => {
    const seen = new Set([video.id]);
    return list.filter((v) => !v.isShort && !seen.has(v.id) && (seen.add(v.id), true)).slice(0, limit);
  };

  return withFallback(
    async () => {
      const channelId = video.channelId.startsWith('UC') ? video.channelId : undefined;
      const [sameChannel, sameCategory] = await Promise.all([
        channelId ? apiChannelUploads(channelId, 8).catch(() => []) : Promise.resolve([]),
        YT_CATEGORY_ID[video.category] ? apiMostPopular(video.category, 20).catch(() => []) : Promise.resolve([]),
      ]);
      const rest = sameCategory.length ? [] : await apiMostPopular(undefined, 20).catch(() => []);
      return dedupe([...sameChannel.slice(0, 5), ...sameCategory, ...sameChannel.slice(5), ...rest]);
    },
    async () => {
      const all = longform(await pool());
      const sameChannel = all.filter((v) => v.channelId === video.channelId);
      const sameCategory = all.filter((v) => v.category === video.category && v.channelId !== video.channelId);
      return dedupe([...sameChannel.slice(0, 4), ...interleave(sameCategory), ...sameChannel.slice(4), ...interleave(all)]);
    },
  );
});

export const getChannel = cache(async (idOrHandle: string): Promise<{ channel: Channel; videos: Video[] } | null> => {
  const source = idOrHandle.startsWith('UC') ? sourceById(idOrHandle) : sourceByHandle(idOrHandle);

  const fromPool = async () => {
    if (!source) return null;
    const videos = (await pool()).filter((v) => v.channelId === source.id);
    return {
      channel: {
        id: source.id,
        title: videos[0]?.channelTitle ?? source.title,
        handle: source.handle,
        category: source.category,
        verified: true,
        videoCount: videos.length,
      },
      videos,
    };
  };

  return withFallback(async () => {
    const channel = idOrHandle.startsWith('UC') ? (await apiChannels([idOrHandle]))[0] : await apiChannelByHandle(idOrHandle);
    if (!channel) return fromPool();
    return { channel, videos: await apiChannelUploads(channel.id) };
  }, fromPool);
});

/** Channels for the spotlight rail — enriched with avatars/subscribers when the API is on. */
export const getSpotlightChannels = cache(async (): Promise<Channel[]> => {
  const base: Channel[] = SOURCE_CHANNELS.map((c) => ({
    id: c.id,
    title: c.title,
    handle: c.handle,
    category: c.category,
    verified: true,
  }));
  if (!hasApiKey()) return base;
  try {
    // channels.list takes 50 ids per call, 1 unit each call.
    const ids = SOURCE_CHANNELS.map((c) => c.id);
    const batches = await Promise.all([apiChannels(ids.slice(0, 50)), apiChannels(ids.slice(50, 100))]);
    const enriched = batches.flat();
    return base.map((b) => ({ ...b, ...enriched.find((e) => e.id === b.id), handle: b.handle, category: b.category }));
  } catch {
    return base;
  }
});

export const getComments = cache(
  async (videoId: string, channelId: string, order: 'relevance' | 'time' = 'relevance'): Promise<YtComment[] | null> =>
    hasApiKey() ? apiComments(videoId, channelId, order).catch(() => null) : null,
);
