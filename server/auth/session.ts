import 'server-only';
import { cookies } from 'next/headers';
import { signJwt, verifyJwt, type Claims } from './jwt';
import type { PublicUser } from './users';

export const SESSION_COOKIE = 'vybe_session';

/** Issues an httpOnly, SameSite=Lax session cookie carrying a signed JWT. */
export async function startSession(user: PublicUser) {
  const ttl = 60 * 60 * 24 * 7;
  const token = signJwt({ sub: user.id, name: user.name, email: user.email, handle: user.handle }, ttl);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttl,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<Claims | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifyJwt(token) : null;
}

/** Session as the UI sees it — never includes token internals. */
export async function sessionUser(): Promise<PublicUser | null> {
  const c = await currentUser();
  return c ? { id: c.sub, name: c.name ?? 'VYBE member', email: c.email ?? '', handle: c.handle } : null;
}
