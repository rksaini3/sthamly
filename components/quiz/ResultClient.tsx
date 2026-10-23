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

    const res = await fetch("/api/dosha-results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The schema requires consent: true. It is sent only after the consent screen.
      body: JSON.stringify({
        quiz_version: result.quiz_version,
        scores: result.scores,
        primary_dosha: result.primary_dosha,
        consent: true,
      }),
    });

    if (!res.ok) {
      setSaving(false);
      setError("Result save नहीं हो सका। दोबारा कोशिश करें।");
      return;
    }

    router.push("/plan");
  }

  // After login and consent, save once without another tap.
  useEffect(() => {
    if (autoSave && result && loggedIn && hasConsent && !triedAutoSave.current) {
      triedAutoSave.current = true;
      void save();
    }
    // save() reads the latest state through its closure on this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSave, result, loggedIn, hasConsent]);

  if (!loaded) {
    return <p className="text-sm text-neutral-600">लोड हो रहा है...</p>;
  }

  if (!result) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">पहले quiz पूरा करें</h1>
        <p className="text-sm text-neutral-700">
          आपका result इस device पर नहीं मिला। Quiz दोबारा लें।
        </p>
        <Link href="/quiz" className="inline-block rounded-md bg-brand px-4 py-3 text-white">
          Quiz शुरू करें
        </Link>
      </div>
    );
  }

  const view = describe(result.primary_dosha);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm text-neutral-600">आपकी profile</p>
        <h1 className="text-2xl font-semibold text-brand">{view.title}</h1>
        <p className="mt-1 text-neutral-700">{view.theme}</p>
      </header>

      <section>
        <h2 className="font-semibold">आपकी खूबियाँ</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
          {view.traits.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">संतुलन के लिए छोटे सुझाव</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-neutral-800">
          {view.balance.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      <p className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-700">{DISCLAIMER}</p>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-60"
      >
        {saving
          ? "Plan बन रहा है..."
          : loggedIn && hasConsent
            ? "मेरा daily plan देखें"
            : "Result save करें और plan देखें"}
      </button>

      <Link href="/quiz" className="block text-center text-sm text-brand underline">
        Quiz दोबारा लें
      </Link>
    </div>
  );
}