import Link from 'next/link';
import { cx } from '@/lib/format';

/**
 * VYBE mark — an equaliser pulse that resolves into a play glyph.
 * Two rising bars (the "vybe") sit beside a forward triangle (the "watch").
 */
export function Mark({ size = 34, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cx('shrink-0', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="vybeMark" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="rgb(var(--c-brand-1))" />
          <stop offset="0.55" stopColor="rgb(var(--c-brand-2))" />
          <stop offset="1" stopColor="rgb(var(--c-brand-3))" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="10.5" fill="url(#vybeMark)" />
      <rect x="6.5" y="13" width="3" height="6" rx="1.5" fill="white" opacity="0.72" />
      <rect x="11.5" y="9.5" width="3" height="13" rx="1.5" fill="white" opacity="0.9" />
      <path
        d="M17.8 10.4a1.5 1.5 0 0 1 2.27-1.29l6.1 3.6a1.5 1.5 0 0 1 0 2.58l-6.1 3.6A1.5 1.5 0 0 1 17.8 17.6v-7.2Z"
        fill="white"
        transform="translate(0 2)"
      />
    </svg>
  );
}

export function Logo({
  compact = false,
  withTagline = false,
  className,
}: {
  compact?: boolean;
  withTagline?: boolean;
  className?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="VYBE — Watch. Create. Connect. Go to home"
      className={cx(
        'group flex items-center gap-2.5 rounded-2xl transition-transform duration-300 ease-vybe hover:scale-[1.02] active:scale-[0.99]',
        className,
      )}
    >
      <span className="relative">
        <Mark />
        <span className="absolute inset-0 -z-10 rounded-[10.5px] bg-vybe opacity-0 blur-lg transition-opacity duration-300 group-hover:opacity-70" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[22px] font-extrabold tracking-[-0.06em] text-ink">
            VYBE
          </span>
          {withTagline && (
            <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">
              Watch. Create. Connect.
            </span>
          )}
        </span>
      )}
    </Link>
  );
}
