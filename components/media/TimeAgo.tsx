'use client';

import { ago } from '@/lib/format';

/**
 * Relative time. Server and client clocks differ by the render gap, so the
 * text is allowed to settle on hydration rather than raising a mismatch.
 */
export function TimeAgo({ iso }: { iso?: string }) {
  if (!iso) return null;
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 3_600_000);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {ago(hours)}
    </time>
  );
}
