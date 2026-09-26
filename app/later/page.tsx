import type { Metadata } from 'next';
import { Clock3 } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata: Metadata = { title: 'Watch Later' };

export default function LaterPage() {
  return (
    <AppShell>
      <LibraryView
        kind="later"
        kicker="Saved for later"
        title="Watch Later"
        subtitle="Your queue for when you actually have time."
        empty={{
          icon: <Clock3 size={30} />,
          title: 'Your queue is clear.',
          body: 'Tap save on any video and it lands here, ready when you are.',
          action: 'Browse trending',
          href: '/trending',
        }}
      />
    </AppShell>
  );
}
