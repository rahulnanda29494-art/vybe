'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { useTheme } from '@/components/shell/theme';
import { compact } from '@/lib/format';

/**
 * Chart colours are chosen per theme and validated for contrast against
 * that theme's surface (violet + blue). Each chart shows ONE measure, so
 * the chart title carries identity — never a second y-axis.
 */
const TOKENS = {
  dark: { a: '#9B6BFF', b: '#1E90D0', grid: 'rgba(255,255,255,0.06)', axis: '#6E6E80', ring: '#0F0F16' },
  light: { a: '#7C3AED', b: '#0284C7', grid: 'rgba(16,16,30,0.07)', axis: '#8E8E9E', ring: '#FFFFFF' },
};

function useChartTokens() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return { t: TOKENS[theme], mounted };
}

function Tip({ active, payload, label, unit }: TooltipProps<number, string> & { unit: string }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value ?? 0;
  return (
    <div className="glass rounded-xl px-3 py-2 shadow-lift">
      <p className="text-[11px] font-semibold text-faint">{label}</p>
      <p className="mt-0.5 text-[14px] font-extrabold tabular-nums text-ink">
        {v.toLocaleString()} <span className="text-[11px] font-semibold text-dim">{unit}</span>
      </p>
    </div>
  );
}

const axisProps = (color: string) => ({
  tickLine: false,
  axisLine: false,
  tick: { fill: color, fontSize: 11, fontWeight: 600 },
});

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="h-[220px] w-full">{children}</div>;
}

export function ViewsChart({ data }: { data: { day: string; views: number }[] }) {
  const { t, mounted } = useChartTokens();
  if (!mounted) return <Frame>{null}</Frame>;
  return (
    <Frame>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.a} stopOpacity={0.32} />
              <stop offset="100%" stopColor={t.a} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="day" {...axisProps(t.axis)} />
          <YAxis {...axisProps(t.axis)} tickFormatter={(v) => compact(v)} width={48} />
          <Tooltip
            content={<Tip unit="views" />}
            cursor={{ stroke: t.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="views"
            stroke={t.a}
            strokeWidth={2}
            fill="url(#viewsFill)"
            activeDot={{ r: 5, stroke: t.ring, strokeWidth: 2, fill: t.a }}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function WatchTimeChart({ data }: { data: { day: string; watch: number }[] }) {
  const { t, mounted } = useChartTokens();
  if (!mounted) return <Frame>{null}</Frame>;
  return (
    <Frame>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="day" {...axisProps(t.axis)} />
          <YAxis {...axisProps(t.axis)} tickFormatter={(v) => compact(v)} width={48} />
          <Tooltip content={<Tip unit="hours" />} cursor={{ fill: t.grid }} />
          <Bar dataKey="watch" fill={t.b} radius={[4, 4, 0, 0]} animationDuration={900} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function FollowersChart({ data }: { data: { week: string; followers: number }[] }) {
  const { t, mounted } = useChartTokens();
  if (!mounted) return <Frame>{null}</Frame>;
  return (
    <Frame>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis dataKey="week" {...axisProps(t.axis)} />
          <YAxis
            {...axisProps(t.axis)}
            domain={['dataMin - 40000', 'dataMax + 40000']}
            tickFormatter={(v) => compact(v)}
            width={52}
          />
          <Tooltip
            content={<Tip unit="followers" />}
            cursor={{ stroke: t.axis, strokeWidth: 1, strokeDasharray: '3 3' }}
          />
          <Line
            type="monotone"
            dataKey="followers"
            stroke={t.a}
            strokeWidth={2}
            dot={{ r: 4, fill: t.a, stroke: t.ring, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: t.a, stroke: t.ring, strokeWidth: 2 }}
            animationDuration={900}
          />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

/** Share of engagement — a ranked bar list reads faster than a pie. */
export function EngagementBars({ data }: { data: { name: string; value: number }[] }) {
  const { t, mounted } = useChartTokens();
  const max = Math.max(...data.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-4" aria-label="Engagement share">
      {data.map((d, i) => (
        <li key={d.name} className="group" title={`${d.name}: ${d.value}%`}>
          <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
            <span className="font-semibold text-dim">{d.name}</span>
            <span className="font-extrabold tabular-nums text-ink">{d.value}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--glass-thin)]">
            <div
              className="h-full rounded-full transition-[width] duration-1000 ease-vybe group-hover:opacity-85"
              style={{
                width: mounted ? `${(d.value / max) * 100}%` : '0%',
                background: t.a,
                transitionDelay: `${i * 90}ms`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
