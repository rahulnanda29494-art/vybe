import { cx } from '@/lib/format';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx('shimmer rounded-xl bg-[var(--glass-thin)]', className)}
      style={{ background: 'var(--glass-thin)' }}
      aria-hidden
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-video w-full rounded-card" />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-3.5 w-[92%]" />
          <Skeleton className="h-3.5 w-[64%]" />
          <Skeleton className="h-3 w-[46%]" />
        </div>
      </div>
    </div>
  );
}

export function ShortCardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="aspect-[9/16] w-full rounded-tile" />
      <Skeleton className="h-3.5 w-[85%]" />
      <Skeleton className="h-3 w-[50%]" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-panel">
      <Skeleton className="aspect-[21/9] w-full rounded-panel md:aspect-[24/9]" />
      <div className="absolute bottom-8 left-8 flex w-1/2 flex-col gap-3">
        <Skeleton className="h-5 w-28 rounded-pill" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      {Array.from({ length: count }, (_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="glass flex flex-col gap-3 rounded-tile p-5">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}
