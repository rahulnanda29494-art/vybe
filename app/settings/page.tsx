import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { PageHead } from '@/components/ui/PageHead';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <AppShell>
      <PageHead kicker="Your VYBE" title="Settings" subtitle="Make it yours." />
      <SettingsClient />
    </AppShell>
  );
}
