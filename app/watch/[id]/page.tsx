import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AppShell } from '@/components/shell/AppShell';
import { WatchClient } from './WatchClient';
import { getComments, getRelated, getVideo } from '@/server/youtube';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const video = await getVideo(id);
  if (!video) return { title: 'Watch' };
  return {
    title: video.title,
    description: video.description.slice(0, 160),
    openGraph: { images: [`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`] },
  };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const video = await getVideo(id);
  if (!video) notFound();

  const [related, comments] = await Promise.all([getRelated(video, 14), getComments(video.id, video.channelId)]);
  const start = Math.max(0, Math.floor(Number(t) || 0));

  return (
    <AppShell rail={false}>
      <WatchClient video={video} related={related} comments={comments} start={start} />
    </AppShell>
  );
}
