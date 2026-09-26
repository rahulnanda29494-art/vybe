import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { PageHead } from '@/components/ui/PageHead';
import { Section } from '@/components/ui/Section';
import { TrendingCard } from '@/components/media/cards';
import { VideoCard } from '@/components/media/VideoCard';
import { getTrending, sourceMode } from '@/server/youtube';

export const metadata: Metadata = { title: 'Trending' };
export const revalidate = 300;

export default async function TrendingPage() {
  const ranked = await getTrending(25);

  return (
    <AppShell>
      <PageHead
        kicker="Updated throughout the day"
        title="Trending Now"
        subtitle={
          sourceMode() === 'api'
            ? 'What’s climbing across YouTube right now.'
            : 'Ranked by views against how recently each video dropped.'
        }
      />

      <div className="grid grid-cols-1 gap-x-8 gap-y-12 md:grid-cols-2 2xl:grid-cols-3">
        {ranked.slice(0, 6).map((v, i) => (
          <TrendingCard key={v.id} video={v} rank={i + 1} />
        ))}
      </div>

      {ranked.length > 6 && (
        <Section title="Also Climbing" kicker={`7 – ${ranked.length}`}>
          <div className="flex flex-col gap-7">
            {ranked.slice(6).map((v) => (
              <VideoCard key={v.id} video={v} layout="row" />
            ))}
          </div>
        </Section>
      )}
    </AppShell>
  );
}
