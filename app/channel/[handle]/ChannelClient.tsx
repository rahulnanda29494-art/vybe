'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Info, Sparkles } from 'lucide-react';
import { Thumb } from '@/components/media/Thumb';
import { VideoCard } from '@/components/media/VideoCard';
import { ShortCard } from '@/components/media/cards';
import { SubscribeButton } from '@/components/watch/Actions';
import { Avatar, Badge, Verified } from '@/components/ui/primitives';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Channel, Video } from '@/lib/types';
import { CATEGORY_LABEL, channelUrl } from '@/lib/yt';
import { compact, cx } from '@/lib/format';

const TABS = ['Home', 'Videos', 'Shorts', 'About'] as const;

export function ChannelClient({ channel, videos }: { channel: Channel; videos: Video[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Home');
  const longform = videos.filter((v) => !v.isShort);
  const shorts = videos.filter((v) => v.isShort);
  const featured = [...longform].sort((a, b) => b.views - a.views)[0];
  const totalRecentViews = videos.reduce((n, v) => n + v.views, 0);

  return (
    <>
      {/* cover — the channel banner, or its most-watched recent video */}
      <div className="relative overflow-hidden rounded-panel bg-vybe-soft">
        <div className="relative h-[168px] sm:h-[220px] lg:h-[260px]">
          {channel.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.banner} alt="" referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" />
          ) : featured ? (
            <Thumb id={featured.id} kind="hero" priority className="absolute inset-0 h-full w-full scale-110 animate-drift blur-[1px]" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/10 to-transparent" />
          <div
            className="absolute inset-0 opacity-70 mix-blend-overlay"
            style={{
              background:
                'linear-gradient(103deg, rgb(var(--c-brand-1) / .55), rgb(var(--c-brand-2) / .35) 50%, rgb(var(--c-brand-3) / .3))',
            }}
          />
        </div>
      </div>

      {/* identity */}
      <div className="relative px-1 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <span className="-mt-14 block w-fit shrink-0 rounded-full bg-vybe p-[3px] shadow-lift sm:-mt-16">
            <Avatar src={channel.avatar} name={channel.title} size={104} className="ring-4 ring-[rgb(var(--c-bg))]" />
          </span>

          <div className="min-w-0 flex-1 sm:pt-5">
            <h1 className="flex flex-wrap items-center gap-2 font-display text-[28px] font-extrabold leading-none tracking-tight text-ink sm:text-[34px]">
              {channel.title}
              {channel.verified && <Verified size={20} />}
            </h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-dim">
              {channel.handle && <span className="font-semibold">@{channel.handle}</span>}
              {channel.subscribers ? (
                <>
                  <span className="text-faint">•</span>
                  <span className="font-bold text-ink">{compact(channel.subscribers)} subscribers</span>
                </>
              ) : null}
              <span className="text-faint">•</span>
              <span>{channel.videoCount ? `${compact(channel.videoCount)} videos` : `${videos.length} recent videos`}</span>
              <Badge tone="glass">{CATEGORY_LABEL[channel.category]}</Badge>
            </div>
            {channel.description && (
              <p className="mt-3 line-clamp-2 max-w-2xl text-[13.5px] leading-relaxed text-dim">{channel.description}</p>
            )}
            <a
              href={channelUrl(channel.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-2 transition-opacity hover:opacity-75"
            >
              <ExternalLink size={13} />
              View on YouTube
            </a>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:pt-5">
            <SubscribeButton channel={{ id: channel.id, title: channel.title, avatar: channel.avatar }} />
          </div>
        </div>
      </div>

      {/* tabs */}
      <div className="sticky z-30 mt-7 border-b border-line bg-[var(--glass)] backdrop-blur-xl" style={{ top: 'var(--header-h)' }}>
        <div className="no-bar flex gap-1 overflow-x-auto" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cx(
                'relative shrink-0 px-4 py-3.5 text-[13.5px] font-bold tracking-tight transition-colors',
                tab === t ? 'text-ink' : 'text-faint hover:text-dim',
              )}
            >
              {t}
              {tab === t && (
                <motion.span
                  layoutId="channel-tab"
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-vybe"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {tab === 'Home' && (
          <>
            {featured && (
              <section className="mb-10">
                <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-extrabold text-ink">
                  <Sparkles size={17} className="text-brand-2" />
                  Most watched lately
                </h2>
                <VideoCard video={featured} layout="row" priorityTitle />
              </section>
            )}
            {shorts.length > 0 && (
              <section className="mb-10">
                <h2 className="mb-4 font-display text-xl font-extrabold text-ink">Shorts</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
                  {shorts.slice(0, 6).map((s) => (
                    <ShortCard key={s.id} video={s} />
                  ))}
                </div>
              </section>
            )}
            <h2 className="mb-5 font-display text-xl font-extrabold text-ink">Latest uploads</h2>
            <Grid videos={longform} />
          </>
        )}

        {tab === 'Videos' && <Grid videos={longform} />}

        {tab === 'Shorts' &&
          (shorts.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
              {shorts.map((s) => (
                <ShortCard key={s.id} video={s} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Sparkles size={28} />} title="No shorts lately." body={`${channel.title} hasn’t posted a short recently.`} />
          ))}

        {tab === 'About' && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <div className="glass rounded-tile p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
                <Info size={17} className="text-brand-2" /> About
              </h2>
              <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-dim">
                {channel.description || `${channel.title} publishes on YouTube. Their latest uploads stream here on VYBE.`}
              </p>
            </div>
            <dl className="glass grid grid-cols-2 gap-4 rounded-tile p-6">
              {channel.subscribers ? <Stat label="Subscribers" value={compact(channel.subscribers)} /> : null}
              {channel.totalViews ? <Stat label="Total views" value={compact(channel.totalViews)} /> : null}
              <Stat label="Recent views" value={compact(totalRecentViews)} />
              <Stat label="Recent uploads" value={String(videos.length)} />
            </dl>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Grid({ videos }: { videos: Video[] }) {
  if (!videos.length) {
    return <EmptyState icon={<Sparkles size={28} />} title="Nothing here yet." body="This channel hasn’t published recently." />;
  }
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {videos.map((v) => (
        <VideoCard key={v.id} video={v} />
      ))}
    </div>
  );
}
