import Link from 'next/link';
import type { ReactNode } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ArtAvatar } from '@/components/media/Art';
import { cx, compact, hash } from '@/lib/format';

/* ------------------------------ Button ------------------------------ */

type Variant = 'primary' | 'glass' | 'ghost' | 'outline' | 'solid' | 'live';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-vybe text-white shadow-[0_8px_24px_-10px_rgb(var(--c-brand-2)/0.9)] hover:shadow-[0_14px_36px_-12px_rgb(var(--c-brand-2)/0.95)]',
  glass: 'glass text-ink hover:bg-[var(--glass)] hover:border-[var(--line-strong)]',
  ghost: 'text-dim hover:text-ink hover:bg-[var(--glass-thin)]',
  outline: 'border border-line-strong text-ink hover:bg-[var(--glass-thin)]',
  solid: 'bg-ink text-bg hover:opacity-90',
  live: 'bg-live text-white shadow-[0_8px_24px_-10px_rgb(var(--c-live)/0.9)]',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-pill',
  md: 'h-11 px-5 text-sm gap-2 rounded-pill',
  lg: 'h-13 px-7 text-[15px] gap-2.5 rounded-pill',
};

interface ButtonProps {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
  title?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}

export function Button({
  children,
  variant = 'glass',
  size = 'md',
  href,
  icon,
  className,
  onClick,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const cls = cx(
    'inline-flex select-none items-center justify-center font-semibold tracking-tight',
    'transition-all duration-200 ease-vybe active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
    'hover:-translate-y-[1px]',
    VARIANT[variant],
    SIZE[size],
    size === 'lg' && 'h-[52px]',
    className,
  );

  const inner = (
    <>
      {icon}
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls} {...rest}>
      {inner}
    </button>
  );
}

/** Square icon-only button. */
export function IconButton({
  children,
  label,
  variant = 'ghost',
  onClick,
  href,
  className,
  active,
}: {
  children: ReactNode;
  label: string;
  variant?: Variant;
  onClick?: () => void;
  href?: string;
  className?: string;
  active?: boolean;
}) {
  const cls = cx(
    'relative inline-grid h-11 w-11 place-items-center rounded-2xl transition-all duration-200 ease-vybe',
    'active:scale-90',
    active ? 'bg-vybe-soft text-ink' : VARIANT[variant],
    className,
  );
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {children}
    </Link>
  ) : (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* ------------------------------- Pill -------------------------------- */

export function Pill({
  children,
  active,
  onClick,
  href,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  className?: string;
}) {
  const cls = cx(
    'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-4 text-[13px] font-semibold',
    'transition-all duration-200 ease-vybe active:scale-95',
    active
      ? 'bg-vybe text-white shadow-[0_6px_18px_-8px_rgb(var(--c-brand-2)/0.9)]'
      : 'glass text-dim hover:text-ink hover:border-[var(--line-strong)]',
    className,
  );
  return href ? (
    <Link href={href} className={cls} aria-current={active ? 'page' : undefined}>
      {children}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-pressed={active}>
      {children}
    </button>
  );
}

/* ------------------------------ Badges ------------------------------- */

export function Badge({
  children,
  tone = 'glass',
  className,
}: {
  children: ReactNode;
  tone?: 'glass' | 'gradient' | 'live' | 'dark';
  className?: string;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em]',
        tone === 'gradient' && 'bg-vybe text-white',
        tone === 'glass' && 'glass text-ink',
        tone === 'dark' && 'bg-black/65 text-white backdrop-blur-md',
        tone === 'live' && 'bg-live text-white',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cx('relative flex h-1.5 w-1.5', className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
    </span>
  );
}

export function Verified({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <BadgeCheck
      size={size}
      strokeWidth={2.4}
      className={cx('shrink-0 text-electric', className)}
      aria-label="Verified creator"
    />
  );
}

/* ------------------------------ Avatar ------------------------------- */

export function Avatar({
  seed,
  src,
  name,
  size = 40,
  ring,
  className,
}: {
  /** Defaults to a hash of the name, so a channel always gets the same colours. */
  seed?: number;
  /** Real image (e.g. a YouTube channel avatar). Falls back to gradient initials. */
  src?: string;
  name: string;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <span
      className={cx(
        'relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full',
        ring && 'ring-2 ring-offset-2 ring-offset-bg',
        className,
      )}
      style={{
        width: size,
        height: size,
        ...(ring ? { boxShadow: '0 0 0 2px rgb(var(--c-brand-2) / 0.8)' } : {}),
      }}
      title={name}
    >
      <ArtAvatar seed={seed ?? hash(name)} className="absolute inset-0" />
      <span
        className="relative font-display font-extrabold text-white/95 drop-shadow"
        style={{ fontSize: Math.max(10, size * 0.34) }}
      >
        {initials}
      </span>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
    </span>
  );
}

/* ------------------------------- Stat -------------------------------- */

export function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-xl font-extrabold tabular-nums text-ink">
        {typeof value === 'number' ? compact(value) : value}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-faint">{label}</span>
    </div>
  );
}
