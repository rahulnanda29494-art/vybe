import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { sessionUser } from '@/server/auth/session';
import Link from 'next/link';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock3,
  DollarSign,
  Eye,
  Heart,
  MessageCircle,
  Upload,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/shell/AppShell';
import { Art } from '@/components/media/Art';
import { Avatar } from '@/components/ui/primitives';
import {
  EngagementBars,
  FollowersChart,
  ViewsChart,
  WatchTimeChart,
} from '@/components/studio/Charts';
import { StudioNav } from './StudioNav';
import {
  studioComments,
  studioEngagement,
  studioFollowerSeries,
  studioTopVideos,
  studioViewSeries,
} from '@/lib/data';
import { ago, compact, cx } from '@/lib/format';

export const metadata: Metadata = { title: 'Creator Studio' };

const KPIS = [
  { label: 'Views', value: '494.9K', delta: 18.4, icon: Eye, note: 'last 7 days' },
  { label: 'Watch time', value: '37.9K hrs', delta: 12.1, icon: Clock3, note: 'last 7 days' },
  { label: 'Followers', value: '3.24M', delta: 2.5, icon: Users, note: '+78K this week' },
  { label: 'Likes', value: '61.2K', delta: -3.2, icon: Heart, note: 'last 7 days' },
  { label: 'Revenue', value: '$12,480', delta: 9.6, icon: DollarSign, note: 'estimated' },
];

export default async function StudioPage() {
  const user = await sessionUser();
  if (!user) redirect('/signin?next=%2Fstudio');
  const first = user.name.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <AppShell>
      <StudioNav />

      {/* greeting */}
      <div className="relative mb-8 overflow-hidden rounded-panel">
        <Art seed={3} scale="lg" className="absolute inset-0 h-full w-full animate-drift" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/20" />
        <div className="relative flex flex-wrap items-end justify-between gap-5 p-6 sm:p-9">
          <div className="flex items-center gap-4">
            <span className="block rounded-full bg-vybe p-[2.5px]">
              <Avatar name={user.name} size={60} className="ring-[3px] ring-black/60" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">
                Creator Studio
              </p>
              <h1 className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-tight text-white sm:text-[36px]">
                {greeting}, {first}
              </h1>
              <p className="mt-2 text-[13px] text-white/70">
                Your channel grew <span className="font-bold text-white">18%</span> this week. Keep it going.
              </p>
            </div>
          </div>
          <Link
            href="/studio/upload"
            className="inline-flex h-12 items-center gap-2 rounded-pill bg-white px-6 text-sm font-extrabold text-black transition-transform duration-200 ease-vybe hover:-translate-y-0.5 active:scale-95"
          >
            <Upload size={16} />
            Upload video
          </Link>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {KPIS.map((k, i) => {
          const up = k.delta >= 0;
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className={cx(
                'glass group relative animate-rise overflow-hidden rounded-tile p-4 transition-all duration-300 ease-vybe hover:-translate-y-0.5 hover:shadow-lift sm:p-5',
                i === 4 && 'col-span-2 md:col-span-1',
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-faint">
                  {k.label}
                </span>
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-vybe-soft text-brand-2">
                  <Icon size={15} />
                </span>
              </div>
              <p className="mt-3 font-display text-[26px] font-extrabold leading-none tracking-tight tabular-nums text-ink sm:text-[30px]">
                {k.value}
              </p>
              <p className="mt-2.5 flex items-center gap-1.5 text-[12px]">
                <span
                  className={cx(
                    'inline-flex items-center gap-0.5 rounded-pill px-1.5 py-0.5 font-bold',
                    up ? 'bg-emerald-500/12 text-ink' : 'bg-rose-500/12 text-ink',
                  )}
                >
                  {up ? (
                    <ArrowUpRight size={12} className="text-emerald-500" aria-label="up" />
                  ) : (
                    <ArrowDownRight size={12} className="text-rose-500" aria-label="down" />
                  )}
                  {Math.abs(k.delta)}%
                </span>
                <span className="text-faint">{k.note}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* charts */}
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Views" subtitle="Daily views, last 7 days" total="494.9K">
          <ViewsChart data={studioViewSeries} />
        </ChartCard>
        <ChartCard title="Watch time" subtitle="Hours watched per day" total="37.9K hrs">
          <WatchTimeChart data={studioViewSeries} />
        </ChartCard>
        <ChartCard title="Followers" subtitle="Total followers, last 6 weeks" total="3.24M">
          <FollowersChart data={studioFollowerSeries} />
        </ChartCard>
        <ChartCard title="Engagement" subtitle="Share of interactions this week" total="148K">
          <div className="pt-2">
            <EngagementBars data={studioEngagement} />
          </div>
        </ChartCard>
      </div>

      {/* content + comments */}
      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="glass rounded-tile p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-extrabold text-ink">Top content</h2>
            <span className="text-[12px] font-semibold text-faint">Last 28 days</span>
          </div>
          <div className="flex flex-col">
            {studioTopVideos.map((v, i) => (
              <div
                key={v.id}
                className="group flex items-center gap-4 rounded-2xl p-2 transition-colors hover:bg-[var(--glass-thin)]"
              >
                <span className="w-5 text-center font-display text-[15px] font-extrabold text-faint">
                  {i + 1}
                </span>
                <div className="relative h-[54px] w-[96px] shrink-0 overflow-hidden rounded-xl">
                  <Art seed={v.art} className="h-full w-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13.5px] font-bold text-ink group-hover:text-brand-2">
                    {v.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-faint">{ago(v.hoursAgo)}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[13px] font-extrabold tabular-nums text-ink">{compact(v.views)}</p>
                  <p className="text-[11px] text-faint">views</p>
                </div>
                <div className="hidden text-right md:block">
                  <p className="text-[13px] font-extrabold tabular-nums text-ink">{compact(v.likes)}</p>
                  <p className="text-[11px] text-faint">likes</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-tile p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-ink">
              <MessageCircle size={17} className="text-brand-2" />
              Latest comments
            </h2>
          </div>
          <div className="flex flex-col gap-4">
            {studioComments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar name={c.author} size={34} />
                <div className="min-w-0">
                  <p className="text-[12.5px] font-bold text-ink">
                    @{c.handle} <span className="font-medium text-faint">· {ago(c.hoursAgo)}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[13px] leading-relaxed text-dim">{c.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ChartCard({
  title,
  subtitle,
  total,
  children,
}: {
  title: string;
  subtitle: string;
  total: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-tile p-5" aria-label={title}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-ink">{title}</h2>
          <p className="mt-0.5 text-[12px] text-faint">{subtitle}</p>
        </div>
        <p className="font-display text-xl font-extrabold tabular-nums text-ink">{total}</p>
      </div>
      {children}
    </section>
  );
}
