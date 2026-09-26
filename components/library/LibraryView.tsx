'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { VideoCard } from '@/components/media/VideoCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/PageHead';
import { Button } from '@/components/ui/primitives';
import { library, selectHistory, selectLater, selectLiked, useLibrary, type HistoryEntry, type Snapshot } from '@/lib/library';

type Kind = 'history' | 'later' | 'liked';

const ACTIONS: Record<Kind, { clear: () => void; remove: (id: string) => void; clearLabel: string }> = {
  history: { clear: library.clearHistory, remove: library.removeHistory, clearLabel: 'Clear history' },
  later: { clear: library.clearLater, remove: library.removeLater, clearLabel: 'Clear queue' },
  liked: { clear: library.clearLikes, remove: library.removeLike, clearLabel: 'Clear likes' },
};

const SELECT = { history: selectHistory, later: selectLater, liked: selectLiked };

const progressOf = (v: Snapshot | HistoryEntry) =>
  "position" in v && v.duration > 0 ? v.position / v.duration : undefined;

/** History / Watch Later / Liked — all backed by the viewer's library. */
export function LibraryView({
  kind,
  kicker,
  title,
  subtitle,
  empty,
}: {
  kind: Kind;
  kicker: string;
  title: string;
  subtitle: string;
  empty: { icon: ReactNode; title: string; body: string; action: string; href: string };
}) {
  const items: (Snapshot | HistoryEntry)[] = useLibrary(SELECT[kind]);
  const { clear, remove, clearLabel } = ACTIONS[kind];

  return (
    <>
      <PageHead
        kicker={items.length ? `${items.length} ${items.length === 1 ? 'video' : 'videos'}` : kicker}
        title={title}
        subtitle={subtitle}
        actions={
          items.length > 0 && (
            <Button variant="glass" size="sm" icon={<Trash2 size={14} />} onClick={clear}>
              {clearLabel}
            </Button>
          )
        }
      />

      <AnimatePresence mode="wait" initial={false}>
        {items.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            <EmptyState {...empty} />
          </motion.div>
        ) : (
          <motion.div key="list" exit={{ opacity: 0 }} className="flex flex-col gap-7">
            {items.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                layout="row"
                progress={progressOf(v)}
                onRemove={() => remove(v.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
