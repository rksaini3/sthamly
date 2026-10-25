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
        body: JSON.stringify({
          quiz_version: result.quiz_version,
          scores: result.scores,
          primary_dosha: result.primary_dosha,
          consent: true,
        }),
      });

      if (res.status === 403) {
        router.push(`/consent?next=${encodeURIComponent(SAVE_PATH)}`);
        return;
      }

      if (!res.ok) throw new Error("save_failed");

      router.push("/plan");
    } catch {
      setSaving(false);
      setError("कुछ गड़बड़ हुई। फिर कोशिश करें।");
    }
  }

  // Login और consent के बाद अपने-आप सेव करें
  useEffect(() => {
    if (autoSave && result && loggedIn && hasConsent && !triedAutoSave.current) {
      triedAutoSave.current = true;
      void save();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, result, loggedIn, hasConsent]);

  if (!loaded) {
    return <p className="text-muted">...</p>;
  }

  if (!result) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold text-ink">पहले quiz लें</h1>
        <Link href="/quiz" className="btn-primary">
          Quiz शुरू करें
        </Link>
      </div>
    );
  }

  const view = describe(result.primary_dosha);

  const primaryLabel = saving
    ? "रुकें..."
    : loggedIn && hasConsent
      ? "Plan देखें"
      : loggedIn
        ? "सहमत होकर देखें"
        : "Login करके सेव करें";

  return (
    <div className="space-y-8 pb-40">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold leading-tight text-brand">{view.title}</h1>
        <p className="text-muted">{view.theme}</p>
      </header>

      <section className="card space-y-3">
        <h2 className="text-base font-semibold text-ink">आज के 3 सुझाव</h2>
        <ul className="space-y-2 text-[15px] text-ink">
          {view.balance.map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-xs text-muted">{DISCLAIMER}</p>

      <div className="text-center">
        <Link href="/quiz" className="btn-link">
          Quiz दोबारा लें
        </Link>
      </div>

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
              पहले आज की आदतें देखें
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}