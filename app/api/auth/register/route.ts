import { NextResponse } from 'next/server';
import { AccountsUnavailableError, createUser } from '@/server/auth/users';
import { startSession } from '@/server/auth/session';
import { rateLimit, readJson, sameOrigin } from '@/server/auth/guard';

export const runtime = 'nodejs';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const blocked = sameOrigin(req) ?? rateLimit(req, 'register', 5);
  if (blocked) return blocked;

  const body = await readJson<{ name?: unknown; email?: unknown; password?: unknown }>(req);
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';

  const problems: Record<string, string> = {};
  if (name.length < 2 || name.length > 50) problems.name = 'Use 2–50 characters.';
  if (!EMAIL.test(email) || email.length > 254) problems.email = 'Enter a valid email.';
  if (password.length < 8) problems.password = 'Use at least 8 characters.';
  else if (password.length > 256) problems.password = 'That password is too long.';
  if (Object.keys(problems).length) {
    return NextResponse.json({ error: 'Check the highlighted fields.', fields: problems }, { status: 400 });
  }

  try {
    const user = await createUser({ name, email, password });
    if (user === 'exists') {
      return NextResponse.json(
        { error: 'An account with that email already exists.', fields: { email: 'Already registered — try signing in.' } },
        { status: 409 },
      );
    }
    await startSession(user);
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof AccountsUnavailableError) {
      return NextResponse.json({ error: 'Sign-up is temporarily unavailable.' }, { status: 503 });
    }
    throw err;
  }
}
