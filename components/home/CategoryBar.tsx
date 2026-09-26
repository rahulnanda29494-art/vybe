'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cx } from '@/lib/format';

const PILLS = [
  { label: 'All', href: '/' },
  { label: 'Trending', href: '/trending' },
  { label: 'Music', href: '/category/music' },
  { label: 'Gaming', href: '/category/gaming' },
  { label: 'AI', href: '/category/ai' },
  { label: 'Tech', href: '/category/tech' },
  { label: 'Coding', href: '/category/coding' },
  { label: 'Sports', href: '/category/sports' },
  { label: 'Podcasts', href: '/category/podcasts' },
  { label: 'Education', href: '/category/education' },
  { label: 'Travel', href: '/category/travel' },
  { label: 'Fashion', href: '/category/fashion' },
  { label: 'Food', href: '/category/food' },
  { label: 'Comedy', href: '/category/comedy' },
  { label: 'Live', href: '/live' },
  { label: 'Shorts', href: '/shorts' },
];

export function CategoryBar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Categories"
      className={cx('sticky z-30 -mx-4 bg-gradient-to-b from-bg via-bg/90 to-transparent px-4 sm:-mx-6 sm:px-6', className)}
      style={{ top: 'var(--header-h)' }}
    >
      <div className="edge-fade no-bar flex gap-2 overflow-x-auto py-3.5">
        {PILLS.map((pill) => {
          const active = pill.href === '/' ? pathname === '/' : pathname.startsWith(pill.href);
          return (
            <Link
              key={pill.href}
              href={pill.href}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-pill px-4 text-[13px] font-bold tracking-tight',
                'transition-colors duration-200 ease-vybe active:scale-95',
                active ? 'text-white' : 'glass text-dim hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="cat-pill"
                  transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                  className="absolute inset-0 -z-10 rounded-pill bg-vybe shadow-[0_6px_18px_-8px_rgb(var(--c-brand-2))]"
                />
              )}
              {pill.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
