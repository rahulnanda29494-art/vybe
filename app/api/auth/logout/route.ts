import { NextResponse } from 'next/server';
import { endSession } from '@/server/auth/session';
import { sameOrigin } from '@/server/auth/guard';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const blocked = sameOrigin(req);
  if (blocked) return blocked;
  await endSession();
  return NextResponse.json({ ok: true });
}
