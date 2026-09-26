import 'server-only';
import { NextResponse } from 'next/server';

/**
 * Request guards shared by the auth routes.
 *  - sameOrigin: rejects cross-site form posts (defence in depth on top of SameSite=Lax).
 *  - rateLimit:  fixed-window limiter per client + route. In-memory, so it is
 *                per-instance; swap for Redis when running more than one node.
 */

export function sameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null; // same-origin fetches from older browsers may omit it
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* malformed origin → reject below */
  }
  return NextResponse.json({ error: 'Cross-site request blocked' }, { status: 403 });
}

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(req: Request, scope: string, limit = 10, windowMs = 10 * 60_000): NextResponse | null {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  const key = `${scope}:${ip}`;
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    return null;
  }
  if (++b.count > limit) {
    const retry = Math.ceil((b.reset - now) / 1000);
    return NextResponse.json(
      { error: 'Too many attempts. Take a breather and try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(retry) } },
    );
  }
  return null;
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
