import { NextResponse } from 'next/server';
import { currentUser } from '@/server/auth/session';
import { ALLOWED_TYPES, storage } from '@/server/storage';

export const runtime = 'nodejs';

const MAX_BYTES = 512 * 1024 * 1024; // local driver cap; S3 uploads go direct to the bucket

/** Local-driver upload sink. Only accepts keys the caller owns. */
export async function PUT(req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (process.env.STORAGE_DRIVER === 's3') {
    return NextResponse.json({ error: 'Upload directly to the signed URL' }, { status: 405 });
  }
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });

  const key = (await params).key.map(decodeURIComponent).join('/');
  const [kind, owner] = key.split('/');
  if (!['video', 'thumbnail', 'avatar'].includes(kind) || owner !== user.sub.replace(/[^a-zA-Z0-9-]/g, '') || key.includes('..')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contentType = req.headers.get('content-type') ?? '';
  if (!ALLOWED_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
  }
  const length = Number(req.headers.get('content-length') ?? 0);
  if (length > MAX_BYTES) return NextResponse.json({ error: 'File too large' }, { status: 413 });

  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return NextResponse.json({ error: 'File too large' }, { status: 413 });

  await storage().put(key, buf, contentType);
  return NextResponse.json({ key, url: storage().publicUrl(key) }, { status: 201 });
}
