'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';

const THEME_KEY = 'sthamly:theme';
type Theme = 'light' | 'dark';

function readSavedTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

const MENU_ITEMS = [
  { href: '/quiz', label: 'Quiz दोबारा लें' },
  { href: '/consult/mine', label: 'मेरी consult bookings' },
  { href: '/plus', label: 'Plus सदस्यता' },
];

export default function MenuDrawer() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const saved = readSavedTheme();
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // private mode में save न हो तो भी theme चलेगा
    }
  }

  async function logout() {
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    window.location.href = '/';
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="मेनू खोलें"
        className="fixed right-4 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow"
        style={{
          top: 'calc(env(safe-area-inset-top) + 0.75rem)',
          background: 'var(--nav-bg)',
          color: 'var(--nav-active)',
          border: '1px solid var(--nav-line)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            aria-label="मेनू बंद करें"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside
            className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col gap-2 p-5 shadow-xl"
            style={{ background: 'var(--sheet-bg)', color: 'var(--text-main)' }}
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-lg font-semibold" style={{ color: 'var(--nav-active)' }}>Sthamly</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="बंद करें"
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ border: '1px solid var(--nav-line)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {MENU_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3 text-[15px]"
                style={{ border: '1px solid var(--nav-line)' }}
              >
                {item.label}
              </Link>
            ))}

            <button
              type="button"
              onClick={toggleTheme}
              className="mt-2 flex items-center justify-between rounded-xl px-4 py-3 text-[15px]"
              style={{ border: '1px solid var(--nav-line)' }}
            >
              <span>Dark mode</span>
              <span className="text-sm" style={{ color: 'var(--nav-active)' }}>
                {theme === 'dark' ? 'चालू' : 'बंद'}
              </span>
            </button>

            <div className="mt-auto">
              <button
                type="button"
                onClick={logout}
                className="w-full rounded-xl px-4 py-3 text-[15px] font-medium"
                style={{ background: 'var(--nav-active)', color: 'var(--nav-bg)' }}
              >
                लॉग आउट
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}