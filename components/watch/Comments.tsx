'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ExternalLink, Heart, MessageCircle, Send, SlidersHorizontal, Smile } from 'lucide-react';
import { TimeAgo } from '@/components/media/TimeAgo';
import { Avatar, Verified } from '@/components/ui/primitives';
import { useAuth } from '@/components/shell/auth';
import type { YtComment } from '@/lib/types';
import { watchUrl } from '@/lib/yt';
import { compact, cx } from '@/lib/format';

/**
 * Comments. `initial` holds the video's real YouTube comments when the Data
 * API is configured, or null when it isn't (RSS mode has no comment access).
 * Comments written here are VYBE-native and stay on this device for now.
 */
export function Comments({
  videoId,
  count,
  initial,
}: {
  videoId: string;
  count?: number;
  initial: YtComment[] | null;
}) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [draft, setDraft] = useState('');
  const [focused, setFocused] = useState(false);
  const [posted, setPosted] = useState<YtComment[]>([]);

  const list = useMemo(() => {
    const rest = [...(initial ?? [])].sort((a, b) =>
      sort === 'top' ? b.likes - a.likes : b.publishedAt.localeCompare(a.publishedAt),
    );
    return [...posted, ...rest];
  }, [sort, posted, initial]);

  const submit = () => {
    const body = draft.trim();
    if (!body || !user) return;
    setPosted((p) => [
      {
        id: `me-${Date.now()}`,
        author: user.name,
        body,
        likes: 0,
        publishedAt: new Date().toISOString(),
        replyCount: 0,
        replies: [],
      },
      ...p,
    ]);
    setDraft('');
    setFocused(false);
  };

  const total = (count ?? initial?.length ?? 0) + posted.length;

  return (
    <section className="mt-9" aria-label="Comments">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <h2 className="font-display text-xl font-extrabold text-ink">
          {total ? `${compact(total)} Comments` : 'Comments'}
        </h2>
        {list.length > 1 && (
          <div className="glass flex h-9 items-center gap-0.5 rounded-pill p-0.5">
            <SlidersHorizontal size={13} className="ml-2.5 mr-1 text-faint" />
            {(['top', 'new'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSort(s)}
                aria-pressed={sort === s}
                className={cx(
                  'relative h-8 rounded-pill px-3.5 text-[12.5px] font-bold transition-colors',
                  sort === s ? 'text-white' : 'text-dim hover:text-ink',
                )}
              >
                {sort === s && (
                  <motion.span
                    layoutId="sort-pill"
                    transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                    className="absolute inset-0 -z-10 rounded-pill bg-vybe"
                  />
                )}
                {s === 'top' ? 'Top' : 'Newest'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* composer — styled like a messaging input */}
      {user ? (
      <div className="mb-8 flex gap-3">
        <Avatar name={user.name} size={40} className="mt-1 shrink-0" />
        <div className={cx('glass flex-1 overflow-hidden rounded-tile transition-all duration-300 ease-vybe', focused && 'shadow-glow')}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => setFocused(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={focused ? 3 : 1}
            maxLength={2000}
            placeholder="Add to the conversation…"
            aria-label="Write a comment"
            className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-ink outline-none placeholder:text-faint"
          />
          <AnimatePresence>
            {focused && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center justify-between border-t border-line px-3 py-2.5"
              >
                <button
                  type="button"
                  aria-label="Add emoji"
                  onClick={() => setDraft((d) => `${d}🔥`)}
                  className="grid h-9 w-9 place-items-center rounded-full text-faint transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
                >
                  <Smile size={17} />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft('');
                      setFocused(false);
                    }}
                    className="h-9 rounded-pill px-4 text-[13px] font-bold text-dim transition-colors hover:text-ink"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!draft.trim()}
                    className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-vybe px-4 text-[13px] font-bold text-white transition-transform duration-200 ease-vybe active:scale-95 disabled:opacity-40"
                  >
                    <Send size={14} />
                    Comment
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      ) : (
        <Link
          href={`/signin?next=${encodeURIComponent(pathname)}`}
          className="glass mb-8 flex items-center gap-3 rounded-tile px-4 py-3.5 text-sm text-dim transition-colors hover:border-[var(--line-strong)] hover:text-ink"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-vybe-soft text-brand-2">
            <MessageCircle size={16} />
          </span>
          <span>
            <span className="font-bold text-ink">Sign in</span> to join the conversation
          </span>
        </Link>
      )}

      {list.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-tile px-6 py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-vybe-soft text-brand-2">
            <MessageCircle size={20} />
          </span>
          <p className="mt-4 font-display text-lg font-extrabold text-ink">Start the conversation.</p>
          <p className="mt-1 max-w-xs text-[13px] text-dim">Be the first on VYBE to share what you think.</p>
          <a
            href={watchUrl(videoId)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold text-brand-2 hover:underline"
          >
            Read the thread on YouTube <ExternalLink size={12} />
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {list.map((c) => (
            <CommentRow key={c.id} comment={c} />
          ))}
        </div>
      )}
    </section>
  );
}

function CommentRow({ comment, nested }: { comment: YtComment; nested?: boolean }) {
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(false);
  const replyCount = Math.max(comment.replyCount, comment.replies.length);

  return (
    <article className={cx('flex gap-3', nested && 'mt-5')}>
      <Avatar src={comment.authorAvatar} name={comment.author.replace(/^@/, '')} size={nested ? 30 : 38} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span
            className={cx(
              'text-[13px] font-bold tracking-tight',
              comment.isCreator ? 'rounded-pill bg-vybe px-2 py-0.5 text-white' : 'text-ink',
            )}
          >
            {comment.author}
          </span>
          {comment.isCreator && <Verified size={13} />}
          <span className="text-[12px] text-faint">
            <TimeAgo iso={comment.publishedAt} />
          </span>
        </div>

        <p className="mt-1.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-dim">{comment.body}</p>

        <div className="mt-2 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLiked((v) => !v)}
            aria-pressed={liked}
            aria-label="Like comment"
            className={cx(
              'inline-flex h-8 items-center gap-1.5 rounded-pill px-2.5 text-[12px] font-bold transition-colors',
              liked ? 'text-brand-2' : 'text-faint hover:bg-[var(--glass-thin)] hover:text-ink',
            )}
          >
            <motion.span animate={liked ? { scale: [1, 1.35, 1] } : {}} transition={{ duration: 0.3 }}>
              <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
            </motion.span>
            {comment.likes + (liked ? 1 : 0) > 0 && compact(comment.likes + (liked ? 1 : 0))}
          </button>
          {!nested && (
            <button
              type="button"
              className="h-8 rounded-pill px-2.5 text-[12px] font-bold text-faint transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
            >
              Reply
            </button>
          )}
        </div>

        {comment.replies.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              className="mt-2 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1.5 text-[12.5px] font-bold text-brand-2 transition-colors hover:bg-vybe-soft"
            >
              <ChevronDown size={15} className={cx('transition-transform duration-200 ease-vybe', open && 'rotate-180')} />
              {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-l border-line pl-4"
                >
                  {comment.replies.map((r) => (
                    <CommentRow key={r.id} comment={r} nested />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </article>
  );
}
