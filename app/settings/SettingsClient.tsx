'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, CircleHelp, LogOut, Monitor, Moon, Shield, Sun, User } from 'lucide-react';
import { useTheme } from '@/components/shell/theme';
import { Avatar, Button } from '@/components/ui/primitives';
import { useAuth } from '@/components/shell/auth';
import { cx } from '@/lib/format';

export function SettingsClient() {
  const { theme, set } = useTheme();
  const { user, status, signOut } = useAuth();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Card icon={<User size={17} />} title="Account">
        {status === 'loading' ? (
          <div className="shimmer h-14 rounded-2xl bg-[var(--glass-thin)]" />
        ) : user ? (
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={user.name} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-[16px] font-extrabold text-ink">{user.name}</p>
              <p className="truncate text-[13px] text-faint">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" icon={<LogOut size={14} />} onClick={signOut}>
              Sign out
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-[14px] text-dim">Sign in to sync your likes, playlists and history.</p>
            <div className="flex gap-2">
              <Button variant="glass" size="sm" href="/signin?next=%2Fsettings">
                Sign in
              </Button>
              <Button variant="primary" size="sm" href="/signup?next=%2Fsettings">
                Create account
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card icon={theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />} title="Appearance">
        <div className="grid grid-cols-2 gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => set(t)}
              aria-pressed={theme === t}
              className={cx(
                'overflow-hidden rounded-2xl text-left transition-all duration-200 ease-vybe',
                theme === t ? 'ring-2 ring-brand-2' : 'ring-1 ring-[var(--line)] hover:ring-[var(--line-strong)]',
              )}
            >
              <div className={cx('flex h-20 gap-1.5 p-2.5', t === 'dark' ? 'bg-[#07070b]' : 'bg-[#f7f6f4]')}>
                <div className={cx('w-1/4 rounded-lg', t === 'dark' ? 'bg-[#16161f]' : 'bg-white')} />
                <div className="flex flex-1 flex-col gap-1.5">
                  <div className="h-1/2 rounded-lg bg-vybe opacity-80" />
                  <div className={cx('h-2 w-3/4 rounded', t === 'dark' ? 'bg-[#20202d]' : 'bg-[#e6e5ea]')} />
                </div>
              </div>
              <p className="flex items-center gap-2 px-3 py-2.5 text-[13px] font-bold capitalize text-ink">
                {t === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
                {t}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-faint">
          <Monitor size={12} /> Saved to this device.
        </p>
      </Card>

      <Card icon={<Bell size={17} />} title="Notifications">
        <Toggle label="New uploads from subscriptions" defaultOn />
        <Toggle label="When a creator goes live" defaultOn />
        <Toggle label="Replies and mentions" defaultOn />
        <Toggle label="Weekly recap email" />
      </Card>

      <Card icon={<Shield size={17} />} title="Privacy">
        <Toggle label="Keep my subscriptions private" />
        <Toggle label="Pause watch history" />
        <Toggle label="Personalised recommendations" defaultOn />
      </Card>

      <div id="help" className="xl:col-span-2">
        <Card icon={<CircleHelp size={17} />} title="Help">
          <p className="text-[13.5px] leading-relaxed text-dim">
            Shortcuts: <Kbd>/</Kbd> jump to search · <Kbd>↑</Kbd>/<Kbd>↓</Kbd> previous / next Short. With the
            player focused, YouTube’s own keys work: <Kbd>K</Kbd> play/pause · <Kbd>J</Kbd>/<Kbd>L</Kbd> skip 10s ·{' '}
            <Kbd>M</Kbd> mute · <Kbd>F</Kbd> fullscreen · <Kbd>C</Kbd> captions.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-tile p-5 sm:p-6">
      <h2 className="mb-5 flex items-center gap-2.5 font-display text-lg font-extrabold text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-vybe-soft text-brand-2">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Toggle({ label, defaultOn = false }: { label: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-[14px] font-medium text-ink">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', on ? 'bg-vybe' : 'bg-[var(--line-strong)]')}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 520, damping: 34 }}
          className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow', on ? 'right-1' : 'left-1')}
        />
      </button>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-grid h-6 min-w-6 place-items-center rounded-md border border-line-strong bg-[var(--glass-thin)] px-1.5 text-[11px] font-bold text-ink">
      {children}
    </kbd>
  );
}
