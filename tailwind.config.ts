import type { Config } from 'tailwindcss';

/**
 * VYBE design system.
 * Every colour resolves to a CSS variable, so the whole product can be
 * re-themed from `app/globals.css` without touching a single component.
 */
const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elev: 'rgb(var(--c-elev) / <alpha-value>)',
        raise: 'rgb(var(--c-raise) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        dim: 'rgb(var(--c-dim) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        brand: {
          1: 'rgb(var(--c-brand-1) / <alpha-value>)',
          2: 'rgb(var(--c-brand-2) / <alpha-value>)',
          3: 'rgb(var(--c-brand-3) / <alpha-value>)',
        },
        electric: 'rgb(var(--c-electric) / <alpha-value>)',
        live: 'rgb(var(--c-live) / <alpha-value>)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        glass: 'var(--glass)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      borderRadius: {
        card: '20px',
        tile: '24px',
        panel: '28px',
        pill: '999px',
      },
      boxShadow: {
        soft: '0 2px 8px -2px var(--shadow-1), 0 12px 32px -12px var(--shadow-2)',
        lift: '0 8px 24px -6px var(--shadow-1), 0 28px 64px -20px var(--shadow-2)',
        glow: '0 0 0 1px var(--line-strong), 0 18px 48px -18px rgb(var(--c-brand-1) / 0.55)',
        inset: 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      backgroundImage: {
        vybe: 'linear-gradient(103deg, rgb(var(--c-brand-1)) 0%, rgb(var(--c-brand-2)) 52%, rgb(var(--c-brand-3)) 100%)',
        'vybe-soft':
          'linear-gradient(103deg, rgb(var(--c-brand-1) / 0.18) 0%, rgb(var(--c-brand-2) / 0.16) 52%, rgb(var(--c-brand-3) / 0.14) 100%)',
        'vybe-electric':
          'linear-gradient(120deg, rgb(var(--c-electric)) 0%, rgb(var(--c-brand-1)) 48%, rgb(var(--c-brand-2)) 100%)',
        shimmer:
          'linear-gradient(90deg, transparent 0%, var(--shimmer) 45%, var(--shimmer) 55%, transparent 100%)',
      },
      transitionTimingFunction: {
        vybe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgb(var(--c-live) / 0.55)' },
          '70%': { boxShadow: '0 0 0 10px rgb(var(--c-live) / 0)' },
          '100%': { boxShadow: '0 0 0 0 rgb(var(--c-live) / 0)' },
        },
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -3%, 0) scale(1.08)' },
        },
        rise: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'none' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        float: 'float 6s ease-in-out infinite',
        pulseRing: 'pulseRing 2s infinite',
        drift: 'drift 18s ease-in-out infinite',
        rise: 'rise 0.4s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
