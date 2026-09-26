'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Play, Users, Eye } from 'lucide-react';
import { Thumb } from './Thumb';
import { TimeAgo } from './TimeAgo';
import { Avatar, Badge, LiveDot, Verified } from '@/components/ui/primitives';
import { library, snapshot, useLibrary, type HistoryEntry } from '@/lib/library';
import type { Channel, Video } from '@/lib/types';
import { CATEGORY_LABEL, channelHref } from '@/lib/yt';
import { compact, cx, duration } from '@/lib/format';

/* ----------------------------- Shorts ----------------------------- */

export function ShortCard({ video }: { video: Video }) {
  const liked = useLibrary(useCallback((s) => s.liked.some((v) => v.id === video.id), [video.id]));

  return (
    <article className="group relative w-full">
      <Link href={`/shorts?v=${video.id}`} className="relative block aspect-[9/16] overflow-hidden rounded-tile">
        <Thumb
          id={video.id}
          kind="short"
          className="h-full w-full transition-transform duration-[700ms] ease-vybe group-hover:scale-[1.08]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/30" />

        <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-pill bg-black/55 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-2" />
          Play
        </span>

        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-md">
          <Eye size={10} />
          {compact(video.views)}
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3.5 pr-12">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-snug text-white drop-shadow-md">{video.title}</h3>
          <span className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-white/85">
            <Avatar src={video.channelAvatar} name={video.channelTitle} size={20} />
            <span className="truncate">{video.channelTitle}</span>
          </span>
        </div>
      </Link>

      <button
        type="button"
        aria-label={liked ? 'Unlike' : 'Like'}
        aria-pressed={liked}
        onClick={() => library.toggleLike(snapshot(video))}
        className="absolute bottom-3.5 right-2.5 flex flex-col items-center gap-1 text-white active:scale-90"
      >
        <motion.span
          animate={liked ? { scale: [1, 1.35, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          className={cx('grid h-9 w-9 place-items-center rounded-full backdrop-blur-md', liked ? 'bg-vybe' : 'bg-white/15')}
        >
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
        </motion.span>
        {video.likes ? <span className="text-[10px] font-bold tabular-nums drop-shadow">{compact(video.likes)}</span> : null}
      </button>
    </article>
  );
}

/* ------------------------------ Live ------------------------------ */

export function LiveCard({ video }: { video: Video }) {
  return (
    <article className="group relative">
      <Link href={`/watch/${video.id}`} className="block">
        <div className="relative overflow-hidden rounded-card ring-1 ring-inset ring-[rgb(var(--c-live)/0.35)] transition-all duration-300 ease-vybe group-hover:ring-[rgb(var(--c-live)/0.7)]">
          <div className="relative aspect-video">
            <Thumb id={video.id} className="h-full w-full transition-transform duration-[600ms] ease-vybe group-hover:scale-[1.06]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25" />
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-live px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white shadow-[0_6px_16px_-6px_rgb(var(--c-live)/0.9)]">
              <LiveDot />
              Live
            </span>
            {video.liveViewers !== undefined && (
              <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-md">
                <Users size={12} />
                {compact(video.liveViewers)} watching
              </span>
            )}
            <span className="absolute bottom-3 left-3 rounded-pill bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-md">
              {CATEGORY_LABEL[video.category]}
            </span>
          </div>
        </div>
      </Link>

      <div className="mt-3.5 flex gap-3">
        <Link href={channelHref(video.channelId)} className="shrink-0">
          <span className="block rounded-full bg-live p-[2px]">
            <Avatar src={video.channelAvatar} name={video.channelTitle} size={34} className="ring-2 ring-bg" />
          </span>
        </Link>
        <div className="min-w-0">
          <Link href={`/watch/${video.id}`}>
            <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand-2">
              {video.title}
            </h3>
          </Link>
          <span className="mt-1 flex items-center gap-1 text-[13px] text-dim">
            <span className="truncate">{video.channelTitle}</span>
            {video.channelVerified && <Verified size={12} />}
          </span>
        </div>
      </div>
    </article>
  );
}

/* ---------------------------- Channel ---------------------------- */

export function CreatorCard({ channel, coverVideoId }: { channel: Channel; coverVideoId?: string }) {
  const following = useLibrary(useCallback((s) => s.subscriptions.some((c) => c.id === channel.id), [channel.id]));
  const href = channelHref(channel.handle ?? channel.id);

  return (
    <article className="glass group relative overflow-hidden rounded-tile transition-all duration-300 ease-vybe hover:-translate-y-1 hover:shadow-lift">
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        <div className="relative h-[92px] overflow-hidden bg-vybe-soft">
          {channel.banner ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={channel.banner} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-700 ease-vybe group-hover:scale-110" />
          ) : coverVideoId ? (
            <Thumb id={coverVideoId} className="h-full w-full scale-110 blur-[2px] transition-transform duration-700 ease-vybe group-hover:scale-125" />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
      </Link>

      <div className="px-4 pb-4">
        <Link href={href} className="relative -mt-8 block w-fit">
          <span className="block rounded-full bg-vybe p-[2.5px] transition-transform duration-300 ease-vybe group-hover:scale-105">
            <Avatar src={channel.avatar} name={channel.title} size={58} className="ring-[3px] ring-[rgb(var(--c-surface))]" />
          </span>
        </Link>

        <Link href={href} className="mt-3 flex items-center gap-1.5">
          <h3 className="truncate font-display text-[16px] font-extrabold tracking-tight text-ink">{channel.title}</h3>
          {channel.verified && <Verified size={14} />}
        </Link>

        <p className="mt-0.5 truncate text-[12px] text-faint">
          {channel.subscribers ? `${compact(channel.subscribers)} subscribers · ` : channel.handle ? `@${channel.handle} · ` : ''}
          {CATEGORY_LABEL[channel.category]}
        </p>

        <button
          type="button"
          onClick={() => library.toggleSubscription({ id: channel.id, title: channel.title, avatar: channel.avatar })}
          aria-pressed={following}
          className={cx(
            'mt-4 h-9 w-full rounded-pill text-[13px] font-bold transition-all duration-200 ease-vybe active:scale-[0.97]',
            following
              ? 'border border-line-strong text-dim hover:text-ink'
              : 'bg-vybe text-white shadow-[0_8px_20px_-10px_rgb(var(--c-brand-2)/0.9)]',
          )}
        >
          {following ? 'Subscribed' : 'Subscribe'}
        </button>
      </div>
    </article>
  );
}

/* ------------------------ Continue watching ----------------------- */

export function ContinueCard({ entry }: { entry: HistoryEntry }) {
  const pct = entry.duration ? Math.round((entry.position / entry.duration) * 100) : 0;
  const left = entry.duration ? Math.max(1, Math.round((entry.duration - entry.position) / 60)) : 0;

  return (
    <article className="group relative w-full">
      <Link
        href={`/watch/${entry.id}?t=${Math.floor(entry.position)}`}
        className="glass relative flex gap-3.5 overflow-hidden rounded-tile p-3 transition-all duration-300 ease-vybe hover:-translate-y-1 hover:shadow-lift"
      >
        <div className="relative h-[84px] w-[148px] shrink-0 overflow-hidden rounded-xl">
          <Thumb id={entry.id} className="h-full w-full transition-transform duration-500 ease-vybe group-hover:scale-110" />
          <span className="absolute inset-0 grid place-items-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-black">
              <Play size={15} fill="currentColor" className="ml-0.5" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 h-[3px] bg-white/25">
            <span className="block h-full bg-vybe" style={{ width: `${pct}%` }} />
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <h3 className="line-clamp-2 text-[13.5px] font-bold leading-snug tracking-tight text-ink">{entry.title}</h3>
          <div>
            <span className="flex items-center gap-1 text-[12px] text-dim">
              <span className="truncate">{entry.channelTitle}</span>
            </span>
            <span className="mt-1 flex items-center gap-2 text-[11px] font-bold text-brand-2">
              {pct}% watched
              {left > 0 && <span className="font-medium text-faint">· {left} min left</span>}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

/* ---------------------------- Trending ---------------------------- */

export function TrendingCard({ video, rank }: { video: Video; rank: number }) {
  const num = String(rank).padStart(2, '0');
  const numCls =
    'pointer-events-none absolute -bottom-3 left-0 select-none font-display text-[104px] font-extrabold leading-none tracking-[-0.07em] sm:-bottom-4 sm:text-[128px]';

  return (
    <article className="group relative">
      {/* thumbnail row — the rank sits behind it, its last digit tucked under the card */}
      <div className="relative pl-[104px] sm:pl-[128px]">
        <span aria-hidden className={numCls} style={{ color: 'rgb(var(--c-ink) / 0.04)', WebkitTextStroke: '2px rgb(var(--c-ink) / 0.3)' }}>
          {num}
        </span>
        <span
          aria-hidden
          className={`${numCls} text-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
          style={{ WebkitTextStroke: '2px rgb(var(--c-brand-2))' }}
        >
          {num}
        </span>

        <Link href={`/watch/${video.id}`} className="relative block">
          <div className="relative aspect-video overflow-hidden rounded-card shadow-lift">
            <Thumb id={video.id} className="h-full w-full transition-transform duration-[600ms] ease-vybe group-hover:scale-[1.07]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-80" />
            <Badge tone="gradient" className="absolute left-3 top-3">
              #{rank} Trending
            </Badge>
            {video.durationSec ? (
              <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-md">
                {duration(video.durationSec)}
              </span>
            ) : null}
          </div>
        </Link>
      </div>

      <div className="mt-4 pl-[104px] sm:pl-[128px]">
        <Link href={`/watch/${video.id}`}>
          <h3 className="line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand-2">
            {video.title}
          </h3>
        </Link>
        <Link href={channelHref(video.channelId)} className="mt-1.5 flex w-fit items-center gap-1.5 text-[12.5px] text-dim hover:text-ink">
          <Avatar src={video.channelAvatar} name={video.channelTitle} size={20} />
          <span className="truncate">{video.channelTitle}</span>
          {video.channelVerified && <Verified size={12} />}
        </Link>
        <p className="mt-0.5 text-[12.5px] text-faint">
          {compact(video.views)} views · <TimeAgo iso={video.publishedAt} />
        </p>
      </div>
    </article>
  );
}
