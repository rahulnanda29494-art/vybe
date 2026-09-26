import type { Metadata } from 'next';
import { Sparkles } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShortsClient } from './ShortsClient';
import { getShorts, getVideo } from '@/server/youtube';

export const metadata: Metadata = { title: 'Shorts' };

export default async function ShortsPage({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  let shorts = await getShorts(30);

  // A shared link to a short that isn't in the current feed still opens first.
  if (v && !shorts.some((s) => s.id === v)) {
    const linked = await getVideo(v);
    if (linked) shorts = [{ ...linked, isShort: true }, ...shorts];
  }

  return (
    <AppShell className="pb-6">
      {shorts.length ? (
        <ShortsClient shorts={shorts} initialId={v} />
      ) : (
        <EmptyState
          icon={<Sparkles size={30} />}
          title="No shorts right now."
          body="Quick hits from creators land here. Check back in a bit."
          action="Explore instead"
          href="/explore"
        />
      )}
    </AppShell>
  );
}
