'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const DOSHAS = [
  { name: 'Vata', hi: 'वात', line: 'हल्का और रचनात्मक' },
  { name: 'Pitta', hi: 'पित्त', line: 'ऊर्जावान और फोकस' },
  { name: 'Kapha', hi: 'कफ', line: 'शांत और स्थिर' },
];

export default function LandingPage() {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Login के बाद ?code= यहाँ आए तो callback पर भेज दें
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('code')) {
        setRedirecting(true);
        window.location.replace(`/auth/callback${window.location.search}`);
      }
    } catch {
      // URL न पढ़ सकें तो landing ही दिखेगा
    }
  }, []);

  if (redirecting) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-canvas">
        <p className="text-muted">लॉग इन हो रहा है...</p>
      </div>
    );
  }

  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 pb-36 pt-10">
      <header className="flex items-center justify-between">
        <span className="wordmark text-2xl">Sthamly</span>
        <Link href="/login" className="btn-link">
          लॉग इन
        </Link>
      </header>

      <section className="mt-16 space-y-3">
        <h1 className="text-4xl font-semibold leading-tight text-ink">अपनी प्रकृति जानें</h1>
        <p className="text-lg text-muted">2 मिनट में। रोज़ का सरल plan।</p>
      </section>

      <section className="mt-12 space-y-3">
        {DOSHAS.map((d) => (
          <div key={d.name} className="card flex items-center justify-between p-4">
            <span className="font-semibold text-ink">
              {d.name} <span className="font-normal text-muted">· {d.hi}</span>
            </span>
            <span className="text-sm text-muted">{d.line}</span>
          </div>
        ))}
      </section>

      <p className="mt-10 text-xs text-muted">सिर्फ़ wellness के लिए। medical test नहीं।</p>

      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <div className="mx-auto max-w-md space-y-1 px-5 pt-3">
          <Link href="/quiz" className="btn-primary">
            शुरू करें
          </Link>
          <Link href="/today" className="btn-link w-full text-muted">
            पहले आज की आदतें देखें
          </Link>
        </div>
      </div>
    </main>
  );
}