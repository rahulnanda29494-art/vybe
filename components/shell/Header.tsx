'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, MessageCircle, Plus, Search } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { SearchBar } from './SearchBar';
import { ProfileMenu } from './ProfileMenu';
import { useAuth } from './auth';
import { cx } from '@/lib/format';

export function Header() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cx(
        'fixed inset-x-0 top-0 z-40 transition-[background,box-shadow,border] duration-300 ease-vybe',
        scrolled
          ? 'border-b border-line bg-[var(--glass)] shadow-soft backdrop-blur-2xl backdrop-saturate-150'
          : 'border-b border-transparent bg-transparent',
      )}
      style={{ height: 'var(--header-h)' }}
    >
      <div className="mx-auto flex h-full max-w-[1800px] items-center gap-3 px-4 sm:gap-5 sm:px-6">
        <Logo className="shrink-0" />

        <div className="mx-auto hidden w-full max-w-[560px] md:block">
          <SearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Search"
            onClick={() => setMobileSearch((v) => !v)}
            className="glass grid h-11 w-11 place-items-center rounded-2xl text-ink transition-transform active:scale-90 md:hidden"
          >
            <Search size={19} />
          </button>

          <Link
            href={user ? '/studio/upload' : '/signin?next=%2Fstudio%2Fupload'}
            className="group hidden h-11 items-center gap-2 rounded-pill bg-vybe px-4 text-sm font-bold text-white shadow-[0_8px_22px_-10px_rgb(var(--c-brand-2)/0.9)] transition-all duration-200 ease-vybe hover:-translate-y-px hover:shadow-[0_14px_34px_-12px_rgb(var(--c-brand-2)/1)] active:scale-95 sm:inline-flex"
          >
            <Plus size={17} strokeWidth={2.6} className="transition-transform duration-300 ease-vybe group-hover:rotate-90" />
            Create
          </Link>

          {user && (
            <>
              <HeaderAction label="Notifications">
                <Bell size={19} strokeWidth={1.9} />
              </HeaderAction>
              <HeaderAction label="Messages">
                <MessageCircle size={19} strokeWidth={1.9} />
              </HeaderAction>
            </>
          )}

          <ProfileMenu />
        </div>
      </div>

      {mobileSearch && (
        <div className="glass border-t border-line px-4 py-3 md:hidden">
          <SearchBar />
        </div>
      )}
    </header>
  );
}

function HeaderAction({
  children,
  label,
  count,
}: {
  children: React.ReactNode;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-label={count ? `${label}, ${count} unread` : label}
      title={label}
      className="relative hidden h-11 w-11 place-items-center rounded-2xl text-dim transition-all duration-200 ease-vybe hover:bg-[var(--glass-thin)] hover:text-ink active:scale-90 sm:grid"
    >
      {children}
      {!!count && (
        <span className="absolute right-1.5 top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-vybe px-1 text-[10px] font-extrabold text-white ring-2 ring-bg">
          {count}
        </span>
      )}
    </button>
  );
}
