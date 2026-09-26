import { NextResponse, type NextRequest } from 'next/server';
import { getCategory, getHomeFeed, getShorts, getTrending, searchPage, type SearchOrder } from '@/server/youtube';
import { isCategory } from '@/lib/yt';

export const runtime = 'nodejs';

const ORDERS = new Set<SearchOrder>(['relevance', 'date', 'viewCount']);

/**
 * GET /api/videos
 *   ?q=term[&order=relevance|date|viewCount][&pageToken=…][&exact=1]  search
 *   ?feed=home|trending|shorts                                        feeds
 *   ?category=music|gaming|…                                          category
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = sp.get('q')?.trim().slice(0, 200);
  const order = (sp.get('order') ?? 'relevance') as SearchOrder;
  const pageToken = sp.get('pageToken')?.slice(0, 200) || undefined;
  const category = sp.get('category');
  const feed = sp.get('feed') ?? 'home';

  if (!ORDERS.has(order)) return NextResponse.json({ error: 'Invalid order' }, { status: 400 });
  if (pageToken && !/^[A-Za-z0-9_-]+$/.test(pageToken)) return NextResponse.json({ error: 'Invalid pageToken' }, { status: 400 });
  if (category && !isCategory(category)) return NextResponse.json({ error: 'Unknown category' }, { status: 400 });

  if (q) {
    const page = await searchPage(q, order, { pageToken, exact: sp.get('exact') === '1', ai: sp.get('ai') === '1' });
    return NextResponse.json(
      { items: page.results, channels: page.channels, nextPageToken: page.nextPageToken, correctedTo: page.correctedTo, ai: page.ai, scope: page.scope },
      { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } },
    );
  }

  const items =
    category && isCategory(category)
      ? await getCategory(category)
      : feed === 'trending'
        ? await getTrending(25)
        : feed === 'shorts'
          ? await getShorts(30)
          : await getHomeFeed();

  return NextResponse.json({ items }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } });
}
