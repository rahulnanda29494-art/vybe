'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { NAV } from './nav-config';
import { cx } from '@/lib/format';

/**
 * Desktop rail. `self-start` is load-bearing: as a stretched flex child the
 * aside would be as tall as the page, leaving `sticky` no slack to work with,
 * and the rail would scroll away with the feed.
 *
 * The rail is taller than a short laptop viewport, so it scrolls inside
 * itself — with a visible slim bar and a bottom fade, because without either
 * the list just looks like it ends at "Travel".
 */
export function SideNav() {
  const pathname = usePathname();
  const scroller = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (el) setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 8);
  }, []);

  useEffect(() => {
    sync();
    if (typeof ResizeObserver === 'undefined') return;
    // Watch the content as well as the clipped box: the box keeps its height
    // while the list inside it grows past the fold (web fonts, zoom, resize).
    const ro = new ResizeObserver(sync);
    for (const el of [scroller.current, content.current]) if (el) ro.observe(el);
    return () => ro.disconnect();
  }, [sync]);

  return (
    <aside
      className="sticky hidden shrink-0 self-start lg:block"
      style={{ top: 'calc(var(--header-h) + 16px)', width: 'var(--rail-w)' }}
    >
      <div
        className="glass relative flex flex-col rounded-panel p-3 shadow-soft"
        style={{ maxHeight: 'calc(100vh - var(--header-h) - 40px)' }}
      >
        <div
          ref={scroller}
          onScroll={sync}
          className="thin-bar -mr-1 min-h-0 overflow-y-auto pr-1"
        >
          <div ref={content} className="flex flex-col gap-6">
            <nav aria-label="Primary" className="flex flex-col gap-6">
              {NAV.map((group) => (
                <div key={group.title}>
                  <p className="px-3.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-faint">
                    {group.title}
                  </p>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const active =
                        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            className={cx(
                              'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold',
                              'transition-colors duration-200 ease-vybe',
                              active
                                ? 'text-ink'
                                : 'text-dim hover:bg-[var(--glass-thin)] hover:text-ink',
                            )}
                          >
                            {active && (
                              <motion.span
                                layoutId="nav-active"
                                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                                className="absolute inset-0 -z-10 rounded-2xl bg-vybe-soft ring-1 ring-inset ring-[var(--line-strong)]"
                              >
                                <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-vybe" />
                                <span className="absolute inset-0 rounded-2xl bg-vybe opacity-[0.10] blur-md" />
                              </motion.span>
                            )}
                            <Icon
                              size={18}
                              strokeWidth={active ? 2.4 : 1.9}
                              className={cx(
                                'shrink-0 transition-transform duration-200 ease-vybe group-hover:scale-110',
                                active && 'text-brand-2',
                              )}
                            />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            {/* Creator CTA */}
            <div className="grad-ring relative mt-1 shrink-0 overflow-hidden rounded-tile bg-vybe-soft p-4">
              <Sparkles size={18} className="mb-2.5 text-brand-2" />
              <p className="font-display text-[15px] font-extrabold leading-snug text-ink">
                Start your channel
              </p>
              <p className="mt-1 text-xs leading-relaxed text-dim">
                Upload, go live and build your audience on VYBE.
              </p>
              <Link
                href="/studio"
                className="mt-3.5 inline-flex h-9 items-center rounded-pill bg-vybe px-4 text-[13px] font-bold text-white transition-transform duration-200 ease-vybe hover:scale-[1.03]"
              >
                Open Studio
              </Link>
            </div>
          </div>
        </div>

        <div
          aria-hidden
          className={cx(
            'pointer-events-none absolute inset-x-3 bottom-3 h-14 rounded-b-[25px]',
            'bg-gradient-to-t from-[var(--glass-menu)] via-[var(--glass)] to-transparent',
            'transition-opacity duration-200 ease-vybe',
            more ? 'opacity-100' : 'opacity-0',
          )}
        />
      </div>
    </aside>
  );
}
