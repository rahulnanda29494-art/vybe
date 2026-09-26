import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { LibraryView } from '@/components/library/LibraryView';

export const metadata: Metadata = { title: 'Liked' };

export default function LikedPage() {
  return (
    <AppShell>
      <LibraryView
        kind="liked"
        kicker="Your likes"
        title="Liked Videos"
        subtitle="The ones that hit."
        empty={{
          icon: <Heart size={30} />,
          title: 'No likes yet.',
          body: 'Show some love on a video and it will be saved here.',
          action: 'Start watching',
          href: '/',
        }}
      />
    </AppShell>
  );
}
