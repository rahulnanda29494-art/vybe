'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock3, Mic, Search, TrendingUp, WandSparkles, X } from 'lucide-react';
import { Avatar, Verified } from '@/components/ui/primitives';
import { compact, cx } from '@/lib/format';

interface SuggestChannel {
  id: string;
  title: string;
  handle?: string;
  avatar?: string;
  subscribers?: number;
}

const TRENDING = ['ai news', 'tiny desk concert', 'nba highlights', 'game trailer', 'street food'];
const RECENT_KEY = 'vybe-recent-searches';

function readRecent(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 8) : [];
  } catch {
    return [];
  }
}
function writeRecent(list: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 8)));
  } catch {
    /* storage blocked — recent searches just won't persist */
  }
}

/** Google-style: what you typed stays regular, the completion is bold. */
function Completion({ text, typed }: { text: string; typed: string }) {
  const t = typed.trim().toLowerCase();
  if (t && text.toLowerCase().startsWith(t)) {
    return (
      <>
        <span className="font-normal">{text.slice(0, t.length)}</span>
        <span className="font-bold text-ink">{text.slice(t.length)}</span>
      </>
    );
  }
  return <span className="font-medium">{text}</span>;
}

/* Web Speech API — present in Chromium/Safari, absent elsewhere. */
type SpeechCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
  start: () => void;
};

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [listening, setListening] = useState(false);
  const [remote, setRemote] = useState<{ terms: string[]; channels: SuggestChannel[] }>({ terms: [], channels: [] });
  const [recent, setRecent] = useState<string[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  useEffect(() => setRecent(readRecent()), []);

  // Keep the box in sync with the results page (deep links, back/forward).
  useEffect(() => {
    if (pathname === '/search') setQ(new URLSearchParams(window.location.search).get('q') ?? '');
  }, [pathname]);

  // Debounced typeahead against /api/suggest (cached feeds — no quota cost).
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setRemote({ terms: [], channels: [] });
      return;
    }
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { terms: [], channels: [] }))
        .then(setRemote)
        .catch(() => {});
    }, 160);
    return () => {
      clearTimeout(id);
      ctrl.abort();
    };
  }, [q]);

  const showingRecent = !q.trim() && recent.length > 0;
  const terms = q.trim() ? remote.terms : showingRecent ? recent : TRENDING;
  const people = q.trim() ? remote.channels : [];
  const flat = [...terms, ...people.map((p) => `@${p.handle ?? p.id}`)];
  // Multi-word queries get an explicit "Ask VYBE AI" row — descriptions rarely have Google completions.
  const askAi = q.trim().split(/\s+/).filter(Boolean).length >= 3;

  const goAi = () => {
    const term = q.trim();
    if (!term) return;
    setOpen(false);
    input.current?.blur();
    const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())];
    setRecent(next);
    writeRecent(next);
    router.push(`/search?q=${encodeURIComponent(term)}&ai=1`);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        input.current?.focus();
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const go = (term: string) => {
    setOpen(false);
    setActive(-1);
    input.current?.blur();
    if (term.startsWith('@')) {
      router.push(`/channel/${encodeURIComponent(term.slice(1))}`);
      return;
    }
    setQ(term);
    const next = [term, ...recent.filter((r) => r.toLowerCase() !== term.toLowerCase())];
    setRecent(next);
    writeRecent(next);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const voice = () => {
    const w = window as unknown as { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      input.current?.focus();
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = e.results[0]?.[0]?.transcript ?? '';
      if (text) {
        setQ(text);
        go(text);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = active >= 0 ? flat[active] : q.trim();
      if (pick) go(pick);
    }
  };

  return (
    <div ref={wrap} className={cx('relative w-full', className)}>
      <div
        className={cx(
          'glass group flex h-12 items-center gap-2.5 rounded-pill px-2 pl-5 transition-all duration-300 ease-vybe',
          open && 'border-transparent shadow-glow',
        )}
      >
        <Search size={18} className={cx('shrink-0 transition-colors', open ? 'text-brand-2' : 'text-faint')} />
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="What do you want to vibe with?"
          aria-label="Search VYBE"
          aria-expanded={open}
          aria-autocomplete="list"
          role="combobox"
          aria-controls="vybe-suggestions"
          aria-activedescendant={active >= 0 ? `sugg-${active}` : undefined}
          className="h-full w-full min-w-0 bg-transparent text-[15px] font-medium text-ink outline-none placeholder:text-faint"
        />
        {q && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQ('');
              input.current?.focus();
            }}
            className="grid h-8 w-8 place-items-center rounded-full text-faint transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
          >
            <X size={15} />
          </button>
        )}
        <kbd className="hidden h-5 select-none items-center rounded-md border border-line px-1.5 text-[10px] font-bold text-faint lg:flex">
          /
        </kbd>
        <button
          type="button"
          aria-label={listening ? 'Listening…' : 'Search by voice'}
          onClick={voice}
          className={cx(
            'relative grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all duration-200 ease-vybe',
            listening ? 'bg-vybe text-white' : 'text-dim hover:bg-[var(--glass-thin)] hover:text-ink',
          )}
        >
          {listening && <span className="absolute inset-0 animate-ping rounded-full bg-vybe opacity-40" />}
          <Mic size={17} className="relative" />
        </button>
      </div>

      <AnimatePresence>
        {open && (flat.length > 0 || askAi) && (
          <motion.div
            id="vybe-suggestions"
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass-menu absolute left-0 right-0 top-[calc(100%+10px)] z-50 overflow-hidden rounded-tile p-2 shadow-lift"
          >
            {askAi && (
              <button
                type="button"
                onClick={goAi}
                className="mb-1 flex w-full items-center gap-3 rounded-xl bg-vybe-soft px-3 py-2.5 text-left text-sm transition-colors hover:brightness-110"
              >
                <WandSparkles size={15} className="shrink-0 text-brand-2" />
                <span className="min-w-0 flex-1 truncate text-dim">
                  <span className="font-bold text-ink">Ask VYBE AI</span> — find “{q.trim()}”
                </span>
              </button>
            )}
            {!q.trim() && (
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
                {showingRecent ? 'Recent searches' : 'Try searching'}
              </p>
            )}
            {terms.map((t, i) => (
              <button
                key={t}
                id={`sugg-${i}`}
                role="option"
                aria-selected={active === i}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(t)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                  active === i ? 'bg-[var(--glass-thin)] text-ink' : 'text-dim hover:text-ink',
                )}
              >
                {q.trim() ? (
                  <Search size={15} className="shrink-0 text-faint" />
                ) : showingRecent ? (
                  <Clock3 size={15} className="shrink-0 text-faint" />
                ) : (
                  <TrendingUp size={15} className="shrink-0 text-brand-2" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  <Completion text={t} typed={q} />
                </span>
                {showingRecent && (
                  <span
                    role="button"
                    tabIndex={-1}
                    aria-label={`Remove ${t} from recent searches`}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = recent.filter((r) => r !== t);
                      setRecent(next);
                      writeRecent(next);
                    }}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-faint hover:bg-[var(--glass-thin)] hover:text-ink"
                  >
                    <X size={13} />
                  </span>
                )}
              </button>
            ))}

            {people.length > 0 && (
              <>
                <p className="px-3 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-[0.18em] text-faint">Channels</p>
                {people.map((c, i) => {
                  const idx = terms.length + i;
                  return (
                    <button
                      key={c.id}
                      id={`sugg-${idx}`}
                      role="option"
                      aria-selected={active === idx}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => go(`@${c.handle ?? c.id}`)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                        active === idx && 'bg-[var(--glass-thin)]',
                      )}
                    >
                      <Avatar src={c.avatar} name={c.title} size={32} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-sm font-semibold text-ink">
                          <span className="truncate">{c.title}</span>
                          <Verified size={13} />
                        </span>
                        <span className="block text-xs text-faint">
                          {c.subscribers ? `${compact(c.subscribers)} subscribers` : c.handle ? `@${c.handle}` : 'YouTube channel'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
