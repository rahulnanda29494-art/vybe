'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, ExternalLink, Heart, Share2 } from 'lucide-react';
import { Thumb } from '@/components/media/Thumb';
import { YouTubePlayer } from '@/components/watch/YouTubePlayer';
import { Avatar, Verified } from '@/components/ui/primitives';
import { library, snapshot, useLibrary } from '@/lib/library';
import type { Video } from '@/lib/types';
import { channelHref, watchUrl } from '@/lib/yt';
import { compact, cx } from '@/lib/format';

/**
 * Vertical, snap-scrolling Shorts feed. Only the slide in view mounts a
 * YouTube player — the rest are posters — so swiping stays smooth.
 */
export function ShortsClient({ shorts, initialId }: { shorts: Video[]; initialId?: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(() => Math.max(0, shorts.findIndex((s) => s.id === initialId)));

  // Jump to a deep-linked short on first paint.
  useEffect(() => {
    const el = scroller.current;
    if (el && index > 0) el.scrollTo({ top: index * el.clientHeight });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jump = useCallback(
    (dir: -1 | 1) => {
      const el = scroller.current;
      if (!el) return;
      const next = Math.min(shorts.length - 1, Math.max(0, index + dir));
      el.scrollTo({ top: next * el.clientHeight, behavior: 'smooth' });
    },
    [index, shorts.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowDown') (e.preventDefault(), jump(1));
      if (e.key === 'ArrowUp') (e.preventDefault(), jump(-1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollTop / el.clientHeight);
          if (i !== index) setIndex(i);
        }}
        className="no-bar snap-y snap-mandatory overflow-y-auto overscroll-contain"
        style={{ height: 'calc(100dvh - var(--header-h) - 40px)' }}
        aria-label="Shorts feed — swipe or use arrow keys"
      >
        {shorts.map((s, i) => (
          <ShortSlide key={s.id} short={s} active={i === index} total={shorts.length} position={i} />
        ))}
      </div>

      <div className="absolute -right-16 top-1/2 hidden -translate-y-1/2 flex-col gap-2 lg:flex">
        <button
          type="button"
          onClick={() => jump(-1)}
          disabled={index === 0}
          aria-label="Previous short"
          className="glass grid h-11 w-11 place-items-center rounded-full text-ink transition-transform hover:scale-105 active:scale-90 disabled:opacity-30"
        >
          <ChevronUp size={19} />
        </button>
        <button
          type="button"
          onClick={() => jump(1)}
          disabled={index === shorts.length - 1}
          aria-label="Next short"
          className="glass grid h-11 w-11 place-items-center rounded-full text-ink transition-transform hover:scale-105 active:scale-90 disabled:opacity-30"
        >
          <ChevronDown size={19} />
        </button>
      </div>
    </div>
  );
}

function ShortSlide({ short, active, total, position }: { short: Video; active: boolean; total: number; position: number }) {
  const liked = useLibrary(useCallback((s) => s.liked.some((v) => v.id === short.id), [short.id]));
  const [copied, setCopied] = useState(false);

  const round = "grid h-11 w-11 place-items-center rounded-full glass text-ink transition-transform active:scale-90";

  return (
    <section className="flex h-full snap-start snap-always flex-col items-center justify-center gap-3 py-1.5" aria-label={short.title}>
      {/* frame — nothing is drawn over the live YouTube player */}
      <div className="relative aspect-[9/16] min-h-0 max-w-full flex-1 overflow-hidden rounded-panel bg-black shadow-lift">
        {active ? (
          <YouTubePlayer video={short} vertical className="!aspect-auto h-full w-full" />
        ) : (
          <>
            <Thumb id={short.id} kind="short" className="absolute inset-0 h-full w-full" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        )}
      </div>

      {/* meta + actions row beneath the frame */}
      <div className="flex w-full max-w-[420px] shrink-0 items-center gap-3 px-1">
        <Link href={channelHref(short.channelId)} className="shrink-0" aria-label={short.channelTitle}>
          <Avatar src={short.channelAvatar} name={short.channelTitle} size={38} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-[13.5px] font-bold text-ink">{short.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-dim">
            <span className="truncate">{short.channelTitle}</span>
            {short.channelVerified && <Verified size={11} />}
            <span className="shrink-0 text-faint">· {compact(short.views)} views · {position + 1}/{total}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => library.toggleLike(snapshot(short))}
          aria-pressed={liked}
          aria-label={liked ? "Unlike" : "Like"}
          className={cx(round, liked && "!bg-vybe !text-white")}
        >
          <motion.span animate={liked ? { scale: [1, 1.4, 1] } : {}} transition={{ duration: 0.35 }} className="grid">
            <Heart size={19} fill={liked ? "currentColor" : "none"} />
          </motion.span>
        </button>
        <button
          type="button"
          aria-label={copied ? "Link copied" : "Share"}
          title={copied ? "Link copied" : "Share"}
          onClick={async () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
            try {
              await navigator.clipboard?.writeText(`${window.location.origin}/shorts?v=${short.id}`);
            } catch {
              /* clipboard blocked */
            }
          }}
          className={cx(round, copied && "!text-brand-2")}
        >
          <Share2 size={18} />
        </button>
        <a href={watchUrl(short.id)} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube" className={cx(round, "hidden sm:grid")}>
          <ExternalLink size={17} />
        </a>
      </div>
    </section>
  );
}
