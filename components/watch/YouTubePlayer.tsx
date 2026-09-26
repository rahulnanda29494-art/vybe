'use client';

import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { Thumb } from '@/components/media/Thumb';
import { library, snapshot } from '@/lib/library';
import type { Video } from '@/lib/types';
import { cx } from '@/lib/format';

/**
 * Official YouTube embed (IFrame Player API, privacy-enhanced domain).
 *
 * YouTube's API terms require its player UI to stay visible and unmodified,
 * so VYBE styles the frame around the player rather than drawing custom
 * controls over it. Playback position is saved to the viewer's library
 * every few seconds, which powers Continue Watching and History.
 */

interface YTPlayer {
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
}
interface YTNamespace {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void; onStateChange?: (e: { data: number }) => void };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

export function YouTubePlayer({
  video,
  start = 0,
  autoplay = true,
  vertical = false,
  className,
}: {
  video: Video;
  start?: number;
  autoplay?: boolean;
  /** 9:16 frame for Shorts. */
  vertical?: boolean;
  className?: string;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(autoplay);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!armed || !mount.current) return;
    let player: YTPlayer | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    const snap = snapshot(video);

    const save = () => {
      if (!player) return;
      const d = player.getDuration?.() ?? 0;
      const t = player.getCurrentTime?.() ?? 0;
      if (d > 0 && t > 1) library.recordProgress({ ...snap, durationSec: snap.durationSec ?? Math.round(d) }, t, d);
    };

    loadApi().then((YT) => {
      if (cancelled || !mount.current) return;
      const el = document.createElement('div');
      mount.current.replaceChildren(el);
      player = new YT.Player(el, {
        videoId: video.id,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          start: Math.floor(start),
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: (e) => {
            clearInterval(timer);
            if (e.data === YT.PlayerState.PLAYING) timer = setInterval(save, 5000);
            if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) save();
          },
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      save();
      player?.destroy();
    };
    // Re-mount only when the video itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, video.id]);

  return (
    <div
      className={cx(
        'relative w-full overflow-hidden bg-black shadow-lift',
        vertical ? 'aspect-[9/16] rounded-panel' : 'aspect-video rounded-tile',
        className,
      )}
    >
      {/* poster until the embed is ready (or until tapped when autoplay is off) */}
      {!ready && (
        <button
          type="button"
          onClick={() => setArmed(true)}
          aria-label={`Play ${video.title}`}
          className="group absolute inset-0 z-10"
        >
          <Thumb id={video.id} kind={vertical ? 'short' : 'hero'} priority className="absolute inset-0 h-full w-full" />
          <span className="absolute inset-0 bg-black/25" />
          <span
            className={cx(
              'absolute left-1/2 top-1/2 grid h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/95 text-black shadow-lift transition-transform duration-300 ease-vybe group-hover:scale-110',
              armed && 'animate-pulse',
            )}
          >
            <Play size={30} fill="currentColor" className="ml-1" />
          </span>
        </button>
      )}
      <div ref={mount} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
    </div>
  );
}
