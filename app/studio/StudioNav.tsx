'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cx } from '@/lib/format';

const LINKS = [
  { label: 'Dashboard', href: '/studio' },
  { label: 'Upload', href: '/studio/upload' },
];

export function StudioNav() {
  const pathname = usePathname();
  return (
    <div className="glass mb-7 inline-flex rounded-pill p-1">
      {LINKS.map((l) => {
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'relative rounded-pill px-4 py-2 text-[13px] font-bold transition-colors',
              active ? 'text-white' : 'text-dim hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId="studio-nav"
                transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-pill bg-vybe"
              />
            )}
            {l.label}
          </Link>
        );
      })}
    </div>
  );
}
