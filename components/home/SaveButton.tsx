'use client';

import { useCallback } from 'react';
import { Check, ListPlus } from 'lucide-react';
import { library, snapshot, useLibrary } from '@/lib/library';
import type { Video } from '@/lib/types';

/** Hero "Add to Watch Later" — glass pill on dark key art. */
export function SaveButton({ video }: { video: Video }) {
  const saved = useLibrary(useCallback((s) => s.later.some((v) => v.id === video.id), [video.id]));
  return (
    <button
      type="button"
      onClick={() => library.toggleLater(snapshot(video))}
      aria-pressed={saved}
      className="inline-flex h-[52px] items-center gap-2.5 rounded-pill border border-white/25 bg-white/10 px-6 text-[15px] font-bold text-white backdrop-blur-xl transition-all duration-200 ease-vybe hover:-translate-y-0.5 hover:bg-white/20 active:scale-95"
    >
      {saved ? <Check size={18} strokeWidth={3} /> : <ListPlus size={18} />}
      {saved ? 'Saved' : 'Watch later'}
    </button>
  );
}
