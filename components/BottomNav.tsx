'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import MenuDrawer from './MenuDrawer';

const svgProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const ICONS: Record<string, ReactNode> = {
  today: (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  symptoms: (
    <svg {...svgProps}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  consult: (
    <svg {...svgProps}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="M22 8l-6 4 6 4V8z" />
    </svg>
  ),
  profile: (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
  ask: (
    <svg {...svgProps} width={26} height={26}>
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
    </svg>
  ),
};

const TABS = [
  { href: '/plan', label: 'आज', icon: 'today' },
  { href: '/track', label: 'लक्षण', icon: 'symptoms' },
  { href: '/consult', label: 'Consult', icon: 'consult' },
  { href: '/profile', label: 'प्रोफ़ाइल', icon: 'profile' },
];

export default function BottomNav() {
  const pathname = usePathname() ?? '';

  useEffect(() => {
    // page के नीचे जगह छोड़ें ताकि nav के पीछे content न छुपे
    document.body.classList.add('has-bottom-nav');
    return () => document.body.classList.remove('has-bottom-nav');
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav
        aria-label="मुख्य मेनू"
        className="fixed inset-x-0 bottom-0 z-40 border-t"
        style={{
          background: 'var(--nav-bg)',
          borderColor: 'var(--nav-line)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {TABS.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium active:scale-95"
                style={{ color: active ? 'var(--nav-active)' : 'var(--nav-ink)' }}
              >
                {ICONS[t.icon]}
                <span>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* दाईं ओर floating "पूछें" button */}
      <Link
        href="/ask"
        aria-label="पूछें"
        className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg active:scale-95"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom) + 4.1rem)',
          background: 'var(--nav-active)',
          color: 'var(--nav-bg)',
        }}
      >
        {ICONS.ask}
      </Link>

      <MenuDrawer />
    </>
  );
}