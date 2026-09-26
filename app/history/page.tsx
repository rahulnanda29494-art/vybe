import type { Metadata } from 'next';
import { History } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata: Metadata = { title: 'History' };

export default function HistoryPage() {
  return (
    <AppShell>
      <LibraryView
        kind="history"
        kicker="Your history"
        title="Watch History"
        subtitle="Everything you have watched, most recent first."
        empty={{
          icon: <History size={30} />,
          title: 'Nothing watched yet.',
          body: 'Videos you watch show up here so you can jump back in anytime.',
          action: 'Find something to watch',
          href: '/explore',
        }}
      />
    </AppShell>
  );
}
