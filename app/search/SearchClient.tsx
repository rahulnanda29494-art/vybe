'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, Info, Loader2, Search, SearchX, Sparkles, WandSparkles } from 'lucide-react';
import { VideoCard } from '@/components/media/VideoCard';
import { CreatorCard, LiveCard, ShortCard } from '@/components/media/cards';
import { PageHead } from '@/components/ui/PageHead';
import { Pill } from '@/components/ui/primitives';
import type { SearchPage, SearchOrder } from '@/server/youtube';
import type { Video } from '@/lib/types';
import { compact } from '@/lib/format';

const TABS = ['All', 'Videos', 'Shorts', 'Channels', 'Live'] as const;
const SORTS: { label: string; value: SearchOrder }[] = [
  { label: 'Relevant', value: 'relevance' },
  { label: 'Latest', value: 'date' },
  { label: 'Most viewed', value: 'viewCount' },
];

const youtubeSearch = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

export function SearchClient({
  query,
  sort,
  page,
  ideas,
}: {
  query: string;
  sort: SearchOrder;
  page: SearchPage | null;
  ideas: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const [extra, setExtra] = useState<Video[]>([]);
  const [token, setToken] = useState(page?.nextPageToken);
  const [loading, setLoading] = useState(false);

  const effective = page?.correctedTo ?? page?.ai?.searched ?? query;

  const setSort = (value: SearchOrder) => {
    const next = new URLSearchParams(params.toString());
    next.set('sort', value);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const loadMore = async () => {
    if (!token || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/videos?q=${encodeURIComponent(effective)}&order=${sort}&pageToken=${token}&exact=1`);
      const data = (await res.json()) as { items: Video[]; nextPageToken?: string };
      setExtra((e) => [...e, ...data.items.filter((v) => !e.some((x) => x.id === v.id))]);
      setToken(data.nextPageToken);
    } finally {
      setLoading(false);
    }
  };

  if (!query || !page) {
    return (
      <>
        <PageHead kicker="Search" title="Search VYBE" />
        <Empty
          title="Search anything."
          body="Songs, creators, movies, trailers, tutorials — press / anywhere to start typing."
        />
      </>
    );
  }

  const all = [...page.results, ...extra];
  const videos = all.filter((v) => !v.isShort && !v.isLive);
  const shorts = all.filter((v) => v.isShort);
  const live = all.filter((v) => v.isLive);
  const channels = page.channels;
  const nothing = !all.length && !channels.length;
  const show = (t: (typeof TABS)[number]) => tab === 'All' || tab === t;

  return (
    <>
      <PageHead
        kicker={
          page.scope === 'youtube' && page.totalResults
            ? `About ${compact(page.totalResults)} results`
            : nothing
              ? 'Search results'
              : `${all.length + channels.length} results`
        }
        title={page.ai && page.ai.searched !== query ? page.ai.label || `“${effective}”` : `“${effective}”`}
      />

      {/* spelling correction, Google-style */}
      {page.correctedTo && (
        <p className="-mt-3 mb-6 text-[14px] text-dim">
          Showing results for <span className="font-bold italic text-ink">{page.correctedTo}</span>
          <br />
          <span className="text-[13px]">
            Search instead for{' '}
            <Link href={`/search?q=${encodeURIComponent(query)}&exact=1`} className="font-semibold text-brand-2 hover:underline">
              {query}
            </Link>
          </span>
        </p>
      )}

      {/* VYBE AI interpretation — always with a way back to the literal search */}
      {page.ai && (
        <div className="grad-ring relative -mt-2 mb-6 overflow-hidden rounded-2xl bg-vybe-soft px-4 py-3.5">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-dim">
            <WandSparkles size={16} className="shrink-0 text-brand-2" />
            <span className="font-bold text-ink">VYBE AI</span>
            {page.ai.searched === query ? (
              <span>
                thinks you might mean <span className="font-bold text-ink">{page.ai.label}</span>
              </span>
            ) : (
              <span>
                searched for <span className="font-bold text-ink">{page.ai.searched}</span>
                {page.ai.label && page.ai.label.toLowerCase() !== page.ai.searched.toLowerCase() && (
                  <> · {page.ai.label}</>
                )}
              </span>
            )}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {page.ai.alternatives.map((alt) => (
              <Link
                key={alt}
                href={`/search?q=${encodeURIComponent(alt)}&exact=1`}
                className="glass inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-[12.5px] font-semibold text-ink transition-all hover:-translate-y-px"
              >
                <Search size={12} className="text-faint" />
                {alt}
              </Link>
            ))}
            {page.ai.searched !== query && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&exact=1`}
                className="inline-flex h-8 items-center px-2 text-[12.5px] font-semibold text-brand-2 hover:underline"
              >
                Search exactly “{query.length > 48 ? `${query.slice(0, 48)}…` : query}”
              </Link>
            )}
          </div>
        </div>
      )}

      {/* developer hint — never shown in production builds */}
      {page.scope === 'featured' && process.env.NODE_ENV !== 'production' && (
        <div className="glass mb-6 flex items-start gap-3 rounded-2xl px-4 py-3 text-[13px] text-dim">
          <Info size={16} className="mt-0.5 shrink-0 text-electric" />
          <p>
            Searching VYBE’s featured channels only. Add <code className="rounded bg-[var(--glass-thin)] px-1.5 py-0.5 font-bold text-ink">YOUTUBE_API_KEY</code> to{' '}
            <code className="rounded bg-[var(--glass-thin)] px-1.5 py-0.5 font-bold text-ink">.env.local</code> to search all of YouTube.
          </p>
        </div>
      )}

      {nothing ? (
        <div className="glass relative overflow-hidden rounded-panel px-6 py-14 text-center">
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: 'radial-gradient(50% 60% at 50% 0%, rgb(var(--c-brand-1) / 0.16), transparent 70%)' }} />
          <div className="relative mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[26px] bg-vybe-soft text-brand-2 ring-1 ring-inset ring-[var(--line-strong)]">
            <SearchX size={30} />
          </div>
          <h2 className="relative font-display text-2xl font-extrabold text-ink">No matches for “{query}”.</h2>
          <p className="relative mx-auto mt-2.5 max-w-md text-sm leading-relaxed text-dim">
            {page.scope === 'featured'
              ? 'It isn’t in VYBE’s featured channels yet. Try one of these, or open the full results on YouTube.'
              : 'Check the spelling, or try one of these searches.'}
          </p>
          {ideas.length > 0 && (
            <div className="relative mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-2">
              {ideas.map((idea) => (
                <Link
                  key={idea}
                  href={`/search?q=${encodeURIComponent(idea)}`}
                  className="glass inline-flex h-9 items-center gap-1.5 rounded-pill px-4 text-[13px] font-semibold text-ink transition-all hover:-translate-y-px hover:border-[var(--line-strong)]"
                >
                  <Search size={13} className="text-faint" />
                  {idea}
                </Link>
              ))}
            </div>
          )}
          <a
            href={youtubeSearch(page.ai?.alternatives[0] ?? query)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-7 inline-flex h-11 items-center gap-2 rounded-pill bg-vybe px-5 text-sm font-bold text-white shadow-[0_8px_22px_-10px_rgb(var(--c-brand-2))] transition-transform hover:-translate-y-0.5"
          >
            See results on YouTube <ExternalLink size={15} />
          </a>
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="no-bar flex gap-2 overflow-x-auto">
              {TABS.map((t) => (
                <Pill key={t} active={tab === t} onClick={() => setTab(t)}>
                  {t}
                </Pill>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Sort</span>
              {SORTS.map((s) => (
                <Pill key={s.value} active={sort === s.value} onClick={() => setSort(s.value)}>
                  {s.label}
                </Pill>
              ))}
            </div>
          </div>

          {show('Channels') && channels.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-display text-xl font-extrabold text-ink">Channels</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {channels.map((c) => (
                  <CreatorCard key={c.id} channel={c} coverVideoId={all.find((v) => v.channelId === c.id)?.id} />
                ))}
              </div>
            </section>
          )}

          {show('Live') && live.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-display text-xl font-extrabold text-ink">Live</h2>
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {live.map((l) => (
                  <LiveCard key={l.id} video={l} />
                ))}
              </div>
            </section>
          )}

          {show('Shorts') && shorts.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 font-display text-xl font-extrabold text-ink">Shorts</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
                {shorts.map((s) => (
                  <ShortCard key={s.id} video={s} />
                ))}
              </div>
            </section>
          )}

          {show('Videos') && videos.length > 0 && (
            <section>
              <div className="flex flex-col gap-7">
                {videos.map((v) => (
                  <VideoCard key={v.id} video={v} layout="row" priorityTitle />
                ))}
              </div>
            </section>
          )}

          {tab !== 'All' &&
            ((tab === 'Videos' && !videos.length) ||
              (tab === 'Shorts' && !shorts.length) ||
              (tab === 'Channels' && !channels.length) ||
              (tab === 'Live' && !live.length)) && (
              <Empty title={`No ${tab.toLowerCase()} for this search.`} body="Try another tab, or tweak your search." />
            )}

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {token ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="glass inline-flex h-11 items-center gap-2 rounded-pill px-6 text-sm font-bold text-ink transition-all hover:-translate-y-px hover:border-[var(--line-strong)] disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-brand-2" />}
                {loading ? 'Loading…' : 'Load more results'}
              </button>
            ) : null}
            <a
              href={youtubeSearch(effective)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-pill px-4 text-[13px] font-bold text-faint transition-colors hover:text-ink"
            >
              More on YouTube <ExternalLink size={13} />
            </a>
          </div>
        </>
      )}
    </>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass flex flex-col items-center rounded-panel px-6 py-16 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-[22px] bg-vybe-soft text-brand-2">
        <SearchX size={26} />
      </span>
      <p className="mt-5 font-display text-xl font-extrabold text-ink">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-dim">{body}</p>
    </div>
  );
}
