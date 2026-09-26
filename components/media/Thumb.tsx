'use client';

import { useEffect, useRef, useState } from 'react';
import { thumbCandidates } from '@/lib/yt';
import { cx } from '@/lib/format';

/**
 * YouTube thumbnail with a quality ladder (maxres → hq720 → hqdefault).
 * YouTube serves a 120×90 grey placeholder instead of a 404 for missing
 * sizes, so tiny natural widths are treated as a miss too.
 */
export function Thumb({
  id,
  kind = 'wide',
  alt = '',
  className,
  priority,
}: {
  id: string;
  kind?: 'wide' | 'hero' | 'short';
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  const sources = thumbCandidates(id, kind);
  const [i, setI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  const next = () => setI((n) => (n < sources.length - 1 ? n + 1 : n));

  const settle = (el: HTMLImageElement) => {
    if (el.naturalWidth <= 120 && i < sources.length - 1) return next();
    setLoaded(true);
  };

  // Cached images can finish before hydration, when React misses onLoad.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) settle(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <span className={cx('block overflow-hidden bg-raise', /(absolute|fixed)/.test(className ?? '') ? undefined : 'relative', className)}>
      {!loaded && <span className="shimmer absolute inset-0" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={sources[i]}
        src={sources[i]}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        referrerPolicy="no-referrer"
        ref={img}
        onLoad={(e) => settle(e.currentTarget)}
        onError={next}
        className={cx(
          'absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ease-vybe',
          loaded ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  );
}
