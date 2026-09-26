import type { ReactNode } from 'react';
import { Button } from '@/components/ui/primitives';
import { cx } from '@/lib/format';

export function EmptyState({
  icon,
  title,
  body,
  action,
  href,
  className,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: string;
  href?: string;
  className?: string;
  /** Custom call-to-action (e.g. a button that opens a modal) instead of a link. */
  children?: ReactNode;
}) {
  return (
    <div
      className={cx(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-panel px-6 py-20 text-center',
        'glass',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            'radial-gradient(50% 60% at 50% 0%, rgb(var(--c-brand-1) / 0.16), transparent 70%)',
        }}
      />
      <div className="relative mb-6 grid h-20 w-20 place-items-center rounded-[26px] bg-vybe-soft text-brand-2 ring-1 ring-inset ring-[var(--line-strong)]">
        <div className="absolute inset-0 animate-float rounded-[26px] bg-vybe opacity-[0.14] blur-xl" />
        <span className="relative">{icon}</span>
      </div>
      <h3 className="relative font-display text-2xl font-extrabold text-ink">{title}</h3>
      <p className="relative mt-2.5 max-w-sm text-sm leading-relaxed text-dim">{body}</p>
      {action && (
        <Button href={href ?? '/'} variant="primary" size="md" className="relative mt-7">
          {action}
        </Button>
      )}
      {children && <div className="relative mt-7">{children}</div>}
    </div>
  );
}
