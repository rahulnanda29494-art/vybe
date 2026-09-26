import Link from 'next/link';
import { ExternalLink, Flame, Play } from 'lucide-react';
import { Thumb } from '@/components/media/Thumb';
import { TimeAgo } from '@/components/media/TimeAgo';
import { SaveButton } from '@/components/home/SaveButton';
import { Avatar, Verified } from '@/components/ui/primitives';
import type { Video } from '@/lib/types';
import { channelHref, watchUrl } from '@/lib/yt';
import { compact } from '@/lib/format';

/**
 * Entrance motion uses CSS keyframes (not JS) so the hero is fully visible
 * in the server HTML — the first screen never waits on hydration.
 */
const rise = (ms: number) => ({ animationDelay: `${ms}ms` });

export function Hero({ video }: { video: Video }) {
  return (
    <section className="relative animate-rise overflow-hidden rounded-panel shadow-lift" aria-labelledby="hero-title">
      <div className="relative min-h-[540px] sm:min-h-[560px] md:aspect-[21/9] md:min-h-[460px] lg:aspect-[24/9]">
        <Thumb id={video.id} kind="hero" priority className="absolute inset-0 h-full w-full scale-105 animate-drift" />

        {/* cinematic scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{ background: 'linear-gradient(120deg, rgb(var(--c-brand-1)/.45), transparent 55%)' }}
        />

        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-9 lg:p-12">
          <div className="max-w-[680px]">
            <span
              style={rise(80)}
              className="inline-flex animate-rise items-center gap-1.5 rounded-pill bg-vybe px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white shadow-[0_8px_22px_-8px_rgb(var(--c-brand-2))]"
            >
              <Flame size={12} strokeWidth={2.6} />
              Trending now
            </span>

            <h1
              id="hero-title"
              style={rise(140)}
              className="mt-4 line-clamp-3 animate-rise font-display text-[29px] font-extrabold uppercase leading-[0.98] tracking-[-0.04em] text-white sm:text-[42px] sm:leading-[0.95] lg:text-[54px]"
            >
              {video.title}
            </h1>

            <div style={rise(220)} className="animate-rise">
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-semibold text-white/85">
                <Link href={channelHref(video.channelId)} className="flex items-center gap-2 transition-opacity hover:opacity-80">
                  <Avatar src={video.channelAvatar} name={video.channelTitle} size={28} />
                  <span>{video.channelTitle}</span>
                  {video.channelVerified && <Verified size={14} className="text-white" />}
                </Link>
                <span className="text-white/40">•</span>
                <span className="tabular-nums">{compact(video.views)} views</span>
                {video.publishedAt && (
                  <>
                    <span className="text-white/40">•</span>
                    <TimeAgo iso={video.publishedAt} />
                  </>
                )}
              </div>

              {video.description && (
                <p className="mt-4 line-clamp-2 max-w-[540px] text-[14px] leading-relaxed text-white/72 sm:text-[15px]">
                  {video.description.split('\n')[0]}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={`/watch/${video.id}`}
                  className="group inline-flex h-[52px] items-center gap-2.5 rounded-pill bg-white px-7 text-[15px] font-extrabold tracking-tight text-black transition-all duration-200 ease-vybe hover:-translate-y-0.5 hover:shadow-lift active:scale-95"
                >
                  <Play size={18} fill="currentColor" className="transition-transform duration-300 ease-vybe group-hover:scale-110" />
                  Watch Now
                </Link>
                <SaveButton video={video} />
                <a
                  href={watchUrl(video.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open on YouTube"
                  title="Open on YouTube"
                  className="grid h-[52px] w-[52px] place-items-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-xl transition-all duration-200 ease-vybe hover:bg-white/20 active:scale-90"
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
