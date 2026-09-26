import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { PageHead } from '@/components/ui/PageHead';
import { Section } from '@/components/ui/Section';
import { Rail } from '@/components/ui/Rail';
import { Thumb } from '@/components/media/Thumb';
import { VideoCard } from '@/components/media/VideoCard';
import { CreatorCard, ShortCard } from '@/components/media/cards';
import { getHomeFeed, getShorts, getSpotlightChannels, getTrending } from '@/server/youtube';
import type { CategoryKey } from '@/lib/types';
import { CATEGORY_LABEL } from '@/lib/yt';

export const metadata: Metadata = { title: 'Explore' };
export const revalidate = 300;

const TILES: { key: CategoryKey | 'trending'; href: string }[] = [
  { key: 'trending', href: '/trending' },
  { key: 'music', href: '/category/music' },
  { key: 'gaming', href: '/category/gaming' },
  { key: 'tech', href: '/category/tech' },
  { key: 'ai', href: '/category/ai' },
  { key: 'sports', href: '/category/sports' },
  { key: 'podcasts', href: '/category/podcasts' },
  { key: 'education', href: '/category/education' },
  { key: 'travel', href: '/category/travel' },
  { key: 'fashion', href: '/category/fashion' },
  { key: 'food', href: '/category/food' },
  { key: 'comedy', href: '/category/comedy' },
];

export default async function ExplorePage() {
  const [feed, trending, shorts, channels] = await Promise.all([
    getHomeFeed(),
    getTrending(10),
    getShorts(12),
    getSpotlightChannels(),
  ]);

  // Each tile's art is that category's freshest real video.
  const coverFor = (key: CategoryKey | 'trending') =>
    key === 'trending' ? trending[0]?.id : feed.find((v) => v.category === key)?.id;
  const latestByChannel = new Map(feed.map((v) => [v.channelId, v.id] as const));

  return (
    <AppShell>
      <PageHead kicker="Discover" title="Explore everything" subtitle="Categories, creators and moments worth your next hour." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {TILES.map((t) => {
          const cover = coverFor(t.key);
          return (
            <Link
              key={t.key}
              href={t.href}
              className="group relative aspect-[4/3] overflow-hidden rounded-tile bg-vybe-soft shadow-soft transition-all duration-300 ease-vybe hover:-translate-y-1 hover:shadow-lift"
            >
              {cover && (
                <Thumb id={cover} className="absolute inset-0 h-full w-full transition-transform duration-[700ms] ease-vybe group-hover:scale-110" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
              <div
                className="absolute inset-0 opacity-60 mix-blend-soft-light"
                style={{ background: 'linear-gradient(140deg, rgb(var(--c-brand-1)/.6), transparent 60%)' }}
              />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="font-display text-[19px] font-extrabold leading-tight tracking-tight text-white sm:text-[22px]">
                  {t.key === 'trending' ? 'Trending' : CATEGORY_LABEL[t.key]}
                </p>
              </div>
              <span className="absolute right-3 top-3 grid h-8 w-8 -translate-y-1.5 place-items-center rounded-full bg-white/15 text-white opacity-0 backdrop-blur-md transition-all duration-300 ease-vybe group-hover:translate-y-0 group-hover:opacity-100">
                <ArrowUpRight size={15} />
              </span>
            </Link>
          );
        })}
      </div>

      <Section title="Popular Right Now" kicker="Most watched" href="/trending">
        <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {trending.slice(0, 10).map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      </Section>

      <Section title="Channels to Watch" kicker="Spotlight">
        <Rail label="Channels to watch" itemClass="w-[262px]">
          {channels.map((c) => (
            <CreatorCard key={c.id} channel={c} coverVideoId={latestByChannel.get(c.id)} />
          ))}
        </Rail>
      </Section>

      {shorts.length > 0 && (
        <Section title="Shorts Feed" kicker="Quick hits" href="/shorts">
          <Rail label="Shorts feed" itemClass="w-[168px] sm:w-[186px]">
            {shorts.map((s) => (
              <ShortCard key={s.id} video={s} />
            ))}
          </Rail>
        </Section>
      )}
    </AppShell>
  );
}
