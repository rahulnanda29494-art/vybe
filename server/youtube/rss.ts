import 'server-only';
import type { Video } from '@/lib/types';
import type { SourceChannel } from './channels';

/**
 * Keyless source: YouTube's public per-channel Atom feed (latest ~15 uploads).
 * Provides title, description, publish date, thumbnail, views and a rating
 * count. It does NOT provide duration or subscriber counts.
 */

const FEED = (id: string) => `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
const REVALIDATE = 60 * 15;

const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decode = (s: string) =>
  s.replace(/&(amp|lt|gt|quot|apos|#39);/g, (m) => ENTITIES[m] ?? m).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const pick = (xml: string, re: RegExp) => {
  const m = xml.match(re);
  return m ? decode(m[1].trim()) : '';
};

export async function fetchChannelFeed(channel: SourceChannel): Promise<Video[]> {
  try {
    const res = await fetch(FEED(channel.id), { next: { revalidate: REVALIDATE } });
    if (!res.ok) return [];
    const xml = await res.text();

    return xml
      .split('<entry>')
      .slice(1)
      .map((entry): Video | null => {
        const id = pick(entry, /<yt:videoId>([^<]+)<\/yt:videoId>/);
        if (!id) return null;
        const link = pick(entry, /<link rel="alternate" href="([^"]+)"/);
        const description = pick(entry, /<media:description>([\s\S]*?)<\/media:description>/);
        const views = Number(pick(entry, /<media:statistics views="(\d+)"/) || 0);
        const ratings = Number(pick(entry, /<media:starRating count="(\d+)"/) || 0);
        return {
          id,
          title: pick(entry, /<title>([\s\S]*?)<\/title>/),
          description,
          channelId: channel.id,
          channelTitle: pick(entry, /<name>([\s\S]*?)<\/name>/) || channel.title,
          channelVerified: true,
          publishedAt: pick(entry, /<published>([^<]+)<\/published>/),
          views,
          likes: ratings || undefined,
          category: channel.category,
          tags: Array.from(description.matchAll(/#(\w{2,30})/g), (m) => m[1].toLowerCase()).slice(0, 6),
          isShort: link.includes('/shorts/'),
          isLive: false,
        };
      })
      .filter((v): v is Video => v !== null);
  } catch {
    // One unreachable feed must never take the page down.
    return [];
  }
}
