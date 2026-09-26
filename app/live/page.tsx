import type { Metadata } from 'next';
import Link from 'next/link';
import { Radio, Users } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { PageHead } from '@/components/ui/PageHead';
import { Section } from '@/components/ui/Section';
import { EmptyState } from '@/components/ui/EmptyState';
import { LiveCard } from '@/components/media/cards';
import { Thumb } from '@/components/media/Thumb';
import { Avatar, Badge, LiveDot, Verified } from '@/components/ui/primitives';
import { getLive, sourceMode } from '@/server/youtube';
import { CATEGORY_LABEL } from '@/lib/yt';
import { compact } from '@/lib/format';

export const metadata: Metadata = { title: 'Live' };
export const revalidate = 120;

export default async function LivePage() {
  const streams = await getLive(13);

  if (!streams.length) {
    return (
      <AppShell>
        <PageHead kicker="Live" title="Live Right Now" />
        <EmptyState
          icon={<Radio size={30} />}
          title="No one’s live right now."
          body={
            sourceMode() === 'api'
              ? 'Check back soon — streams show up here the moment they start.'
              : 'Live streams need the YouTube Data API. Add YOUTUBE_API_KEY to your environment to turn this on.'
          }
          action="Browse trending"
          href="/trending"
        />
      </AppShell>
    );
  }

  const [feature, ...rest] = streams;
  const total = streams.reduce((n, l) => n + (l.liveViewers ?? 0), 0);

  return (
    <AppShell>
      <PageHead
        kicker={total ? `${compact(total)} people watching right now` : 'Streaming now'}
        title="Live Right Now"
        subtitle="Jump into a room and catch it before it ends."
      />

      <Link href={`/watch/${feature.id}`} className="group relative block overflow-hidden rounded-panel shadow-lift">
        <div className="relative min-h-[380px] sm:aspect-[21/9] sm:min-h-0">
          <Thumb id={feature.id} kind="hero" priority className="absolute inset-0 h-full w-full transition-transform duration-[900ms] ease-vybe group-hover:scale-[1.04]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />

          <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-live px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white">
                <LiveDot />
                Live
              </span>
              <Badge tone="dark">{CATEGORY_LABEL[feature.category]}</Badge>
              {feature.liveViewers !== undefined && (
                <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/12 px-3 py-1.5 text-[11.5px] font-bold text-white backdrop-blur-md">
                  <Users size={12} />
                  {compact(feature.liveViewers)} watching
                </span>
              )}
            </div>
            <h2 className="mt-4 line-clamp-2 max-w-[680px] font-display text-[26px] font-extrabold leading-tight tracking-tight text-white sm:text-[38px]">
              {feature.title}
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-white/85">
                <Avatar src={feature.channelAvatar} name={feature.channelTitle} size={30} />
                {feature.channelTitle}
                {feature.channelVerified && <Verified size={13} className="text-white" />}
              </span>
              <span className="inline-flex h-11 items-center gap-2 rounded-pill bg-white px-5 text-sm font-extrabold text-black transition-transform duration-200 ease-vybe group-hover:scale-105">
                <Radio size={16} />
                Join stream
              </span>
            </div>
          </div>
        </div>
      </Link>

      {rest.length > 0 && (
        <Section title="More Live Channels" kicker="Happening now" tight>
          <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {rest.map((s) => (
              <LiveCard key={s.id} video={s} />
            ))}
          </div>
        </Section>
      )}
    </AppShell>
  );
}
