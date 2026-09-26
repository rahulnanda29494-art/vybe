'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; set: (t: Theme) => void }>({
  theme: 'dark',
  toggle: () => {},
  set: () => {},
});

export const useTheme = () => useContext(ThemeCtx);

/** Runs before paint so the first frame is already the right theme. */
/* `?theme=light|dark` overrides for shareable previews and screenshots. */
export const themeBootScript = `(function(){var d=document.documentElement;try{var q=new URLSearchParams(location.search).get('theme');var t=(q==='light'||q==='dark')?q:(localStorage.getItem('vybe-theme')||'dark');if(t!=='light'&&t!=='dark')t='dark';d.classList.remove('dark','light');d.classList.add(t);}catch(e){d.classList.add('dark')}})();`;

function initialTheme(): Theme {
  const q = new URLSearchParams(window.location.search).get('theme');
  if (q === 'light' || q === 'dark') return q;
  try {
    const s = localStorage.getItem('vybe-theme');
    return s === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    setTheme(initialTheme());
  }, []);

  const set = useCallback((t: Theme) => {
    setTheme(t);
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(t);
    try {
      localStorage.setItem('vybe-theme', t);
    } catch {
      /* storage can be blocked — theme still applies for this session */
    }
  }, []);

  const toggle = useCallback(() => set(theme === 'dark' ? 'light' : 'dark'), [theme, set]);

  return <ThemeCtx.Provider value={{ theme, toggle, set }}>{children}</ThemeCtx.Provider>;
}
