import { Suspense, type ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Thumb } from '@/components/media/Thumb';
import { getTrending } from '@/server/youtube';

/**
 * Full-bleed auth screen: a slowly drifting wall of what's trending on the
 * left (desktop), the form on the right. Mobile shows the form alone.
 */
export async function AuthLayout({ children }: { children: ReactNode }) {
  const wall = (await getTrending(12).catch(() => [])).slice(0, 12);
  const columns = [wall.filter((_, i) => i % 3 === 0), wall.filter((_, i) => i % 3 === 1), wall.filter((_, i) => i % 3 === 2)];

  return (
    <div className="relative z-10 grid min-h-[100dvh] lg:grid-cols-[1.1fr_1fr]">
      {/* visual side */}
      <aside className="relative hidden overflow-hidden lg:block" aria-hidden>
        <div className="absolute inset-0 grid grid-cols-3 gap-4 p-4 [transform:rotate(-8deg)_scale(1.25)]">
          {columns.map((col, c) => (
            <div key={c} className={c === 1 ? 'animate-float [animation-duration:9s]' : 'animate-float [animation-duration:12s]'}>
              <div className={c === 1 ? 'mt-24 flex flex-col gap-4' : 'flex flex-col gap-4'}>
                {col.map((v) => (
                  <Thumb key={v.id} id={v.id} className="aspect-video w-full rounded-tile shadow-lift" />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-bg/40 via-bg/60 to-bg" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-bg/40" />
        <div
          className="absolute inset-0 mix-blend-soft-light"
          style={{ background: 'linear-gradient(135deg, rgb(var(--c-brand-1)/.55), rgb(var(--c-brand-2)/.3) 50%, transparent)' }}
        />
        <div className="absolute bottom-14 left-14 max-w-md">
          <p className="font-display text-[44px] font-extrabold leading-[1.02] tracking-tight text-ink">
            Watch. Create.
            <br />
            <span className="grad-text">Connect.</span>
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-dim">
            The best of YouTube, in a feed that actually feels like yours.
          </p>
        </div>
      </aside>

      {/* form side */}
      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <Suspense>{children}</Suspense>
        </div>
        <p className="text-center text-[12px] text-faint">
          Videos are streamed from YouTube and subject to YouTube’s Terms of Service.
        </p>
      </main>
    </div>
  );
}
