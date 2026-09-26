import type { ReactNode } from 'react';
import { Header } from './Header';
import { SideNav } from './SideNav';
import { BottomNav } from './BottomNav';
import { cx } from '@/lib/format';

/**
 * Standard page frame: floating glass header, floating rail on desktop,
 * bottom bar on mobile. `bleed` drops the max-width for cinematic pages.
 */
export function AppShell({
  children,
  rail = true,
  className,
}: {
  children: ReactNode;
  rail?: boolean;
  className?: string;
}) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-pill focus:bg-vybe focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <Header />
      <div
        className="relative z-10 mx-auto flex w-full max-w-[1800px] gap-6 px-4 sm:px-6"
        style={{ paddingTop: 'calc(var(--header-h) + 16px)' }}
      >
        {rail && <SideNav />}
        <main id="main" className={cx('min-w-0 flex-1 pb-32 lg:pb-16', className)}>
          {children}
        </main>
      </div>
      <BottomNav />
    </>
  );
}
