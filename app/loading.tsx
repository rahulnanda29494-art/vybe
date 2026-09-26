import { AppShell } from '@/components/shell/AppShell';
import { FeedSkeleton, HeroSkeleton, Skeleton } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <AppShell>
      <HeroSkeleton />
      <div className="my-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-20 shrink-0 rounded-pill" />
        ))}
      </div>
      <FeedSkeleton count={10} />
    </AppShell>
  );
}
