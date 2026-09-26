import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

export default function NotFound() {
  return (
    <div className="relative grid min-h-screen place-items-center px-6">
      <div className="relative w-full max-w-lg text-center">
        <p className="grad-text font-display text-[104px] font-extrabold leading-none tracking-[-0.06em] sm:text-[140px]">
          404
        </p>
        <h1 className="mt-2 font-display text-[28px] font-extrabold text-ink sm:text-[34px]">
          This vibe moved on.
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-dim">
          The page you were after is gone, renamed, or never existed. Plenty more to watch.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vybe px-6 text-sm font-bold text-white transition-transform duration-200 ease-vybe hover:-translate-y-0.5 active:scale-95"
          >
            <Home size={16} />
            Back home
          </Link>
          <Link
            href="/explore"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-line-strong px-6 text-sm font-bold text-ink transition-colors hover:bg-[var(--glass-thin)]"
          >
            <Compass size={16} />
            Explore
          </Link>
        </div>
        <div className="mt-12 flex justify-center opacity-60">
          <Logo withTagline />
        </div>
      </div>
    </div>
  );
}
