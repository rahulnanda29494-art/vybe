import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from '@/lib/format';

export function Section({
  title,
  kicker,
  href,
  action = 'See all',
  children,
  className,
  tight,
}: {
  title: string;
  kicker?: string;
  href?: string;
  action?: string;
  children: ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <section className={cx(tight ? 'mt-8' : 'mt-14', className)}>
      <header className="mb-5 flex items-end justify-between gap-4 px-0.5">
        <div className="min-w-0">
          {kicker && (
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-2">
              {kicker}
            </p>
          )}
          <h2 className="truncate font-display text-[26px] font-extrabold leading-none text-ink sm:text-[30px]">
            {title}
          </h2>
        </div>
        {href && (
          <Link
            href={href}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-2 text-[13px] font-semibold text-dim transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
          >
            {action}
            <ArrowRight
              size={15}
              className="transition-transform duration-200 ease-vybe group-hover:translate-x-0.5"
            />
          </Link>
        )}
      </header>
      {children}
    </section>
  );
}
