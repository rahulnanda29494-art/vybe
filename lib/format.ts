export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${trim(n / 1000)}K`;
  if (n < 1_000_000_000) return `${trim(n / 1_000_000)}M`;
  return `${trim(n / 1_000_000_000)}B`;
}

function trim(v: number): string {
  const s = v < 10 ? v.toFixed(1) : Math.round(v).toString();
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

export function views(n: number): string {
  return `${compact(n)} views`;
}

/** "4 hours ago" from an hours-ago offset — keeps sample data deterministic. */
export function ago(hours: number): string {
  if (hours < 1) return 'just now';
  if (hours < 24) return `${Math.round(hours)} hour${hours < 2 ? '' : 's'} ago`;
  const d = Math.round(hours / 24);
  if (d < 7) return `${d} day${d < 2 ? '' : 's'} ago`;
  if (d < 30) return `${Math.round(d / 7)} week${d < 14 ? '' : 's'} ago`;
  if (d < 365) return `${Math.round(d / 30)} month${d < 60 ? '' : 's'} ago`;
  return `${Math.round(d / 365)} year${d < 730 ? '' : 's'} ago`;
}

export function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}

/** Word-start match: "ai" finds "AI agents" but not "explained". */
export function matchesTerm(text: string, term: string): boolean {
  const t = term.trim();
  if (!t) return true;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}`, 'iu').test(text);
}

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** Stable 32-bit hash — used to derive deterministic key art from an id. */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}
