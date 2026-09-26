import 'server-only';
import type { CategoryKey, Channel, Video, YtComment } from '@/lib/types';
import { parseIsoDuration } from '@/lib/yt';
import { sourceById } from './channels';

/**
 * YouTube Data API v3 client. Only used when YOUTUBE_API_KEY is set.
 * The key stays on the server — it is never sent to the browser.
 */

const BASE = 'https://www.googleapis.com/youtube/v3';

export const hasApiKey = () => Boolean(process.env.YOUTUBE_API_KEY);
const region = () => process.env.YOUTUBE_REGION ?? 'US';

/** YouTube videoCategoryId ↔ VYBE category. */
export const YT_CATEGORY_ID: Partial<Record<CategoryKey, string>> = {
  music: '10',
  gaming: '20',
  sports: '17',
  travel: '19',
  comedy: '23',
  education: '27',
  tech: '28',
  food: '26',
  fashion: '26',
};
const FROM_YT_ID: Record<string, CategoryKey> = {
  '10': 'music', '20': 'gaming', '17': 'sports', '19': 'travel', '23': 'comedy',
  '27': 'education', '28': 'tech', '26': 'food', '24': 'comedy', '22': 'podcasts',
};

async function call<T>(path: string, params: Record<string, string | number | undefined>, revalidate = 600): Promise<T> {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  url.searchParams.set('key', process.env.YOUTUBE_API_KEY!);
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) {
    // Surface YouTube's reason (quotaExceeded, keyInvalid, …) but never the key itself.
    const reason = await res
      .json()
      .then((b: { error?: { errors?: { reason?: string }[] } }) => b.error?.errors?.[0]?.reason)
      .catch(() => undefined);
    throw new Error(`YouTube API ${path} failed: ${res.status}${reason ? ` (${reason})` : ''}`);
  }
  return res.json() as Promise<T>;
}

/* ------------------------------ raw shapes ------------------------------ */

interface ApiThumbs { [k: string]: { url: string } | undefined }
interface ApiVideo {
  id: string;
  snippet: {
    title: string; description: string; channelId: string; channelTitle: string;
    publishedAt: string; tags?: string[]; categoryId?: string; liveBroadcastContent?: string;
    thumbnails: ApiThumbs;
  };
  statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails?: { duration?: string };
  liveStreamingDetails?: { concurrentViewers?: string };
}
interface ApiChannel {
  id: string;
  snippet: { title: string; description: string; customUrl?: string; thumbnails: ApiThumbs };
  statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string; hiddenSubscriberCount?: boolean };
  brandingSettings?: { image?: { bannerExternalUrl?: string } };
}

const bestThumb = (t: ApiThumbs) => (t.high ?? t.medium ?? t.default)?.url;

function toVideo(v: ApiVideo, avatars: Map<string, string>): Video {
  const durationSec = parseIsoDuration(v.contentDetails?.duration);
  const live = v.snippet.liveBroadcastContent === 'live';
  return {
    id: v.id,
    title: v.snippet.title,
    description: v.snippet.description,
    channelId: v.snippet.channelId,
    channelTitle: v.snippet.channelTitle,
    channelAvatar: avatars.get(v.snippet.channelId),
    channelVerified: true,
    publishedAt: v.snippet.publishedAt,
    views: Number(v.statistics?.viewCount ?? 0),
    likes: v.statistics?.likeCount ? Number(v.statistics.likeCount) : undefined,
    comments: v.statistics?.commentCount ? Number(v.statistics.commentCount) : undefined,
    durationSec: live ? undefined : durationSec,
    category:
      sourceById(v.snippet.channelId)?.category ?? FROM_YT_ID[v.snippet.categoryId ?? ''] ?? 'tech',
    tags: (v.snippet.tags ?? []).slice(0, 8),
    isShort: !live && durationSec !== undefined && durationSec > 0 && durationSec <= 60,
    isLive: live,
    liveViewers: v.liveStreamingDetails?.concurrentViewers
      ? Number(v.liveStreamingDetails.concurrentViewers)
      : undefined,
  };
}

/* ------------------------------ endpoints ------------------------------- */

export async function apiChannels(ids: string[]): Promise<Channel[]> {
  const unique = [...new Set(ids)].slice(0, 50);
  if (!unique.length) return [];
  const data = await call<{ items?: ApiChannel[] }>(
    'channels',
    { part: 'snippet,statistics,brandingSettings', id: unique.join(','), maxResults: 50 },
    3600,
  );
  return (data.items ?? []).map((c) => ({
    id: c.id,
    title: c.snippet.title,
    handle: c.snippet.customUrl?.replace(/^@/, ''),
    avatar: bestThumb(c.snippet.thumbnails),
    banner: c.brandingSettings?.image?.bannerExternalUrl
      ? `${c.brandingSettings.image.bannerExternalUrl}=w2120`
      : undefined,
    description: c.snippet.description,
    subscribers: c.statistics?.hiddenSubscriberCount ? undefined : Number(c.statistics?.subscriberCount ?? 0),
    videoCount: Number(c.statistics?.videoCount ?? 0),
    totalViews: Number(c.statistics?.viewCount ?? 0),
    category: sourceById(c.id)?.category ?? 'tech',
    verified: true,
  }));
}

