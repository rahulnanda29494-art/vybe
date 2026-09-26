'use client';

import Link from 'next/link';
import { Clapperboard } from 'lucide-react';
import { VideoCard } from '@/components/media/VideoCard';
import { CreatorCard } from '@/components/media/cards';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/PageHead';
import { Rail } from '@/components/ui/Rail';
import { Section } from '@/components/ui/Section';
import { Avatar } from '@/components/ui/primitives';
import { selectSubs, useLibrary } from '@/lib/library';
import type { Channel, Video } from '@/lib/types';
import { channelHref } from '@/lib/yt';

/** Subscriptions live in the viewer's library; their uploads come from the YouTube feed. */
export function SubscriptionsClient({ feed, suggestions }: { feed: Video[]; suggestions: Channel[] }) {
  const subs = useLibrary(selectSubs);
  const ids = new Set(subs.map((s) => s.id));
  const uploads = feed.filter((v) => ids.has(v.channelId)).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const latestByChannel = new Map(feed.map((v) => [v.channelId, v.id] as const));

  if (!subs.length) {
    return (
      <>
        <PageHead kicker="Your VYBE" title="Subscriptions" />
        <EmptyState
          icon={<Clapperboard size={30} />}
          title="Your VYBE starts here."
          body="Subscribe to channels you love and their new uploads land here first."
        />
        <Section title="Start with these" kicker="Popular channels">
          <Rail label="Suggested channels" itemClass="w-[262px]">
            {suggestions.map((c) => (
              <CreatorCard key={c.id} channel={c} coverVideoId={latestByChannel.get(c.id)} />
            ))}
          </Rail>
        </Section>
      </>
    );
  }

  return (
    <>
      <PageHead
        kicker={`${subs.length} ${subs.length === 1 ? 'channel' : 'channels'}`}
        title="Subscriptions"
        subtitle="Everything new from the channels you follow."
      />

      <Rail label="Your channels" itemClass="w-[92px]">
        {subs.map((c) => (
          <Link key={c.id} href={channelHref(c.id)} className="group flex flex-col items-center gap-2 text-center">
            <span className="block rounded-full bg-vybe p-[2.5px] transition-transform duration-300 ease-vybe group-hover:scale-105">
              <Avatar src={c.avatar} name={c.title} size={64} className="ring-[3px] ring-bg" />
            </span>
            <span className="w-full truncate text-[11.5px] font-semibold text-dim">{c.title}</span>
          </Link>
        ))}
      </Rail>

      <Section title="New From Your Channels" kicker="Latest uploads" tight>
        {uploads.length ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {uploads.map((v) => (
              <VideoCard key={v.id} video={v} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Clapperboard size={30} />}
            title="All caught up."
            body="Nothing new from your channels right now. Open a channel to see its full catalogue."
          />
        )}
      </Section>
    </>
  );
}
