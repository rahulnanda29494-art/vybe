'use client';

import { useState } from 'react';
import { Check, Globe, ListPlus, Lock } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button, Pill } from '@/components/ui/primitives';
import { library, selectPlaylists, snapshot, useLibrary, type Snapshot } from '@/lib/library';
import type { Video } from '@/lib/types';
import { cx } from '@/lib/format';

const inputCls =
  'mt-2 h-12 w-full rounded-2xl border border-line bg-[var(--glass-thin)] px-4 text-[15px] font-medium text-ink outline-none transition-all placeholder:text-faint focus:border-transparent focus:shadow-glow';

function NewPlaylistFields({ onCreate }: { onCreate: (name: string, isPrivate: boolean) => void }) {
  const [name, setName] = useState('');
  const [priv, setPriv] = useState(false);
  const submit = () => name.trim() && (onCreate(name.trim(), priv), setName(''));

  return (
    <>
      <label className="block text-[12px] font-bold uppercase tracking-[0.12em] text-faint" htmlFor="pl-name">
        Name
      </label>
      <input
        id="pl-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder="Late night coding"
        maxLength={60}
        className={inputCls}
      />
      <p className="mt-5 text-[12px] font-bold uppercase tracking-[0.12em] text-faint">Visibility</p>
      <div className="mt-2 flex gap-2">
        <Pill active={!priv} onClick={() => setPriv(false)}>
          <Globe size={13} /> Public
        </Pill>
        <Pill active={priv} onClick={() => setPriv(true)}>
          <Lock size={13} /> Private
        </Pill>
      </div>
      <div className="mt-7 flex justify-end">
        <Button variant="primary" onClick={submit} disabled={!name.trim()}>
          Create
        </Button>
      </div>
    </>
  );
}

export function CreatePlaylistModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="New playlist">
      <NewPlaylistFields
        onCreate={(name, isPrivate) => {
          library.createPlaylist(name, isPrivate);
          onClose();
        }}
      />
    </Modal>
  );
}

/** Save a video into one or more playlists, or make a new one on the spot. */
export function AddToPlaylistModal({ video, open, onClose }: { video: Video | Snapshot; open: boolean; onClose: () => void }) {
  const lists = useLibrary(selectPlaylists);
  const [creating, setCreating] = useState(false);
  const snap = snapshot(video);

  return (
    <Modal open={open} onClose={onClose} title="Save to playlist">
      {creating || lists.length === 0 ? (
        <NewPlaylistFields
          onCreate={(name, isPrivate) => {
            const p = library.createPlaylist(name, isPrivate);
            library.toggleInPlaylist(p.id, snap);
            setCreating(false);
          }}
        />
      ) : (
        <>
          <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
            {lists.map((p) => {
              const inList = p.videos.some((v) => v.id === video.id);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => library.toggleInPlaylist(p.id, snap)}
                    aria-pressed={inList}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:bg-[var(--glass-thin)]"
                  >
                    <span
                      className={cx(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-lg transition-colors',
                        inList ? 'bg-vybe text-white' : 'ring-1 ring-inset ring-[var(--line-strong)]',
                      )}
                    >
                      {inList && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className="flex-1 truncate text-[14px] font-semibold text-ink">{p.name}</span>
                    {p.isPrivate ? <Lock size={14} className="text-faint" /> : <Globe size={14} className="text-faint" />}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex justify-between gap-2">
            <Button variant="ghost" icon={<ListPlus size={15} />} onClick={() => setCreating(true)}>
              New playlist
            </Button>
            <Button variant="primary" onClick={onClose}>
              Done
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
