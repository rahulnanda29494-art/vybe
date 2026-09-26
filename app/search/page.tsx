import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { SearchClient } from './SearchClient';
import { searchPage, suggest, type SearchOrder } from '@/server/youtube';

const ORDERS: SearchOrder[] = ['relevance', 'date', 'viewCount'];

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `${q} — Search` : 'Search' };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; exact?: string; ai?: string }>;
}) {
  const { q: raw = '', sort: rawSort, exact, ai } = await searchParams;
  const q = raw.trim().slice(0, 200);
  const sort: SearchOrder = ORDERS.includes(rawSort as SearchOrder) ? (rawSort as SearchOrder) : 'relevance';

  const page = q ? await searchPage(q, sort, { exact: exact === '1', ai: ai === '1' }) : null;
  // Only fetch "try instead" ideas when there's nothing to show.
  const ideas =
    page && !page.results.length && !page.channels.length
      ? (await suggest(q)).filter((s) => s.trim().toLowerCase() !== q.toLowerCase()).slice(0, 6)
      : [];

  return (
    <AppShell>
      <Suspense>
        <SearchClient key={`${q}|${sort}|${exact}|${ai}`} query={q} sort={sort} page={page} ideas={ideas} />
      </Suspense>
    </AppShell>
  );
}
