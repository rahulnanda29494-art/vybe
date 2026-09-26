import 'server-only';
import type { Video } from '@/lib/types';

/* ============================================================
   Relevance search over the channel pool (keyless mode), and
   Google's YouTube autocomplete (both modes).
   ============================================================ */

const STOP = new Set(['the', 'a', 'an', 'of', 'and', 'or', 'to', 'in', 'on', 'for', 'is', 'with', 'by', 'at', 'vs']);

export function normalize(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // strip combining marks (accents): "Beyoncé" → "beyonce"
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function tokens(s: string): string[] {
  const all = normalize(s).split(' ').filter(Boolean);
  const meaningful = all.filter((t) => !STOP.has(t));
  return meaningful.length ? meaningful : all;
}

/** Levenshtein distance with an early exit once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** How well one query token matches a set of field words: 1 exact, .85 prefix, .55 typo, 0 none. */
function tokenMatch(q: string, words: string[]): number {
  let best = 0;
  const typoBudget = q.length >= 8 ? 2 : q.length >= 4 ? 1 : 0;
  for (const w of words) {
    if (w === q) return 1;
    if (q.length >= 2 && w.startsWith(q)) best = Math.max(best, 0.85);
    else if (typoBudget && best < 0.55 && editDistance(q, w, typoBudget) <= typoBudget) best = 0.55;
  }
  return best;
}

interface Indexed {
  video: Video;
  title: string;
  titleWords: string[];
  channelWords: string[];
  tagWords: string[];
  descWords: string[];
}

const FIELD_WEIGHT = { title: 5, channel: 4, tags: 3, desc: 1 } as const;

function index(v: Video): Indexed {
  const title = normalize(v.title);
  return {
    video: v,
    title,
    titleWords: title.split(' '),
    channelWords: normalize(v.channelTitle).split(' '),
    tagWords: v.tags.flatMap((t) => normalize(t).split(' ')),
    descWords: normalize(v.description.slice(0, 600)).split(' '),
  };
}

/**
 * Ranks videos the way a search engine would: every query word must match
 * somewhere (most words, for long queries), title and channel hits outrank
 * description hits, exact phrases get a boost, and popularity breaks ties.
 */
export function rankVideos(videos: Video[], query: string): Video[] {
  const q = tokens(query);
  if (!q.length) return [];
  const phrase = normalize(query);
  // Every word for short queries, two-thirds of them for long ones.
  const required = q.length <= 2 ? q.length : Math.ceil(q.length * 0.67);

  const scored: { v: Video; score: number }[] = [];
  for (const doc of videos.map(index)) {
    let score = 0;
    let matched = 0;
    for (const t of q) {
      const s = Math.max(
        tokenMatch(t, doc.titleWords) * FIELD_WEIGHT.title,
        tokenMatch(t, doc.channelWords) * FIELD_WEIGHT.channel,
        tokenMatch(t, doc.tagWords) * FIELD_WEIGHT.tags,
        tokenMatch(t, doc.descWords) * FIELD_WEIGHT.desc,
      );
      if (s > 0) matched++;
      score += s;
    }
    if (matched < required) continue;
    if (phrase.length > 2 && doc.title.includes(phrase)) score += 8;
    if (doc.title.startsWith(phrase)) score += 3;
    score += Math.log10(doc.video.views + 10) * 0.35; // popularity as a tie-breaker, not a trump card
    scored.push({ v: doc.video, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.v);
}

/**
 * True when `suggestion` is a respelling of `query` ("taylr swft" →
 * "taylor swift") rather than a completion ("taylor" → "taylor swift songs").
 */
export function isSpellingFix(query: string, suggestion: string): boolean {
  const q = normalize(query).split(' ').filter(Boolean);
  const sAll = normalize(suggestion).split(' ').filter(Boolean);
  if (!q.length || sAll.length < q.length) return false;
  const s = sAll.slice(0, q.length);
  let changed = false;
  for (let i = 0; i < q.length; i++) {
    if (q[i] === s[i]) continue;
    // The last word may still be mid-typing — a prefix there is a completion, not a typo.
    if (i === q.length - 1 && s[i].startsWith(q[i])) continue;
    const budget = Math.max(1, Math.floor(Math.max(q[i].length, s[i].length) / 3));
    if (editDistance(q[i], s[i], budget) > budget) return false;
    changed = true;
  }
  return changed;
}

/* ------------------------- Google autocomplete ------------------------- */

/**
 * Query completions from Google's YouTube suggest service — the same list
 * YouTube and browsers show while you type. Cached for an hour per query.
 */
export async function googleSuggest(q: string, hl = 'en'): Promise<string[]> {
  const url =
    'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&ie=utf-8&oe=utf-8' +
    `&hl=${encodeURIComponent(hl)}&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return [];
    const data = JSON.parse(await res.text()) as [string, string[]];
    return Array.isArray(data?.[1]) ? data[1].filter((s) => typeof s === 'string').slice(0, 8) : [];
  } catch {
    return []; // suggestions are a nicety — never fail the request over them
  }
}
