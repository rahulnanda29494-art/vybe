'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  handle?: string;
}

type Status = 'loading' | 'signed-in' | 'signed-out';

interface AuthCtx {
  user: SessionUser | null;
  status: Status;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

export type AuthResult = { ok: true } | { ok: false; error: string; fields?: Record<string, string> };

const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

async function post(url: string, body?: unknown): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
}

/**
 * Session state for the whole app. The session itself is an httpOnly cookie
 * the browser can't read, so the client asks /api/auth/me once on load and
 * updates locally after sign-in / sign-up / sign-out.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let alive = true;
    fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then(({ user }: { user: SessionUser | null }) => {
        if (!alive) return;
        setUser(user);
        setStatus(user ? 'signed-in' : 'signed-out');
      })
      .catch(() => alive && setStatus('signed-out'));
    return () => {
      alive = false;
    };
  }, []);

  const finish = useCallback(async (res: Response): Promise<AuthResult> => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error ?? 'Something went off vibe. Try again.', fields: data.fields };
    }
    setUser(data.user);
    setStatus('signed-in');
    router.refresh(); // re-render server components that depend on the session
    return { ok: true };
  }, [router]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        return await finish(await post('/api/auth/login', { email, password }));
      } catch {
        return { ok: false as const, error: 'Can’t reach VYBE right now. Check your connection.' };
      }
    },
    [finish],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      try {
        return await finish(await post('/api/auth/register', { name, email, password }));
      } catch {
        return { ok: false as const, error: 'Can’t reach VYBE right now. Check your connection.' };
      }
    },
    [finish],
  );

  const signOut = useCallback(async () => {
    try {
      await post('/api/auth/logout');
    } finally {
      setUser(null);
      setStatus('signed-out');
      router.refresh();
    }
  }, [router]);

  return <Ctx.Provider value={{ user, status, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}
