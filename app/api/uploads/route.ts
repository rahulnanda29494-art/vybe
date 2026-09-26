import { NextResponse } from 'next/server';
import { currentUser } from '@/server/auth/session';
import { ALLOWED_TYPES, storage } from '@/server/storage';

export const runtime = 'nodejs';

const KINDS = new Set(['video', 'thumbnail', 'avatar']);

/** Step 1 of an upload: authenticate, validate, and hand back a signed target. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { kind, contentType } = body as { kind?: string; contentType?: string };
  if (!kind || !KINDS.has(kind) || !contentType || !ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported upload' }, { status: 400 });
  }
  if (kind === 'video' && !contentType.startsWith('video/')) {
    return NextResponse.json({ error: 'Expected a video file' }, { status: 400 });
  }

  const target = await storage().createUploadTarget({
    kind: kind as 'video' | 'thumbnail' | 'avatar',
    contentType,
    ownerId: user.sub,
  });
  return NextResponse.json(target, { status: 201 });
}
