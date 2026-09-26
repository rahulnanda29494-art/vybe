import type { CategoryKey } from './types';

/* Client-safe YouTube helpers (no secrets, no server imports). */

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  music: 'Music',
  gaming: 'Gaming',
  tech: 'Technology',
  ai: 'AI',
  education: 'Education',
  sports: 'Sports',
  travel: 'Travel',
  fashion: 'Fashion',
  food: 'Food',
  podcasts: 'Podcasts',
  coding: 'Coding',
  comedy: 'Comedy',
};

export const isCategory = (s: string): s is CategoryKey => s in CATEGORY_LABEL;

/** Best → safest thumbnail candidates. `hqdefault` exists for every video. */
export function thumbCandidates(id: string, kind: 'wide' | 'hero' | 'short' = 'wide'): string[] {
  const base = `https://i.ytimg.com/vi/${id}`;
  if (kind === 'hero') return [`${base}/maxresdefault.jpg`, `${base}/hq720.jpg`, `${base}/hqdefault.jpg`];
  if (kind === 'short') return [`${base}/oardefault.jpg`, `${base}/hq720.jpg`, `${base}/hqdefault.jpg`];
  return [`${base}/hq720.jpg`, `${base}/hqdefault.jpg`];
}

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const channelUrl = (id: string) => `https://www.youtube.com/channel/${id}`;

/** Parses ISO-8601 durations from the Data API ("PT1H2M3S"). */
export function parseIsoDuration(iso?: string): number | undefined {
  if (!iso) return undefined;
  const m = iso.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return undefined;
  const [, d, h, min, s] = m.map((x) => Number(x ?? 0));
  return d * 86400 + h * 3600 + min * 60 + s;
}

/** Hours since an ISO timestamp, relative to `now` (pass a fixed value to avoid hydration drift). */
export function hoursSince(iso: string, now: number): number {
  return Math.max(0, (now - new Date(iso).getTime()) / 3_600_000);
}

/** Internal channel route. Accepts a UC… id, a handle, or an "@handle". */
export const channelHref = (idOrHandle: string) =>
  idOrHandle ? `/channel/${encodeURIComponent(idOrHandle)}` : '#';
