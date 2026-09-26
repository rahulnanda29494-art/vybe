'use client';

import { ContinueCard } from '@/components/media/cards';
import { Rail } from '@/components/ui/Rail';
import { Section } from '@/components/ui/Section';
import { selectHistory, useLibrary } from '@/lib/library';

/** Real resume points from the viewer's watch history. Hidden until there is one. */
export function ContinueWatching() {
  const history = useLibrary(selectHistory);
  const resumable = history.filter((h) => h.duration > 0 && h.position > 5 && h.position / h.duration < 0.95).slice(0, 12);
  if (!resumable.length) return null;

  return (
    <Section title="Continue Watching" kicker="Pick up where you left off" href="/history">
      <Rail label="Continue watching" itemClass="w-[320px] sm:w-[368px]">
        {resumable.map((h) => (
          <ContinueCard key={h.id} entry={h} />
        ))}
      </Rail>
    </Section>
  );
}
