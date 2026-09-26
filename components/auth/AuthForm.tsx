'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/shell/auth';
import { cx } from '@/lib/format';

/** Only same-site relative paths — never `//evil.com` or absolute URLs. */
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  return raw;
}

export function AuthForm({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp, status } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  // Already signed in (e.g. opened /signin in a second tab) — continue on.
  useEffect(() => {
    if (status === 'signed-in') router.replace(next);
  }, [status, next, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setFields({});
    const res = mode === 'signin' ? await signIn(email, password) : await signUp(name, email, password);
    if (res.ok) {
      router.replace(next);
      return;
    }
    setError(res.error);
    setFields(res.fields ?? {});
    setBusy(false);
  };

  const isUp = mode === 'signup';
  const other = `${isUp ? '/signin' : '/signup'}${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[420px]"
    >
      <h1 className="font-display text-[34px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[40px]">
        {isUp ? (
          <>
            Join the <span className="grad-text">vybe.</span>
          </>
        ) : (
          <>
            Welcome <span className="grad-text">back.</span>
          </>
        )}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-dim">
        {isUp
          ? 'Save videos, build playlists and follow the channels you love.'
          : 'Pick up right where you left off.'}
      </p>

      <form onSubmit={submit} noValidate className="mt-8 flex flex-col gap-4">
        {isUp && (
          <Field
            id="name"
            label="Name"
            autoComplete="name"
            value={name}
            onChange={setName}
            error={fields.name}
            placeholder="What should we call you?"
          />
        )}
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={fields.email}
          placeholder="you@example.com"
        />
        <Field
          id="password"
          label="Password"
          type={show ? 'text' : 'password'}
          autoComplete={isUp ? 'new-password' : 'current-password'}
          value={password}
          onChange={setPassword}
          error={fields.password}
          placeholder={isUp ? 'At least 8 characters' : 'Your password'}
          trailing={
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="grid h-9 w-9 place-items-center rounded-full text-faint transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
            >
              {show ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          }
        />

        <AnimatePresence>
          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 overflow-hidden rounded-2xl bg-rose-500/10 px-4 py-3 text-[13.5px] font-medium text-ink ring-1 ring-inset ring-rose-500/30"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-500" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={busy}
          className="group mt-2 inline-flex h-[52px] items-center justify-center gap-2 rounded-pill bg-vybe text-[15px] font-extrabold text-white shadow-[0_10px_28px_-10px_rgb(var(--c-brand-2))] transition-all duration-200 ease-vybe hover:-translate-y-0.5 active:scale-[0.98] disabled:translate-y-0 disabled:opacity-70"
        >
          {busy ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {isUp ? 'Create account' : 'Sign in'}
              <ArrowRight size={17} className="transition-transform duration-200 ease-vybe group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[14px] text-dim">
        {isUp ? 'Already on VYBE?' : 'New to VYBE?'}{' '}
        <Link href={other} className="font-bold text-brand-2 hover:underline">
          {isUp ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </motion.div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  autoComplete,
  placeholder,
  trailing,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-faint">
        {label}
      </label>
      <div
        className={cx(
          'flex h-[52px] items-center rounded-2xl border bg-[var(--glass-thin)] pr-1.5 transition-all duration-200',
          error ? 'border-rose-500/60' : 'border-line focus-within:border-transparent focus-within:shadow-glow',
        )}
      >
        <input
          id={id}
          name={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          required
          className="h-full w-full min-w-0 bg-transparent px-4 text-[15px] font-medium text-ink outline-none placeholder:text-faint"
        />
        {trailing}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12.5px] font-semibold text-rose-500">
          {error}
        </p>
      )}
    </div>
  );
}
