"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RESULT_STORAGE_KEY } from "@/lib/dosha/scoring";
import { DISCLAIMER, describe } from "@/lib/dosha/descriptions";
import type { DoshaResult, Scores } from "@/lib/dosha/types";

type StoredResult = {
  quiz_version: string;
  scores: Scores;
  primary_dosha: DoshaResult;
};

type Props = {
  loggedIn: boolean;
  hasConsent: boolean;
  autoSave: boolean;
};

const SAVE_PATH = "/result?save=1";

export default function ResultClient({ loggedIn, hasConsent, autoSave }: Props) {
  const router = useRouter();
  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const triedAutoSave = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RESULT_STORAGE_KEY);
      setResult(raw ? (JSON.parse(raw) as StoredResult) : null);
    } catch {
      setResult(null);
    }
    setLoaded(true);
  }, []);

  async function save() {
    if (!result) return;

    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent(SAVE_PATH)}`);
      return;
    }
    if (!hasConsent) {
      router.push(`/consent?next=${encodeURIComponent(SAVE_PATH)}`);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/dosha-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Schema के लिए consent: true चाहिए। यह तभी भेजा जाता है जब consent screen पर सहमति हो चुकी हो।
        body: JSON.stringify({
          quiz_version: result.quiz_version,
          scores: result.scores,
          primary_dosha: result.primary_dosha,
          consent: true,
        }),
      });

      if (res.status === 403) {
        // Consent अभी active नहीं है, इसलिए फिर से consent screen पर भेजें
        router.push(`/consent?next=${encodeURIComponent(SAVE_PATH)}`);
        return;
      }

      if (!res.ok) throw new Error("save_failed");

      router.push("/plan");
    } catch {
      setSaving(false);
      setError("अभी सेव नहीं हो पाया। इंटरनेट जाँचें और एक बार फिर दबाएँ। आपका result इस device पर सुरक्षित है।");
    }
  }

  // Login और consent के बाद बिना एक और tap के अपने-आप सेव करें
  useEffect(() => {
    if (autoSave && result && loggedIn && hasConsent && !triedAutoSave.current) {
      triedAutoSave.current = true;
      void save();
    }
    // save() हर render पर नए state के साथ बनता है, इसलिए इसे dependency में नहीं रखा
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, result, loggedIn, hasConsent]);

  if (!loaded) {
    return <p className="text-sm text-muted">लोड हो रहा है...</p>;
  }

  if (!result) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-semibold text-ink">पहले quiz पूरा करें</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          आपका result इस device पर नहीं मिला। सिर्फ़ 2 मिनट में quiz दोबारा ले सकते हैं।
        </p>
        <Link href="/quiz" className="btn-primary">
          Quiz शुरू करें
        </Link>
      </div>
    );
  }

  const view = describe(result.primary_dosha);

  const primaryLabel = saving
    ? "आपका plan बन रहा है..."
    : loggedIn && hasConsent
      ? "मेरा आज का plan देखें"
      : loggedIn
        ? "अनुमति देकर plan देखें"
        : "Login करके plan सेव करें";

  return (
    <div className="space-y-8 pb-40">
      <header className="space-y-2">
        <p className="eyebrow">आपकी प्रकृति</p>
        <h1 className="text-3xl font-semibold leading-tight text-brand">{view.title}</h1>
        <p className="text-[15px] leading-relaxed text-muted">{view.theme}</p>
      </header>

      <section className="card space-y-3">
        <h2 className="text-base font-semibold text-ink">आपकी खूबियाँ</h2>
        <ul className="space-y-2 text-[15px] text-ink">
          {view.traits.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="text-base font-semibold text-ink">संतुलन के लिए छोटे सुझाव</h2>
        <ul className="space-y-2 text-[15px] text-ink">
          {view.balance.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="notice">
        <p className="font-medium">आपका result इस device पर सुरक्षित है।</p>
        <p className="mt-1 text-muted">
          Login करने पर यह आपके account में जुड़ जाएगा, ताकि हर दिन का plan कहीं से भी दिखे।
        </p>
      </section>

      <p className="text-xs leading-relaxed text-muted">{DISCLAIMER}</p>

      <div className="text-center">
        <Link href="/quiz" className="btn-link">
          Quiz दोबारा लें
        </Link>
      </div>

      {/* नीचे sticky action bar: मुख्य कदम हमेशा पहुँच में */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
      >
        <div className="mx-auto max-w-md space-y-1 px-5 pt-3">
          {error ? (
            <p role="alert" className="error-box mb-2">
              {error}
            </p>
          ) : null}
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {primaryLabel}
          </button>
          {!loggedIn ? (
            <Link href="/today" className="btn-link w-full text-muted">
              बिना login के आज की सामान्य आदतें देखें →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}