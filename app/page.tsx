import { AppShell } from '@/components/shell/AppShell';
import { Hero } from '@/components/home/Hero';
import { CategoryBar } from '@/components/home/CategoryBar';
import { ContinueWatching } from '@/components/home/ContinueWatching';
import { Section } from '@/components/ui/Section';
import { Rail } from '@/components/ui/Rail';
import { EmptyState } from '@/components/ui/EmptyState';
import { VideoCard } from '@/components/media/VideoCard';
import { CreatorCard, LiveCard, ShortCard, TrendingCard } from '@/components/media/cards';
import { getHomeFeed, getLive, getShorts, getSpotlightChannels, getTrending } from '@/server/youtube';
import { WifiOff } from 'lucide-react';

// Feeds are cached upstream (15 min RSS / 10 min API); re-render at most every 5 min.
export const revalidate = 300;

const GRID = 'grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';

export default async function HomePage() {
  const [feed, trending, shorts, live, channels] = await Promise.all([
    getHomeFeed(),
    getTrending(10),
    getShorts(16),
    getLive(8),
    getSpotlightChannels(),
  ]);

  if (!feed.length && !trending.length) {
    return (
      <AppShell>
        <EmptyState
          icon={<WifiOff size={30} />}
          title="Something went off vibe."
          body="We couldn’t reach YouTube just now. Check your connection and try again."
          action="Try again"
          href="/"
        />
      </AppShell>
    );
  }

  const hero = trending[0] ?? feed[0];
  const rest = feed.filter((v) => v.id !== hero.id);
  const latestByChannel = new Map(feed.map((v) => [v.channelId, v.id] as const));

  return (
    <AppShell>
      <Hero video={hero} />
      <CategoryBar />

      <div className={GRID}>
        {/* 12 fills whole rows at 2/3/4 columns; the last two hide at 5 columns (2×5). */}
        {rest.slice(0, 12).map((v, i) => (
          <div key={v.id} className={i >= 10 ? '2xl:hidden' : undefined}>
            <VideoCard video={v} />
          </div>
        ))}
      </div>

      <ContinueWatching />

      {shorts.length > 0 && (
        <Section title="VYBE Shorts" kicker="Under a minute" href="/shorts" action="Open Shorts">
          <Rail label="Shorts" itemClass="w-[168px] sm:w-[186px]">
            {shorts.map((s) => (
              <ShortCard key={s.id} video={s} />
            ))}
          </Rail>
        </Section>
      )}

      <Section title="Trending Now" kicker="Top 5 right now" href="/trending">
        <Rail label="Trending now" itemClass="w-[340px] sm:w-[440px]">
          {trending.slice(0, 5).map((v, i) => (
            <TrendingCard key={v.id} video={v} rank={i + 1} />
          ))}
        </Rail>
      </Section>

      {live.length > 0 && (
        <Section title="Live Right Now" kicker="Join the room" href="/live">
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {live.slice(0, 4).map((s, i) => (
              <div key={s.id} className={i === 3 ? 'sm:block lg:hidden 2xl:block' : undefined}>
                <LiveCard video={s} />
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Creator Spotlight" kicker="Worth subscribing" href="/explore">
        <Rail label="Creator spotlight" itemClass="w-[262px]">
          {channels.map((c) => (
            <CreatorCard key={c.id} channel={c} coverVideoId={latestByChannel.get(c.id)} />
          ))}
        </Rail>
      </Section>

      {rest.length > 12 && (
        <Section title="More For You" kicker="Fresh from your channels">
          <div className={GRID}>
            {rest.slice(12).map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        </Section>
      )}
    </AppShell>
  );
}
