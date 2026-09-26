'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Home, RefreshCw, Unplug } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="relative grid min-h-screen place-items-center px-6">
      <div className="glass relative w-full max-w-md overflow-hidden rounded-panel p-10 text-center shadow-lift">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(60% 60% at 50% 0%, rgb(var(--c-brand-2) / 0.18), transparent 70%)',
          }}
        />
        <div className="relative mx-auto mb-7 grid h-20 w-20 place-items-center rounded-[26px] bg-vybe-soft text-brand-2 ring-1 ring-inset ring-[var(--line-strong)]">
          <Unplug size={30} />
        </div>
        <h1 className="relative font-display text-[30px] font-extrabold leading-tight text-ink">
          Something went off vibe.
        </h1>
        <p className="relative mt-3 text-sm leading-relaxed text-dim">
          We dropped the beat for a second. Give it another go — your place is saved.
        </p>
        <div className="relative mt-8 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill bg-vybe px-6 text-sm font-bold text-white transition-transform duration-200 ease-vybe hover:-translate-y-0.5 active:scale-95"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <Link
            href="/"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-pill border border-line-strong px-6 text-sm font-bold text-ink transition-colors hover:bg-[var(--glass-thin)]"
          >
            <Home size={16} />
            Back home
          </Link>
        </div>
        <div className="relative mt-9 flex justify-center opacity-60">
          <Logo withTagline />
        </div>
      </div>
    </div>
  );
}
