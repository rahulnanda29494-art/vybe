'use client';

import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Bookmark, ListPlus, Share2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { compact, cx } from '@/lib/format';
import { library, snapshot, useLibrary } from '@/lib/library';
import type { Video } from '@/lib/types';
import { AddToPlaylistModal } from '@/components/library/PlaylistModals';

/** Count that rolls when it changes. */
function Counter({ value }: { value: number }) {
  return (
    <span className="relative inline-block tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {compact(value)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Small particle burst — fires once on like, then unmounts. */
function Burst() {
  return (
    <span className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
            animate={{
              x: Math.cos(angle) * 26,
              y: Math.sin(angle) * 26,
              scale: 0,
              opacity: 0,
            }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
            className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-vybe"
          />
        );
      })}
    </span>
  );
}

export function WatchActions({ video }: { video: Video }) {
  const likes = video.likes ?? 0;
  const liked = useLibrary(useCallback((s) => s.liked.some((v) => v.id === video.id), [video.id]));
  const saved = useLibrary(useCallback((s) => s.later.some((v) => v.id === video.id), [video.id]));
  const [disliked, setDisliked] = useState(false);
  const [burst, setBurst] = useState(0);
  const [copied, setCopied] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);

  const like = () => {
    if (!liked) setBurst((b) => b + 1);
    library.toggleLike(snapshot(video));
    setDisliked(false);
  };

  const share = async () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    try {
      await navigator.clipboard?.writeText(window.location.href);
    } catch {
      /* clipboard can be blocked — the confirmation still shows */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* like / dislike cluster */}
      <div className="glass flex h-11 items-center overflow-hidden rounded-pill">
        <button
          type="button"
          onClick={like}
          aria-pressed={liked}
          aria-label="Like"
          className={cx(
            'relative flex h-full items-center gap-2 px-4 text-[13.5px] font-bold transition-colors',
            liked ? 'text-brand-2' : 'text-ink hover:bg-[var(--glass-thin)]',
          )}
        >
          <motion.span animate={liked ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.32 }}>
            <ThumbsUp size={17} fill={liked ? 'currentColor' : 'none'} />
          </motion.span>
          {likes > 0 ? <Counter value={likes + (liked ? 1 : 0)} /> : <span>{liked ? 'Liked' : 'Like'}</span>}
          {burst > 0 && <Burst key={burst} />}
        </button>
        <span className="h-5 w-px bg-[var(--line)]" />
        <button
          type="button"
          onClick={() => {
            setDisliked((v) => !v);
            if (liked) library.toggleLike(snapshot(video));
          }}
          aria-pressed={disliked}
          aria-label="Dislike"
          className={cx(
            'flex h-full items-center px-4 transition-colors',
            disliked ? 'text-brand-2' : 'text-ink hover:bg-[var(--glass-thin)]',
          )}
        >
          <ThumbsDown size={17} fill={disliked ? 'currentColor' : 'none'} />
        </button>
      </div>

      <button
        type="button"
        onClick={share}
        className="glass inline-flex h-11 items-center gap-2 rounded-pill px-4 text-[13.5px] font-bold text-ink transition-all duration-200 ease-vybe hover:-translate-y-px active:scale-95"
      >
        <Share2 size={16} />
        {copied ? 'Link copied' : 'Share'}
      </button>

      <button
        type="button"
        onClick={() => library.toggleLater(snapshot(video))}
        aria-pressed={saved}
        className={cx(
          'inline-flex h-11 items-center gap-2 rounded-pill px-4 text-[13.5px] font-bold transition-all duration-200 ease-vybe hover:-translate-y-px active:scale-95',
          saved ? 'bg-vybe text-white' : 'glass text-ink',
        )}
      >
        <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
        {saved ? 'Saved' : 'Save'}
      </button>

      <button
        type="button"
        aria-label="Save to playlist"
        title="Save to playlist"
        onClick={() => setPlaylistOpen(true)}
        className="glass grid h-11 w-11 place-items-center rounded-full text-ink transition-all duration-200 ease-vybe hover:-translate-y-px active:scale-95"
      >
        <ListPlus size={18} />
      </button>
      <AddToPlaylistModal video={video} open={playlistOpen} onClose={() => setPlaylistOpen(false)} />
    </div>
  );
}

export function SubscribeButton({
  channel,
  compactMode = false,
}: {
  channel: { id: string; title: string; avatar?: string };
  compactMode?: boolean;
}) {
  const subbed = useLibrary(useCallback((s) => s.subscriptions.some((c) => c.id === channel.id), [channel.id]));
  const [bell, setBell] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => library.toggleSubscription(channel)}
        aria-pressed={subbed}
        className={cx(
          'inline-flex items-center justify-center rounded-pill font-bold tracking-tight transition-all duration-300 ease-vybe active:scale-95',
          compactMode ? 'h-9 px-4 text-[13px]' : 'h-11 px-6 text-sm',
          subbed
            ? 'border border-line-strong text-dim hover:text-ink'
            : 'bg-vybe text-white shadow-[0_8px_22px_-10px_rgb(var(--c-brand-2)/0.95)] hover:-translate-y-px',
        )}
      >
        {subbed ? 'Subscribed' : 'Subscribe'}
      </button>

      <AnimatePresence>
        {subbed && (
          <motion.button
            type="button"
            initial={{ width: 0, opacity: 0, scale: 0.6 }}
            animate={{ width: 'auto', opacity: 1, scale: 1 }}
            exit={{ width: 0, opacity: 0, scale: 0.6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            onClick={() => setBell((b) => !b)}
            aria-label="Notification settings"
            aria-pressed={bell}
            className={cx(
              'grid shrink-0 place-items-center overflow-hidden rounded-full transition-colors',
              compactMode ? 'h-9 w-9' : 'h-11 w-11',
              bell ? 'bg-vybe text-white' : 'glass text-ink',
            )}
          >
            <Bell size={16} fill={bell ? 'currentColor' : 'none'} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
