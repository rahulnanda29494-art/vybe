import { NextResponse, type NextRequest } from 'next/server';
import { getSpotlightChannels, suggest } from '@/server/youtube';
import { normalize } from '@/server/youtube/search';

export const runtime = 'nodejs';

/**
 * Typeahead: Google's YouTube query completions (what people actually
 * search for) + matching channels. No YouTube API quota is spent.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim().slice(0, 100);
  if (!q) return NextResponse.json({ terms: [], channels: [] });

  const nq = normalize(q);
  const [terms, channels] = await Promise.all([suggest(q), getSpotlightChannels()]);
  const matched = channels
    .filter((c) => normalize(c.title).includes(nq) || normalize(c.handle ?? '').startsWith(nq.replace(/ /g, '')))
    .slice(0, 3)
    .map((c) => ({ id: c.id, title: c.title, handle: c.handle, avatar: c.avatar, subscribers: c.subscribers }));

  return NextResponse.json(
    { terms, channels: matched },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' } },
  );
}