async function hydrate(items: ApiVideo[]): Promise<Video[]> {
  const channels = await apiChannels(items.map((i) => i.snippet.channelId)).catch(() => []);
  const avatars = new Map(channels.filter((c) => c.avatar).map((c) => [c.id, c.avatar!]));
  return items.map((i) => toVideo(i, avatars));
}

const VIDEO_PARTS = 'snippet,statistics,contentDetails,liveStreamingDetails';

export async function apiVideosById(ids: string[]): Promise<Video[]> {
  if (!ids.length) return [];
  const data = await call<{ items?: ApiVideo[] }>('videos', { part: VIDEO_PARTS, id: ids.slice(0, 50).join(','), maxResults: 50 });
  return hydrate(data.items ?? []);
}

export async function apiMostPopular(category?: CategoryKey, max = 24): Promise<Video[]> {
  const data = await call<{ items?: ApiVideo[] }>('videos', {
    part: VIDEO_PARTS,
    chart: 'mostPopular',
    regionCode: region(),
    videoCategoryId: category ? YT_CATEGORY_ID[category] : undefined,
    maxResults: max,
  });
  return hydrate(data.items ?? []);
}

export interface ApiSearchResult {
  videos: Video[];
  channels: Channel[];
  nextPageToken?: string;
  totalResults?: number;
}

/**
 * search.list — 100 quota units per call (videos.list/channels.list are 1).
 * Only user-typed searches and the (6-hour cached) live page use it; results
 * are cached per query so repeat searches are free.
 */
export async function apiSearch(
  q: string,
  opts: {
    order?: 'relevance' | 'date' | 'viewCount';
    live?: boolean;
    max?: number;
    pageToken?: string;
    withChannels?: boolean;
    revalidate?: number;
  } = {},
): Promise<ApiSearchResult> {
  const data = await call<{
    items?: { id: { kind: string; videoId?: string; channelId?: string } }[];
    nextPageToken?: string;
    pageInfo?: { totalResults?: number };
  }>(
    'search',
    {
      part: 'id',
      q,
      type: opts.withChannels ? 'video,channel' : 'video',
      order: opts.order ?? 'relevance',
      eventType: opts.live ? 'live' : undefined,
      regionCode: region(),
      relevanceLanguage: process.env.YOUTUBE_LANGUAGE || undefined,
      safeSearch: 'moderate',
      maxResults: opts.max ?? 24,
      pageToken: opts.pageToken,
    },
    opts.revalidate ?? 1800,
  );

  const items = data.items ?? [];
  const videoIds = items.map((i) => i.id.videoId).filter((x): x is string => Boolean(x));
  const channelIds = items
    .filter((i) => i.id.kind === 'youtube#channel')
    .map((i) => i.id.channelId)
    .filter((x): x is string => Boolean(x));

  const [videos, channels] = await Promise.all([
    apiVideosById(videoIds),
    channelIds.length ? apiChannels(channelIds).catch(() => []) : Promise.resolve([]),
  ]);
  return { videos, channels, nextPageToken: data.nextPageToken, totalResults: data.pageInfo?.totalResults };
}

export async function apiChannelUploads(channelId: string, max = 24): Promise<Video[]> {
  const uploads = `UU${channelId.slice(2)}`;
  const data = await call<{ items?: { contentDetails: { videoId: string } }[] }>('playlistItems', {
    part: 'contentDetails',
    playlistId: uploads,
    maxResults: max,
  });
  return apiVideosById((data.items ?? []).map((i) => i.contentDetails.videoId));
}

export async function apiChannelByHandle(handle: string): Promise<Channel | null> {
  const data = await call<{ items?: { id: string }[] }>('channels', { part: 'id', forHandle: `@${handle.replace(/^@/, '')}` }, 86400);
  const id = data.items?.[0]?.id;
  return id ? (await apiChannels([id]))[0] ?? null : null;
}

interface ApiCommentSnippet {
  authorDisplayName: string; authorProfileImageUrl?: string; textOriginal: string;
  likeCount: number; publishedAt: string; authorChannelId?: { value: string };
}

export async function apiComments(videoId: string, channelId: string, order: 'relevance' | 'time'): Promise<YtComment[]> {
  const data = await call<{
    items?: {
      id: string;
      snippet: { totalReplyCount: number; topLevelComment: { id: string; snippet: ApiCommentSnippet } };
      replies?: { comments: { id: string; snippet: ApiCommentSnippet }[] };
    }[];
  }>('commentThreads', { part: 'snippet,replies', videoId, order, maxResults: 30, textFormat: 'plainText' }, 600);

  const map = (id: string, s: ApiCommentSnippet, replies: YtComment[] = [], replyCount = 0): YtComment => ({
    id,
    author: s.authorDisplayName,
    authorAvatar: s.authorProfileImageUrl,
    body: s.textOriginal,
    likes: s.likeCount,
    publishedAt: s.publishedAt,
    replyCount,
    replies,
    isCreator: s.authorChannelId?.value === channelId,
  });

  return (data.items ?? []).map((t) =>
    map(
      t.snippet.topLevelComment.id,
      t.snippet.topLevelComment.snippet,
      (t.replies?.comments ?? []).map((r) => map(r.id, r.snippet)),
      t.snippet.totalReplyCount,
    ),
  );
}
