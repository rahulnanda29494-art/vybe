'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { Bookmark, Check, ExternalLink, Play } from 'lucide-react';
import { Thumb } from './Thumb';
import { TimeAgo } from './TimeAgo';
import { Avatar, Verified } from '@/components/ui/primitives';
import { library, snapshot, useLibrary, type Snapshot } from '@/lib/library';
import type { Video } from '@/lib/types';
import { channelHref, watchUrl } from '@/lib/yt';
import { compact, cx, duration } from '@/lib/format';

type CardVideo = Video | Snapshot;

export function VideoCard({
  video,
  layout = 'grid',
  priorityTitle,
  progress,
  onRemove,
}: {
  video: CardVideo;
  layout?: 'grid' | 'row';
  /** Larger title — search results and featured rows. */
  priorityTitle?: boolean;
  /** 0–1 resume position (history). */
  progress?: number;
  onRemove?: () => void;
}) {
  const saved = useLibrary(useCallback((s) => s.later.some((v) => v.id === video.id), [video.id]));
  const description = 'description' in video ? video.description : '';

  const thumb = (
    <Link
      href={`/watch/${video.id}`}
      className="group/thumb relative block overflow-hidden rounded-card"
      tabIndex={-1}
      aria-hidden
    >
      <div className="relative aspect-video overflow-hidden rounded-card">
        <Thumb
          id={video.id}
          className="h-full w-full transition-transform duration-[600ms] ease-vybe group-hover:scale-[1.07]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {video.durationSec ? (
          <span className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/72 px-1.5 py-0.5 text-[11px] font-bold tabular-nums text-white backdrop-blur-md transition-opacity duration-200 group-hover:opacity-0">
            {duration(video.durationSec)}
          </span>
        ) : null}

        <span className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-2 items-center gap-2 p-3 opacity-0 transition-all duration-300 ease-vybe group-hover:translate-y-0 group-hover:opacity-100">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white/95 text-black shadow-lift">
            <Play size={15} fill="currentColor" className="ml-0.5" />
          </span>
          <span className="text-[12px] font-bold tracking-tight text-white drop-shadow">Watch now</span>
        </span>

        {progress !== undefined && progress > 0 && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
            <span className="block h-full bg-vybe" style={{ width: `${Math.min(100, Math.round(progress * 100))}%` }} />
          </span>
        )}
      </div>
      <span className="pointer-events-none absolute -inset-2 -z-10 rounded-[28px] bg-vybe opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-25" />
    </Link>
  );

  const quickActions = (
    <div className="absolute right-2.5 top-2.5 z-10 flex -translate-y-1.5 gap-1.5 opacity-0 transition-all duration-300 ease-vybe focus-within:translate-y-0 focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100">
      <button
        type="button"
        aria-label={saved ? 'Remove from Watch Later' : 'Save to Watch Later'}
        aria-pressed={saved}
        onClick={() => library.toggleLater(snapshot(video))}
        className={cx(
          'grid h-8 w-8 place-items-center rounded-xl backdrop-blur-md transition-all duration-200 ease-vybe active:scale-90',
          saved ? 'bg-vybe text-white' : 'bg-black/55 text-white hover:bg-black/75',
        )}
      >
        {saved ? <Check size={15} strokeWidth={3} /> : <Bookmark size={15} />}
      </button>
      <a
        href={watchUrl(video.id)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open on YouTube"
        className="grid h-8 w-8 place-items-center rounded-xl bg-black/55 text-white backdrop-blur-md transition-all duration-200 ease-vybe hover:bg-black/75 active:scale-90"
      >
        <ExternalLink size={14} />
      </a>
    </div>
  );

  const meta = (
    <>
      {compact(video.views)} views
      {video.publishedAt && (
        <>
          {' · '}
          <TimeAgo iso={video.publishedAt} />
        </>
      )}
    </>
  );

  if (layout === 'row') {
    return (
      <article className="group relative flex gap-4">
        <div className="relative w-[168px] shrink-0 sm:w-[264px] lg:w-[340px]">
          {thumb}
          {quickActions}
        </div>
        <div className="flex min-w-0 flex-1 flex-col pt-0.5">
          <Link href={`/watch/${video.id}`} className="min-w-0">
            <h3
              className={cx(
                'line-clamp-2 font-display font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand-2',
                priorityTitle ? 'text-lg sm:text-[21px]' : 'text-[15px] sm:text-lg',
              )}
            >
              {video.title}
            </h3>
          </Link>
          <p className="mt-1.5 text-[13px] text-dim">{meta}</p>
          <Link
            href={channelHref(video.channelId)}
            className="mt-3 flex w-fit items-center gap-2 text-[13px] text-dim transition-colors hover:text-ink"
          >
            <Avatar src={video.channelAvatar} name={video.channelTitle} size={26} />
            <span className="truncate font-medium">{video.channelTitle}</span>
            {video.channelVerified && <Verified size={13} />}
          </Link>
          {description && (
            <p className="mt-2.5 hidden text-[13px] leading-relaxed text-faint sm:line-clamp-2">{description}</p>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="mt-3 w-fit rounded-pill px-2.5 py-1 text-[12px] font-bold text-faint transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
            >
              Remove
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="group relative flex flex-col">
      <div className="relative">
        {thumb}
        {quickActions}
      </div>

      <div className="mt-3.5 flex gap-3">
        <Link href={channelHref(video.channelId)} className="mt-0.5 shrink-0" aria-label={video.channelTitle}>
          <Avatar src={video.channelAvatar} name={video.channelTitle} size={36} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/watch/${video.id}`}>
            <h3 className="line-clamp-2 text-[15px] font-bold leading-[1.35] tracking-tight text-ink transition-colors group-hover:text-brand-2">
              {video.title}
            </h3>
          </Link>
          <Link
            href={channelHref(video.channelId)}
            className="mt-1.5 flex items-center gap-1 text-[13px] font-medium text-dim transition-colors hover:text-ink"
          >
            <span className="truncate">{video.channelTitle}</span>
            {video.channelVerified && <Verified size={13} />}
          </Link>
          <p className="mt-0.5 text-[13px] text-faint">{meta}</p>
        </div>
      </div>
    </article>
  );
}
