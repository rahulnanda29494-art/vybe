'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clapperboard, Compass, Home, Plus, User } from 'lucide-react';
import { Avatar } from '@/components/ui/primitives';
import { cx } from '@/lib/format';
import { useAuth } from './auth';

const ITEMS = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Explore', href: '/explore', icon: Compass },
  { label: 'Create', href: '/studio/upload', icon: Plus, center: true },
  { label: 'Subs', href: '/subscriptions', icon: Clapperboard },
  { label: 'You', href: '/settings', icon: User, avatar: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  // Signed-out: account + create routes go through sign-in first.
  const hrefFor = (item: (typeof ITEMS)[number]) =>
    user || !(item.avatar || item.center) ? item.href : `/signin?next=${encodeURIComponent(item.href)}`;

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="glass mx-3 mb-3 flex items-center justify-between rounded-[26px] px-2 py-2 shadow-lift">
        {ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.center) {
            return (
              <Link
                key={item.href}
                href={hrefFor(item)}
                aria-label="Create"
                className="group relative -mt-7 grid h-14 w-14 shrink-0 place-items-center rounded-[20px] bg-vybe text-white shadow-[0_10px_28px_-8px_rgb(var(--c-brand-2)/0.95)] transition-transform duration-200 ease-vybe active:scale-90"
              >
                <span className="absolute inset-0 -z-10 rounded-[20px] bg-vybe blur-lg opacity-60" />
                <Plus size={26} strokeWidth={2.6} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={hrefFor(item)}
              aria-current={active ? 'page' : undefined}
              className={cx(
                'relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold tracking-wide transition-colors',
                active ? 'text-ink' : 'text-faint',
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottom-active"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-2xl bg-vybe-soft"
                />
              )}
              {item.avatar && user ? (
                <Avatar name={user.name} size={22} />
              ) : (
                <Icon size={21} strokeWidth={active ? 2.4 : 1.9} className={active ? 'text-brand-2' : ''} />
              )}
              {item.avatar && !user ? 'Sign in' : item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
