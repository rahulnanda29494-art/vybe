import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { Thumb } from '@/components/media/Thumb';
import { VideoCard } from '@/components/media/VideoCard';
import { CreatorCard } from '@/components/media/cards';
import { EmptyState } from '@/components/ui/EmptyState';
import { Rail } from '@/components/ui/Rail';
import { Section } from '@/components/ui/Section';
import { getCategory, getSpotlightChannels } from '@/server/youtube';
import { CATEGORY_LABEL, isCategory } from '@/lib/yt';
import { compact } from '@/lib/format';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: isCategory(slug) ? CATEGORY_LABEL[slug] : 'Category' };
}

export function generateStaticParams() {
  return Object.keys(CATEGORY_LABEL).map((slug) => ({ slug }));
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isCategory(slug)) notFound();

  const [list, allChannels] = await Promise.all([getCategory(slug), getSpotlightChannels()]);
  const channels = allChannels.filter((c) => c.category === slug);
  const views = list.reduce((n, v) => n + v.views, 0);
  const cover = list[0];
  const latestByChannel = new Map(list.map((v) => [v.channelId, v.id] as const));

  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-panel bg-vybe-soft shadow-soft">
        <div className="relative h-[190px] sm:h-[230px]">
          {cover && <Thumb id={cover.id} kind="hero" priority className="absolute inset-0 h-full w-full scale-105 animate-drift" />}
          <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/50 to-black/10" />
          <div
            className="absolute inset-0 mix-blend-soft-light"
            style={{ background: 'linear-gradient(110deg, rgb(var(--c-brand-2)/.5), transparent 60%)' }}
          />
          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-9">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Category</p>
            <h1 className="mt-1.5 font-display text-[40px] font-extrabold leading-none tracking-tight text-white sm:text-[56px]">
              {CATEGORY_LABEL[slug]}
            </h1>
            {list.length > 0 && (
              <p className="mt-3 text-[13px] font-semibold text-white/75">
                {list.length} videos · {compact(views)} views
              </p>
            )}
          </div>
        </div>
      </section>

      <Section title={`Top in ${CATEGORY_LABEL[slug]}`} kicker="Right now" tight>
        {list.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {list.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Sparkles size={28} />}
            title="Fresh territory."
            body={`Nothing new in ${CATEGORY_LABEL[slug]} right now. Check back soon.`}
            action="Explore trending"
            href="/trending"
          />
        )}
      </Section>

      {channels.length > 0 && (
        <Section title="Channels" kicker="Worth subscribing">
          <Rail label="Category channels" itemClass="w-[262px]">
            {channels.map((c) => (
              <CreatorCard key={c.id} channel={c} coverVideoId={latestByChannel.get(c.id)} />
            ))}
          </Rail>
        </Section>
      )}
    </AppShell>
  );
}
