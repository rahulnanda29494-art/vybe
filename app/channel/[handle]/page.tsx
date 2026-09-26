import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { ChannelClient } from './ChannelClient';
import { getChannel } from '@/server/youtube';

export const revalidate = 600;

/** Accepts `/channel/UC…`, `/channel/handle` and `/channel/@handle`. */
const decode = (raw: string) => decodeURIComponent(raw).replace(/^@/, '');

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const data = await getChannel(decode(handle));
  return { title: data ? data.channel.title : 'Channel' };
}

export default async function ChannelPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const data = await getChannel(decode(handle));
  if (!data) notFound();

  return (
    <AppShell rail={false}>
      <ChannelClient channel={data.channel} videos={data.videos} />
    </AppShell>
  );
}
