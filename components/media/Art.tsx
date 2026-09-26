import { cx } from '@/lib/format';

/**
 * Procedural key art.
 *
 * Every thumbnail, avatar and cover in VYBE is generated from a seed, so the
 * product ships with a coherent art direction and never shows a broken image.
 * Swap this component for <Image /> when real media is wired up — the API
 * (seed + aspect) stays the same.
 */

type Palette = { a: string; b: string; c: string };

const PALETTES: Palette[] = [
  { a: '#8B4AFF', b: '#EC4899', c: '#1B0B33' }, // signature
  { a: '#38BDF8', b: '#8B4AFF', c: '#06122B' }, // electric
  { a: '#22D3EE', b: '#2563EB', c: '#04141F' }, // deep sea
  { a: '#FB923C', b: '#EC4899', c: '#2A0A1E' }, // ember
  { a: '#A3E635', b: '#14B8A6', c: '#04231D' }, // acid
  { a: '#F472B6', b: '#7C3AED', c: '#210B2E' }, // orchid
  { a: '#FCD34D', b: '#F97316', c: '#2B1203' }, // sunbeam
  { a: '#818CF8', b: '#38BDF8', c: '#0B1030' }, // periwinkle
  { a: '#F43F5E', b: '#7C3AED', c: '#26071C' }, // rose noir
  { a: '#2DD4BF', b: '#8B4AFF', c: '#05201F' }, // mint haze
  { a: '#E879F9', b: '#38BDF8', c: '#1A0A2E' }, // vapour
  { a: '#FDE68A', b: '#EC4899', c: '#2B0F1C' }, // peach
  { a: '#60A5FA', b: '#C084FC', c: '#0A1128' }, // cobalt
  { a: '#34D399', b: '#3B82F6', c: '#05231C' }, // spring
  { a: '#FB7185', b: '#FBBF24', c: '#2B0B12' }, // heat
  { a: '#C084FC', b: '#22D3EE', c: '#150B2B' }, // nebula
];

const MOTIFS = 6;

export interface ArtProps {
  seed: number;
  className?: string;
  /** Renders the motif larger/simpler — for hero and cover use. */
  scale?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

export function Art({ seed, className, scale = 'md', children }: ArtProps) {
  const p = PALETTES[seed % PALETTES.length];
  const motif = seed % MOTIFS;
  const rot = (seed * 37) % 360;
  const id = `a${seed}`;

  return (
    <div
      className={cx('isolate overflow-hidden grain', positioned(className), className)}
      style={{ backgroundColor: p.c }}
      aria-hidden
    >
      {/* base wash */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 100% at ${20 + (seed % 5) * 12}% ${
            15 + (seed % 3) * 20
          }%, ${p.a}CC 0%, transparent 58%),
          radial-gradient(110% 90% at ${85 - (seed % 4) * 14}% ${80 - (seed % 3) * 18}%, ${p.b}B8 0%, transparent 60%),
          linear-gradient(${rot}deg, ${p.c} 0%, ${p.c}00 70%)`,
        }}
      />

      {/* motif */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 225"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity={scale === 'lg' ? 0.5 : 0.42} />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.04" />
          </linearGradient>
          <filter id={`${id}b`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={scale === 'lg' ? 14 : 8} />
          </filter>
        </defs>

        <g stroke={`url(#${id}g)`} fill="none" strokeWidth={scale === 'lg' ? 1.6 : 1.1}>
          {motif === 0 &&
            /* concentric rings */
            [26, 52, 78, 104, 130, 156].map((r, i) => (
              <circle key={r} cx={300 - i * 6} cy={60 + i * 4} r={r} opacity={1 - i * 0.12} />
            ))}

          {motif === 1 &&
            /* sound waves */
            Array.from({ length: 9 }, (_, i) => (
              <path
                key={i}
                d={`M -20 ${40 + i * 20} Q 100 ${10 + i * 18 + (seed % 30)} 200 ${
                  46 + i * 19
                } T 420 ${30 + i * 21}`}
                opacity={1 - i * 0.09}
              />
            ))}

          {motif === 2 && (
            /* perspective grid */
            <g opacity="0.85">
              {Array.from({ length: 14 }, (_, i) => (
                <line key={`v${i}`} x1={i * 32 - 40} y1="225" x2={200 - (7 - i) * 8} y2="80" />
              ))}
              {Array.from({ length: 7 }, (_, i) => (
                <line key={`h${i}`} x1="-20" y1={90 + i * i * 3.4} x2="420" y2={90 + i * i * 3.4} />
              ))}
            </g>
          )}

          {motif === 3 &&
            /* orbit arcs */
            [0, 1, 2, 3].map((i) => (
              <ellipse
                key={i}
                cx="200"
                cy="112"
                rx={70 + i * 42}
                ry={26 + i * 16}
                transform={`rotate(${rot + i * 24} 200 112)`}
                opacity={0.9 - i * 0.18}
              />
            ))}

          {motif === 4 &&
            /* radial rays */
            Array.from({ length: 22 }, (_, i) => {
              const ang = ((i * 360) / 22 + rot) * (Math.PI / 180);
              // Rounded so server and client markup match exactly (no hydration drift).
              const r = (n: number) => Math.round(n * 100) / 100;
              return (
                <line
                  key={i}
                  x1={r(200 + Math.cos(ang) * 40)}
                  y1={r(112 + Math.sin(ang) * 40)}
                  x2={r(200 + Math.cos(ang) * 260)}
                  y2={r(112 + Math.sin(ang) * 260)}
                  opacity={i % 3 === 0 ? 0.75 : 0.3}
                />
              );
            })}

          {motif === 5 &&
            /* stacked chevrons */
            Array.from({ length: 10 }, (_, i) => (
              <path
                key={i}
                d={`M -20 ${180 - i * 22} L 200 ${100 - i * 20} L 420 ${190 - i * 23}`}
                opacity={0.9 - i * 0.08}
              />
            ))}
        </g>

        {/* soft light blob for depth */}
        <circle
          cx={seed % 2 ? 320 : 90}
          cy={seed % 3 ? 50 : 180}
          r="70"
          fill={p.a}
          opacity="0.55"
          filter={`url(#${id}b)`}
        />
      </svg>

      {/* vignette + legibility scrim */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-black/20" />

      {children}
    </div>
  );
}

/**
 * Callers often pass `absolute inset-0`; adding `relative` as well would win
 * in Tailwind's cascade and collapse the element. Only default when unset.
 */
function positioned(className?: string) {
  return /\b(absolute|fixed|sticky)\b/.test(className ?? '') ? undefined : 'relative';
}

/** Small square variant for avatars — same seed system, simpler render. */
export function ArtAvatar({ seed, className }: { seed: number; className?: string }) {
  const p = PALETTES[seed % PALETTES.length];
  return (
    <div
      className={cx('overflow-hidden', positioned(className), className)}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${p.a} 0%, ${p.b} 55%, ${p.c} 100%)`,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background: `conic-gradient(from ${(seed * 47) % 360}deg, transparent 0deg, rgba(255,255,255,.28) 90deg, transparent 200deg)`,
        }}
      />
    </div>
  );
}
