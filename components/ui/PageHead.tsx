import type { ReactNode } from 'react';
import { cx } from '@/lib/format';

export function PageHead({
  kicker,
  title,
  subtitle,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cx('mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {kicker && (
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-2">
            {kicker}
          </p>
        )}
        <h1 className="font-display text-[32px] font-extrabold leading-none tracking-tight text-ink sm:text-[40px]">
          {title}
        </h1>
        {subtitle && <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">{subtitle}</p>}
      </div>
      {actions && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
