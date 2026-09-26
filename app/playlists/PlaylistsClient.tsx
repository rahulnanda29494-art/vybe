'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Globe, ListPlus, ListVideo, Lock, Play, Trash2 } from 'lucide-react';
import { Thumb } from '@/components/media/Thumb';
import { VideoCard } from '@/components/media/VideoCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHead } from '@/components/ui/PageHead';
import { Button } from '@/components/ui/primitives';
import { CreatePlaylistModal } from '@/components/library/PlaylistModals';
import { library, selectPlaylists, useLibrary } from '@/lib/library';

export function PlaylistsClient() {
  const lists = useLibrary(selectPlaylists);
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const current = lists.find((p) => p.id === viewing);

  if (current) {
    return (
      <>
        <button
          type="button"
          onClick={() => setViewing(null)}
          className="mb-5 inline-flex items-center gap-1.5 rounded-pill px-3 py-2 text-[13px] font-bold text-dim transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
        >
          <ArrowLeft size={15} /> All playlists
        </button>
        <PageHead
          kicker={`${current.videos.length} videos · ${current.isPrivate ? 'Private' : 'Public'}`}
          title={current.name}
          actions={
            <>
              {current.videos[0] && (
                <Button variant="primary" size="sm" icon={<Play size={14} fill="currentColor" />} href={`/watch/${current.videos[0].id}`}>
                  Play all
                </Button>
              )}
              <Button
                variant="glass"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => {
                  library.deletePlaylist(current.id);
                  setViewing(null);
                }}
              >
                Delete
              </Button>
            </>
          }
        />
        {current.videos.length ? (
          <div className="flex flex-col gap-7">
            {current.videos.map((v) => (
              <VideoCard key={v.id} video={v} layout="row" onRemove={() => library.toggleInPlaylist(current.id, v)} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ListVideo size={30} />}
            title="Nothing in here yet."
            body="Open any video and tap Save to playlist."
            action="Find something"
            href="/explore"
          />
        )}
      </>
    );
  }

  return (
    <>
      <PageHead
        kicker={lists.length ? `${lists.length} playlists` : 'Your library'}
        title="Playlists"
        subtitle="Collections by mood, topic or binge."
        actions={
          <Button variant="primary" size="sm" icon={<ListPlus size={15} />} onClick={() => setOpen(true)}>
            New playlist
          </Button>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={<ListVideo size={30} />}
          title="Create your first playlist."
          body="Group videos by mood, topic or binge. Keep them private or share them."
        >
          <Button variant="primary" icon={<ListPlus size={16} />} onClick={() => setOpen(true)}>
            Create playlist
          </Button>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {lists.map((p, i) => (
            <motion.button
              type="button"
              key={p.id}
              onClick={() => setViewing(p.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
              className="group text-left"
            >
              <div className="relative pt-3">
                <div className="absolute inset-x-6 top-0 h-6 rounded-t-card bg-[var(--line-strong)]" />
                <div className="absolute inset-x-3 top-1.5 h-6 rounded-t-card bg-[var(--line)]" />
                <div className="relative aspect-video overflow-hidden rounded-card bg-vybe-soft shadow-soft">
                  {p.videos[0] && (
                    <Thumb id={p.videos[0].id} className="h-full w-full transition-transform duration-500 ease-vybe group-hover:scale-105" />
                  )}
                  <div className="absolute inset-y-0 right-0 flex w-2/5 flex-col items-center justify-center gap-1 bg-black/60 text-white backdrop-blur-md">
                    <ListVideo size={20} />
                    <span className="text-[13px] font-extrabold">{p.videos.length}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/60">videos</span>
                  </div>
                </div>
              </div>
              <h3 className="mt-3.5 font-display text-[16px] font-extrabold tracking-tight text-ink transition-colors group-hover:text-brand-2">
                {p.name}
              </h3>
              <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-faint">
                {p.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                {p.isPrivate ? 'Private' : 'Public'}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      <CreatePlaylistModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
