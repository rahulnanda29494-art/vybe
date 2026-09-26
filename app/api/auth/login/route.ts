import { NextResponse } from 'next/server';
import { AccountsUnavailableError, authenticate } from '@/server/auth/users';
import { startSession } from '@/server/auth/session';
import { rateLimit, readJson, sameOrigin } from '@/server/auth/guard';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const blocked = sameOrigin(req) ?? rateLimit(req, 'login');
  if (blocked) return blocked;

  const body = await readJson<{ email?: unknown; password?: unknown }>(req);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || !password || password.length > 256 || email.length > 254) {
    return NextResponse.json({ error: 'Enter your email and password.' }, { status: 400 });
  }

  try {
    const user = await authenticate(email, password);
    // One message for unknown email and wrong password — no account enumeration.
    if (!user) return NextResponse.json({ error: 'That email and password don’t match.' }, { status: 401 });
    await startSession(user);
    return NextResponse.json({ user });
  } catch (err) {
    if (err instanceof AccountsUnavailableError) {
      return NextResponse.json({ error: 'Sign-in is temporarily unavailable.' }, { status: 503 });
    }
    throw err;
  }
}
