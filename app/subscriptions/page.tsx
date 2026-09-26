import type { Metadata } from 'next';
import { AppShell } from '@/components/shell/AppShell';
import { SubscriptionsClient } from './SubscriptionsClient';
import { getRecentUploads, getSpotlightChannels } from '@/server/youtube';

export const metadata: Metadata = { title: 'Subscriptions' };
export const revalidate = 300;

export default async function SubscriptionsPage() {
  const [feed, channels] = await Promise.all([getRecentUploads(), getSpotlightChannels()]);
  return (
    <AppShell>
      <SubscriptionsClient feed={feed} suggestions={channels} />
    </AppShell>
  );
}
