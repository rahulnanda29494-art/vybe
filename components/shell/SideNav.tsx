'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { NAV } from './nav-config';
import { cx } from '@/lib/format';

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside
      className="sticky hidden shrink-0 lg:block"
      style={{ top: 'calc(var(--header-h) + 16px)', width: 'var(--rail-w)' }}
    >
      <nav
        aria-label="Primary"
        className="glass no-bar flex max-h-[calc(100vh-var(--header-h)-40px)] flex-col gap-6 overflow-y-auto rounded-panel p-3 shadow-soft"
      >
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
                        active ? 'text-ink' : 'text-dim hover:bg-[var(--glass-thin)] hover:text-ink',
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

        {/* Creator CTA */}
        <div className="grad-ring relative mt-1 overflow-hidden rounded-tile bg-vybe-soft p-4">
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
      </nav>
    </aside>
  );
}
