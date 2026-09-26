'use client';

import { useCallback, useSyncExternalStore } from 'react';
import type { Video } from './types';

/**
 * The viewer's personal library — watch history (with resume position),
 * likes, watch later, subscriptions and playlists.
 *
 * Stored on-device so it works signed-out; the PostgreSQL schema mirrors
 * these tables for syncing once a session exists. Videos are stored as
 * snapshots so the library renders without re-fetching YouTube.
 */

export type Snapshot = Pick<
  Video,
  'id' | 'title' | 'channelId' | 'channelTitle' | 'channelAvatar' | 'channelVerified' | 'views' | 'publishedAt' | 'durationSec' | 'category' | 'isShort'
>;

export interface HistoryEntry extends Snapshot {
  position: number;
  duration: number;
  watchedAt: number;
}

export interface Playlist {
  id: string;
  name: string;
  isPrivate: boolean;
  videos: Snapshot[];
  createdAt: number;
}

interface LibraryState {
  history: HistoryEntry[];
  liked: Snapshot[];
  later: Snapshot[];
  subscriptions: { id: string; title: string; avatar?: string }[];
  playlists: Playlist[];
}

const KEY = 'vybe-library-v1';
const EMPTY: LibraryState = { history: [], liked: [], later: [], subscriptions: [], playlists: [] };

let state: LibraryState = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = { ...EMPTY, ...JSON.parse(raw) };
  } catch {
    /* blocked or corrupt storage — start empty */
  }
}

function commit(next: LibraryState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full or blocked — keep in memory for this session */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    loaded = false;
    load();
    listeners.forEach((fn) => fn());
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', onStorage);
  };
}

export function snapshot(v: Video | Snapshot): Snapshot {
  return {
    id: v.id,
    title: v.title,
    channelId: v.channelId,
    channelTitle: v.channelTitle,
    channelAvatar: v.channelAvatar,
    channelVerified: v.channelVerified,
    views: v.views,
    publishedAt: v.publishedAt,
    durationSec: v.durationSec,
    category: v.category,
    isShort: v.isShort,
  };
}

/** Server snapshot is always empty, so SSR and first client render match. */
export function useLibrary<T>(select: (s: LibraryState) => T): T {
  const get = useCallback(() => {
    load();
    return select(state);
  }, [select]);
  return useSyncExternalStore(subscribe, get, () => select(EMPTY));
}

const toggleIn = (list: Snapshot[], v: Snapshot) =>
  list.some((x) => x.id === v.id) ? list.filter((x) => x.id !== v.id) : [v, ...list];

/** Always read through cur() so a mutation can never run against an unloaded store. */
const cur = () => (load(), state);

export const library = {
  recordProgress(v: Snapshot, position: number, duration: number) {
    const entry: HistoryEntry = { ...v, position, duration, watchedAt: Date.now() };
    commit({ ...cur(), history: [entry, ...cur().history.filter((h) => h.id !== v.id)].slice(0, 200) });
  },
  clearHistory: () => commit({ ...cur(), history: [] }),
  removeHistory: (id: string) => commit({ ...cur(), history: cur().history.filter((h) => h.id !== id) }),

  toggleLike: (v: Snapshot) => commit({ ...cur(), liked: toggleIn(cur().liked, v) }),
  removeLike: (id: string) => commit({ ...cur(), liked: cur().liked.filter((v) => v.id !== id) }),
  clearLikes: () => commit({ ...cur(), liked: [] }),

  toggleLater: (v: Snapshot) => commit({ ...cur(), later: toggleIn(cur().later, v) }),
  removeLater: (id: string) => commit({ ...cur(), later: cur().later.filter((v) => v.id !== id) }),
  clearLater: () => commit({ ...cur(), later: [] }),

  toggleSubscription(c: { id: string; title: string; avatar?: string }) {
    const has = cur().subscriptions.some((s) => s.id === c.id);
    commit({
      ...cur(),
      subscriptions: has ? cur().subscriptions.filter((s) => s.id !== c.id) : [c, ...cur().subscriptions],
    });
  },

  createPlaylist(name: string, isPrivate: boolean) {
    const p: Playlist = { id: `pl_${Date.now().toString(36)}`, name, isPrivate, videos: [], createdAt: Date.now() };
    commit({ ...cur(), playlists: [p, ...cur().playlists] });
    return p;
  },
  deletePlaylist: (id: string) => commit({ ...cur(), playlists: cur().playlists.filter((p) => p.id !== id) }),
  toggleInPlaylist(playlistId: string, v: Snapshot) {
    commit({
      ...cur(),
      playlists: cur().playlists.map((p) => (p.id === playlistId ? { ...p, videos: toggleIn(p.videos, v) } : p)),
    });
  },
};

/* Stable selectors (module-level so useSyncExternalStore doesn't resubscribe). */
export const selectHistory = (s: LibraryState) => s.history;
export const selectLiked = (s: LibraryState) => s.liked;
export const selectLater = (s: LibraryState) => s.later;
export const selectSubs = (s: LibraryState) => s.subscriptions;
export const selectPlaylists = (s: LibraryState) => s.playlists;
