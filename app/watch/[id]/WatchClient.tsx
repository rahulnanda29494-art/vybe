'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ExternalLink, Flame, RectangleHorizontal } from 'lucide-react';
import { YouTubePlayer } from '@/components/watch/YouTubePlayer';
import { WatchActions, SubscribeButton } from '@/components/watch/Actions';
import { Comments } from '@/components/watch/Comments';
import { VideoCard } from '@/components/media/VideoCard';
import { Thumb } from '@/components/media/Thumb';
import { TimeAgo } from '@/components/media/TimeAgo';
import { Avatar, Badge, Pill, Verified } from '@/components/ui/primitives';
import type { Video, YtComment } from '@/lib/types';
import { CATEGORY_LABEL, channelHref, watchUrl } from '@/lib/yt';
import { compact, cx, duration } from '@/lib/format';

const FILTERS = ['All', 'From this channel', 'Same topic'] as const;

/** Turns bare URLs in descriptions into links (rel=nofollow, new tab). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a
            key={i}
            href={p}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={(e) => e.stopPropagation()}
            className="break-all font-semibold text-electric hover:underline"
          >
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function WatchClient({
  video,
  related,
  comments,
  start,
}: {
  video: Video;
  related: Video[];
  comments: YtComment[] | null;
  start: number;
}) {
  const [theater, setTheater] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  const shown = related.filter((v) =>
    filter === 'From this channel'
      ? v.channelId === video.channelId
      : filter === 'Same topic'
        ? v.category === video.category
        : true,
  );

  return (
    <div className={cx('flex flex-col gap-7', !theater && 'xl:flex-row')}>
      <div className={cx('min-w-0 flex-1', !theater && 'xl:max-w-[calc(100%-400px)]')}>
        <YouTubePlayer video={video} start={start} />

        <div className="mt-5 flex items-start justify-between gap-4">
          <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-ink sm:text-[26px]">
            {video.title}
          </h1>
          <button
            type="button"
            onClick={() => setTheater((t) => !t)}
            aria-pressed={theater}
            aria-label="Theater mode"
            title="Theater mode (wider player)"
            className={cx(
              'hidden h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors xl:grid',
              theater ? 'bg-vybe text-white' : 'glass text-dim hover:text-ink',
            )}
          >
            <RectangleHorizontal size={18} />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-dim">
          <Badge tone="glass">{CATEGORY_LABEL[video.category]}</Badge>
          {video.views > 0 && <span className="tabular-nums">{compact(video.views)} views</span>}
          {video.publishedAt && (
            <>
              <span className="text-faint">•</span>
              <TimeAgo iso={video.publishedAt} />
            </>
          )}
        </div>

        {/* channel + actions */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={channelHref(video.channelId)} className="shrink-0">
              <span className="block rounded-full bg-vybe p-[2px]">
                <Avatar src={video.channelAvatar} name={video.channelTitle} size={46} className="ring-2 ring-bg" />
              </span>
            </Link>
            <div className="min-w-0">
              <Link
                href={channelHref(video.channelId)}
                className="flex items-center gap-1.5 font-display text-[15px] font-extrabold tracking-tight text-ink hover:text-brand-2"
              >
                <span className="truncate">{video.channelTitle}</span>
                {video.channelVerified && <Verified size={14} />}
              </Link>
              <p className="text-[12.5px] text-faint">YouTube channel</p>
            </div>
            <SubscribeButton channel={{ id: video.channelId, title: video.channelTitle, avatar: video.channelAvatar }} />
          </div>

          <WatchActions video={video} />
        </div>

        {/* description */}
        {(video.description || video.tags.length > 0) && (
          <div
            className="glass mt-5 cursor-pointer rounded-tile p-4 transition-colors duration-200 hover:border-[var(--line-strong)]"
            onClick={() => setExpanded((e) => !e)}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
          >
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
              <Flame size={14} className="text-brand-3" />
              {video.views > 0 && <span className="tabular-nums">{compact(video.views)} views</span>}
              {video.publishedAt && (
                <>
                  <span className="text-faint">·</span>
                  <TimeAgo iso={video.publishedAt} />
                </>
              )}
            </div>
            <p className={cx('mt-2 whitespace-pre-line break-words text-[14px] leading-relaxed text-dim', !expanded && 'line-clamp-3')}>
              <Linkified text={video.description} />
            </p>
            {video.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {video.tags.map((t) => (
                  <Link
                    key={t}
                    href={`/search?q=${encodeURIComponent(t)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded-pill bg-[var(--glass-thin)] px-2.5 py-1 text-[12px] font-semibold text-brand-2 transition-colors hover:bg-vybe-soft"
                  >
                    #{t}
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-faint">
                {expanded ? 'Show less' : 'Show more'}
                <ChevronDown size={14} className={cx('transition-transform', expanded && 'rotate-180')} />
              </span>
              <a
                href={watchUrl(video.id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-faint hover:text-ink"
              >
                Watch on YouTube <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}

        <Comments videoId={video.id} count={video.comments} initial={comments} />
      </div>

      {/* up next */}
      <aside className={cx('shrink-0', theater ? 'w-full' : 'xl:w-[376px]')} aria-label="Up next">
        <div className="no-bar mb-4 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Pill key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Pill>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="glass rounded-tile px-4 py-8 text-center text-[13px] text-dim">Nothing else here yet — try All.</p>
        ) : (
          <div className={cx('flex flex-col gap-4', theater && 'grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4')}>
            {shown.map((v) => (theater ? <VideoCard key={v.id} video={v} /> : <CompactRow key={v.id} video={v} />))}
          </div>
        )}
      </aside>
    </div>
  );
}

function CompactRow({ video }: { video: Video }) {
  return (
    <article className="group flex gap-3">
      <Link href={`/watch/${video.id}`} className="relative h-[92px] w-[164px] shrink-0 overflow-hidden rounded-xl">
        <Thumb id={video.id} className="h-full w-full transition-transform duration-500 ease-vybe group-hover:scale-110" />
        {video.durationSec ? (
          <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/72 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
            {duration(video.durationSec)}
          </span>
        ) : null}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/watch/${video.id}`}>
          <h3 className="line-clamp-2 text-[13.5px] font-bold leading-snug tracking-tight text-ink transition-colors group-hover:text-brand-2">
            {video.title}
          </h3>
        </Link>
        <span className="mt-1.5 flex items-center gap-1 text-[12px] text-dim">
          <span className="truncate">{video.channelTitle}</span>
          {video.channelVerified && <Verified size={11} />}
        </span>
        <p className="mt-0.5 text-[12px] text-faint">
          {compact(video.views)} views · <TimeAgo iso={video.publishedAt} />
        </p>
      </div>
    </article>
  );
}
