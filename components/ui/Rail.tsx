'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cx } from '@/lib/format';

/** Horizontal, snap-scrolling carousel with keyboard + arrow affordances. */
export function Rail({
  children,
  className,
  itemClass,
  label,
}: {
  children: ReactNode;
  className?: string;
  itemClass?: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdges({
      start: el.scrollLeft < 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const nudge = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(320, el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <div className={cx('group/rail relative', className)}>
      <div
        ref={ref}
        onScroll={measure}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="no-bar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div key={i} className={cx('snap-start shrink-0', itemClass)}>
                {child}
              </div>
            ))
          : children}
      </div>

      {(['left', 'right'] as const).map((side) => {
        const hidden = side === 'left' ? edges.start : edges.end;
        return (
          <button
            key={side}
            type="button"
            onClick={() => nudge(side === 'left' ? -1 : 1)}
            aria-label={`Scroll ${label} ${side}`}
            className={cx(
              'glass absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full',
              'opacity-0 shadow-lift transition-all duration-200 ease-vybe',
              'group-hover/rail:opacity-100 hover:scale-105 focus-visible:opacity-100 md:grid',
              side === 'left' ? '-left-3' : '-right-3',
              hidden && 'pointer-events-none !opacity-0',
            )}
          >
            {side === 'left' ? <ChevronLeft size={19} /> : <ChevronRight size={19} />}
          </button>
        );
      })}
    </div>
  );
}
