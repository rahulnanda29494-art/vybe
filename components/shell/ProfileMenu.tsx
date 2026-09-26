'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  CircleHelp,
  History,
  LayoutDashboard,
  ListVideo,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Settings,
  Sun,
} from 'lucide-react';
import { Avatar } from '@/components/ui/primitives';
import { useAuth } from './auth';
import { useTheme } from './theme';
import { cx } from '@/lib/format';

const LINKS = [
  { label: 'Creator Studio', href: '/studio', icon: LayoutDashboard },
  { label: 'Watch History', href: '/history', icon: History },
  { label: 'Saved Videos', href: '/later', icon: Bookmark },
  { label: 'Playlists', href: '/playlists', icon: ListVideo },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'Help', href: '/settings#help', icon: CircleHelp },
];

export function ProfileMenu() {
  const { user, status, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (status === 'loading') {
    return <span className="shimmer block h-10 w-10 rounded-full bg-[var(--glass-thin)]" aria-label="Loading account" />;
  }

  if (!user) {
    return (
      <Link
        href={`/signin?next=${encodeURIComponent(pathname)}`}
        className="glass inline-flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold text-ink transition-all duration-200 ease-vybe hover:-translate-y-px hover:border-[var(--line-strong)] active:scale-95"
      >
        <LogIn size={16} />
        Sign in
      </Link>
    );
  }

  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${user.name}`}
        className={cx('rounded-full transition-transform duration-200 ease-vybe hover:scale-105 active:scale-95', open && 'scale-105')}
      >
        <span className="block rounded-full bg-vybe p-[2px]">
          <Avatar name={user.name} size={36} className="ring-2 ring-bg" />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -6 }}
            transition={{ type: 'spring', stiffness: 460, damping: 32 }}
            className="glass-menu absolute right-0 top-[calc(100%+12px)] z-50 w-[286px] origin-top-right overflow-hidden rounded-tile p-2 shadow-lift"
          >
            <div className="mb-1 flex items-center gap-3 rounded-2xl bg-vybe-soft p-3">
              <Avatar name={user.name} size={44} />
              <div className="min-w-0">
                <p className="truncate font-display text-[15px] font-extrabold text-ink">{user.name}</p>
                <p className="truncate text-xs text-dim">{user.email}</p>
              </div>
            </div>

            {LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
              >
                <Icon size={17} strokeWidth={1.9} className="shrink-0" />
                {label}
              </Link>
            ))}

            <button
              type="button"
              role="menuitem"
              onClick={toggle}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
            >
              <span className="flex items-center gap-3">
                {theme === 'dark' ? <Moon size={17} strokeWidth={1.9} /> : <Sun size={17} strokeWidth={1.9} />}
                Appearance
              </span>
              <span className="rounded-pill bg-[var(--glass-thin)] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-faint">
                {theme}
              </span>
            </button>

            <div className="my-1 h-px bg-[var(--line)]" />
            <button
              type="button"
              role="menuitem"
              disabled={leaving}
              onClick={async () => {
                setLeaving(true);
                await signOut();
                setLeaving(false);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dim transition-colors hover:bg-rose-500/10 hover:text-rose-500 disabled:opacity-60"
            >
              {leaving ? <Loader2 size={17} className="animate-spin" /> : <LogOut size={17} strokeWidth={1.9} />}
              {leaving ? 'Signing out…' : 'Sign out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
