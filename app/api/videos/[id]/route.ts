import { NextResponse } from 'next/server';
import { getVideo } from '@/server/youtube';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const video = await getVideo(id);
  return video ? NextResponse.json(video) : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
