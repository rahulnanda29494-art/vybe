import { NextResponse } from 'next/server';
import { sessionUser } from '@/server/auth/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 200 with `user: null` when signed out, so the client never logs a failed request. */
export async function GET() {
  return NextResponse.json({ user: await sessionUser() }, { headers: { 'Cache-Control': 'no-store' } });
}
