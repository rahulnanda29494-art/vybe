'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  CloudUpload,
  Film,
  Globe,
  Link2,
  Lock,
  PartyPopper,
  X,
} from 'lucide-react';
import { Art } from '@/components/media/Art';
import { Pill } from '@/components/ui/primitives';
import { CATEGORY_LABEL } from '@/lib/yt';
import type { CategoryKey } from '@/lib/types';
import { cx } from '@/lib/format';

const STEPS = ['Upload', 'Details', 'Visibility', 'Publish'] as const;
const THUMBS = [40, 41, 42];

type Visibility = 'public' | 'unlisted' | 'private';

export function UploadWizard({ author }: { author: string }) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [thumb, setThumb] = useState(THUMBS[0]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>(['ai', 'tutorial']);
  const [tagDraft, setTagDraft] = useState('');
  const [category, setCategory] = useState<CategoryKey>('coding');
  const [kids, setKids] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [schedule, setSchedule] = useState(false);
  const [when, setWhen] = useState('2026-09-20T18:00');
  const [published, setPublished] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  /* Simulated transfer — replace with the storage adapter's multipart upload. */
  useEffect(() => {
    if (!file || progress >= 100) return;
    const id = setTimeout(() => setProgress((p) => Math.min(100, p + 4 + ((p * 7) % 9))), 90);
    return () => clearTimeout(id);
  }, [file, progress]);

  const accept = (f: File | undefined) => {
    if (!f) return;
    setFile({ name: f.name, size: f.size });
    setProgress(0);
    setTitle((t) => t || f.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
  };

  const canNext =
    (step === 0 && progress >= 100) || (step === 1 && title.trim().length > 0) || step === 2;

  const addTag = () => {
    const t = tagDraft.trim().replace(/^#/, '').toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) setTags([...tags, t]);
    setTagDraft('');
  };

  if (published) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        className="glass relative mx-auto max-w-xl overflow-hidden rounded-panel p-10 text-center shadow-lift"
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 60% at 50% 0%, rgb(var(--c-brand-2)/.22), transparent 70%)' }}
        />
        {Array.from({ length: 14 }, (_, i) => (
          <motion.span
            key={i}
            initial={{ y: 0, x: 0, opacity: 1 }}
            animate={{ y: -120 - (i % 4) * 30, x: (i - 7) * 26, opacity: 0, rotate: i * 40 }}
            transition={{ duration: 1.3, ease: 'easeOut', delay: 0.1 }}
            className="absolute left-1/2 top-40 h-2 w-2 rounded-sm bg-vybe"
          />
        ))}
        <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-[26px] bg-vybe text-white shadow-glow">
          <PartyPopper size={32} />
        </div>
        <h2 className="relative mt-6 font-display text-[30px] font-extrabold text-ink">
          {schedule ? 'Scheduled.' : 'It’s live.'}
        </h2>
        <p className="relative mt-2 text-sm text-dim">
          <span className="font-bold text-ink">{title}</span>{' '}
          {schedule
            ? `goes out ${new Date(when).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}.`
            : 'is now on VYBE. Time to share it.'}
        </p>
        <div className="relative mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/studio"
            className="inline-flex h-12 items-center justify-center rounded-pill bg-vybe px-6 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            Back to Studio
          </Link>
          <button
            type="button"
            onClick={() => {
              setPublished(false);
              setStep(0);
              setFile(null);
              setProgress(0);
              setTitle('');
              setDescription('');
            }}
            className="inline-flex h-12 items-center justify-center rounded-pill border border-line-strong px-6 text-sm font-bold text-ink transition-colors hover:bg-[var(--glass-thin)]"
          >
            Upload another
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* stepper */}
      <ol className="mb-8 grid grid-cols-4 gap-2 sm:gap-3" aria-label="Upload progress">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s} aria-current={current ? 'step' : undefined}>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-thin)] ring-1 ring-inset ring-[var(--line)]">
                <motion.div
                  className="h-full bg-vybe"
                  initial={false}
                  animate={{ width: done ? '100%' : current ? '50%' : '0%' }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                <span
                  className={cx(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold transition-colors',
                    done && 'bg-vybe text-white',
                    current && 'bg-ink text-bg',
                    !done && !current && 'bg-[var(--glass-thin)] text-faint ring-1 ring-inset ring-[var(--line)]',
                  )}
                >
                  {done ? <Check size={12} strokeWidth={3} /> : String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={cx(
                    'hidden truncate text-[13px] font-bold sm:block',
                    current || done ? 'text-ink' : 'text-faint',
                  )}
                >
                  {s}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="glass overflow-hidden rounded-panel shadow-soft">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="p-5 sm:p-8"
          >
            {/* STEP 1 — upload */}
            {step === 0 && (
              <>
                {!file ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragging(false);
                      accept(e.dataTransfer.files?.[0]);
                    }}
                    className={cx(
                      'relative flex flex-col items-center justify-center overflow-hidden rounded-tile border-2 border-dashed px-6 py-16 text-center transition-all duration-300 ease-vybe sm:py-24',
                      dragging ? 'scale-[1.01] border-brand-2 bg-vybe-soft' : 'border-line-strong',
                    )}
                  >
                    <div
                      className="pointer-events-none absolute inset-0 opacity-60"
                      style={{ background: 'radial-gradient(50% 60% at 50% 40%, rgb(var(--c-brand-1)/.14), transparent 70%)' }}
                    />
                    <motion.div
                      animate={dragging ? { y: -8, scale: 1.08 } : { y: 0, scale: 1 }}
                      className="relative grid h-20 w-20 place-items-center rounded-[26px] bg-vybe text-white shadow-glow"
                    >
                      <CloudUpload size={34} />
                    </motion.div>
                    <h2 className="relative mt-6 font-display text-[26px] font-extrabold text-ink sm:text-[32px]">
                      Drop your video here
                    </h2>
                    <p className="relative mt-2 text-sm text-dim">MP4, MOV or WebM · up to 12 GB · 8K supported</p>
                    <button
                      type="button"
                      onClick={() => input.current?.click()}
                      className="relative mt-7 inline-flex h-12 items-center gap-2 rounded-pill bg-ink px-6 text-sm font-extrabold text-bg transition-transform duration-200 ease-vybe hover:-translate-y-0.5 active:scale-95"
                    >
                      <Film size={16} />
                      Choose a video
                    </button>
                    <button
                      type="button"
                      onClick={() => accept({ name: 'how-ai-agents-work-part-2.mp4', size: 1_840_000_000 } as File)}
                      className="relative mt-3 text-[12.5px] font-bold text-brand-2 hover:underline"
                    >
                      or try with a sample file
                    </button>
                    <input
                      ref={input}
                      type="file"
                      accept="video/*"
                      className="sr-only"
                      onChange={(e) => accept(e.target.files?.[0])}
                      aria-label="Choose a video file"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="relative aspect-video w-full overflow-hidden rounded-tile sm:w-[300px]">
                      <Art seed={thumb} className="h-full w-full" />
                      {progress < 100 && (
                        <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-sm">
                          <span className="font-display text-[34px] font-extrabold tabular-nums text-white">
                            {progress}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-display text-lg font-extrabold text-ink">{file.name}</p>
                          <p className="mt-0.5 text-[13px] text-faint">
                            {(file.size / 1_000_000_000).toFixed(2)} GB ·{' '}
                            {progress < 100 ? 'Uploading…' : 'Uploaded · processing HD in background'}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="Remove file"
                          onClick={() => {
                            setFile(null);
                            setProgress(0);
                          }}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-faint transition-colors hover:bg-[var(--glass-thin)] hover:text-ink"
                        >
                          <X size={17} />
                        </button>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--glass-thin)]">
                        <div className="h-full rounded-full bg-vybe transition-[width] duration-150" style={{ width: `${progress}%` }} />
                      </div>
                      {progress >= 100 && (
                        <p className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-ink">
                          <Check size={15} className="text-emerald-500" />
                          Ready — add the details next.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* STEP 2 — details */}
            {step === 1 && (
              <div className="grid grid-cols-1 gap-7 lg:grid-cols-[1fr_280px]">
                <div className="flex flex-col gap-5">
                  <Field label="Title" hint={`${title.length}/100`}>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 100))}
                      placeholder="Give it a title people will click"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Description" hint={`${description.length}/5000`}>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 5000))}
                      rows={5}
                      placeholder="Tell viewers what they’re about to watch"
                      className={cx(inputCls, 'h-auto resize-none py-3')}
                    />
                  </Field>
                  <Field label="Tags" hint={`${tags.length}/10`}>
                    <div className={cx(inputCls, 'flex h-auto min-h-12 flex-wrap items-center gap-1.5 py-2')}>
                      {tags.map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 rounded-pill bg-vybe-soft px-2.5 py-1 text-[12px] font-bold text-ink">
                          #{t}
                          <button
                            type="button"
                            aria-label={`Remove ${t}`}
                            onClick={() => setTags(tags.filter((x) => x !== t))}
                            className="text-faint hover:text-ink"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      <input
                        value={tagDraft}
                        onChange={(e) => setTagDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        onBlur={addTag}
                        placeholder="Add tag + Enter"
                        className="min-w-[120px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
                      />
                    </div>
                  </Field>
                  <Field label="Category">
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(CATEGORY_LABEL) as CategoryKey[]).map((c) => (
                        <Pill key={c} active={category === c} onClick={() => setCategory(c)}>
                          {CATEGORY_LABEL[c]}
                        </Pill>
                      ))}
                    </div>
                  </Field>
                </div>

                <div>
                  <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-faint">Thumbnail</p>
                  <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
                    {THUMBS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setThumb(t)}
                        aria-pressed={thumb === t}
                        aria-label={`Thumbnail option ${THUMBS.indexOf(t) + 1}`}
                        className={cx(
                          'relative aspect-video overflow-hidden rounded-xl transition-all duration-200 ease-vybe',
                          thumb === t ? 'ring-2 ring-brand-2 ring-offset-2 ring-offset-[rgb(var(--c-surface))]' : 'opacity-70 hover:opacity-100',
                        )}
                      >
                        <Art seed={t} className="h-full w-full" />
                        {thumb === t && (
                          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-vybe text-white">
                            <Check size={11} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
                    Auto-generated from your video. Custom upload coming soon.
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3 — visibility */}
            {step === 2 && (
              <div className="flex flex-col gap-7">
                <Field label="Audience">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <Choice active={!kids} onClick={() => setKids(false)} title="Not made for kids" body="Comments, notifications and personalised recommendations stay on." />
                    <Choice active={kids} onClick={() => setKids(true)} title="Made for kids" body="Some features like comments are turned off to protect younger viewers." />
                  </div>
                </Field>

                <Field label="Visibility">
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    <Choice active={visibility === 'public'} onClick={() => setVisibility('public')} icon={<Globe size={17} />} title="Public" body="Anyone can find and watch." />
                    <Choice active={visibility === 'unlisted'} onClick={() => setVisibility('unlisted')} icon={<Link2 size={17} />} title="Unlisted" body="Only people with the link." />
                    <Choice active={visibility === 'private'} onClick={() => setVisibility('private')} icon={<Lock size={17} />} title="Private" body="Only you." />
                  </div>
                </Field>

                <Field label="Schedule">
                  <div className="flex flex-wrap items-center gap-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={schedule}
                      onClick={() => setSchedule((s) => !s)}
                      className={cx(
                        'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300',
                        schedule ? 'bg-vybe' : 'bg-[var(--line-strong)]',
                      )}
                    >
                      <motion.span
                        layout
                        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
                        className={cx('absolute top-1 h-5 w-5 rounded-full bg-white shadow', schedule ? 'right-1' : 'left-1')}
                      />
                      <span className="sr-only">Schedule for later</span>
                    </button>
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <CalendarClock size={16} className="text-brand-2" />
                      Publish later
                    </span>
                    {schedule && (
                      <input
                        type="datetime-local"
                        value={when}
                        onChange={(e) => setWhen(e.target.value)}
                        className={cx(inputCls, 'w-auto')}
                        aria-label="Publish date and time"
                      />
                    )}
                  </div>
                </Field>
              </div>
            )}

            {/* STEP 4 — review */}
            {step === 3 && (
              <div className="grid grid-cols-1 gap-7 md:grid-cols-[320px_1fr]">
                <div>
                  <div className="relative aspect-video overflow-hidden rounded-tile shadow-lift">
                    <Art seed={thumb} className="h-full w-full" />
                  </div>
                  <p className="mt-3 line-clamp-2 font-display text-[17px] font-extrabold leading-snug text-ink">
                    {title || 'Untitled video'}
                  </p>
                  <p className="mt-1 text-[12.5px] text-faint">{author} · just now</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 self-start">
                  <Summary label="Category" value={CATEGORY_LABEL[category]} />
                  <Summary label="Audience" value={kids ? 'Made for kids' : 'General'} />
                  <Summary label="Visibility" value={visibility[0].toUpperCase() + visibility.slice(1)} />
                  <Summary
                    label="Goes live"
                    value={schedule ? new Date(when).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Immediately'}
                  />
                  <div className="col-span-2 rounded-2xl bg-[var(--glass-thin)] p-4 ring-1 ring-inset ring-[var(--line)]">
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Tags</dt>
                    <dd className="mt-2 flex flex-wrap gap-1.5">
                      {tags.length ? tags.map((t) => (
                        <span key={t} className="rounded-pill bg-vybe-soft px-2.5 py-1 text-[12px] font-bold text-ink">#{t}</span>
                      )) : <span className="text-sm text-faint">None</span>}
                    </dd>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 rounded-2xl bg-emerald-500/10 p-4 text-[13px] font-semibold text-ink">
                    <Check size={16} className="text-emerald-500" />
                    Checks complete — no copyright or policy issues found.
                  </div>
                </dl>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-8">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="inline-flex h-11 items-center gap-2 rounded-pill px-4 text-sm font-bold text-dim transition-colors hover:text-ink disabled:invisible"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
              className="inline-flex h-11 items-center gap-2 rounded-pill bg-vybe px-6 text-sm font-bold text-white shadow-[0_8px_22px_-10px_rgb(var(--c-brand-2))] transition-all duration-200 ease-vybe hover:-translate-y-px active:scale-95 disabled:pointer-events-none disabled:opacity-40"
            >
              Next
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setPublished(true)}
              className="inline-flex h-11 items-center gap-2 rounded-pill bg-vybe px-7 text-sm font-extrabold text-white shadow-glow transition-all duration-200 ease-vybe hover:-translate-y-px active:scale-95"
            >
              {schedule ? 'Schedule' : 'Publish'}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'h-12 w-full rounded-2xl border border-line bg-[var(--glass-thin)] px-4 text-[14.5px] font-medium text-ink outline-none transition-all placeholder:text-faint focus:border-transparent focus:shadow-glow';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">{label}</span>
        {hint && <span className="text-[11px] tabular-nums text-faint">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  title,
  body,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'relative rounded-2xl p-4 text-left transition-all duration-200 ease-vybe',
        active
          ? 'bg-vybe-soft ring-2 ring-inset ring-brand-2'
          : 'bg-[var(--glass-thin)] ring-1 ring-inset ring-[var(--line)] hover:ring-[var(--line-strong)]',
      )}
    >
      <span className="flex items-center gap-2 text-[14px] font-extrabold text-ink">
        {icon && <span className={active ? 'text-brand-2' : 'text-faint'}>{icon}</span>}
        {title}
      </span>
      <span className="mt-1 block text-[12.5px] leading-relaxed text-dim">{body}</span>
      {active && (
        <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-vybe text-white">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[var(--glass-thin)] p-4 ring-1 ring-inset ring-[var(--line)]">
      <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{label}</dt>
      <dd className="mt-1 text-[14px] font-extrabold text-ink">{value}</dd>
    </div>
  );
}
