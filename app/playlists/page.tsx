import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { PlaylistsClient } from './PlaylistsClient';

export const metadata: Metadata = { title: 'Playlists' };

export default function PlaylistsPage() {
  return (
    <AppShell>
      <PlaylistsClient />
    </AppShell>
  );
}
