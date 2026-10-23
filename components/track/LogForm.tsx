"use client";

import { useState } from "react";
import Link from "next/link";
import { SYMPTOMS, SYMPTOM_LABELS, type Symptom } from "@/lib/symptoms";

type Props = {
  onSaved: () => void;
};

export default function LogForm({ onSaved }: Props) {
  const [picked, setPicked] = useState<Symptom[]>([]);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [safetyMessage, setSafetyMessage] = useState<string | null>(null);
  const [needsConsent, setNeedsConsent] = useState(false);

  function toggle(symptom: Symptom) {
    setPicked((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (picked.length === 0) {
      setError("कम से कम एक लक्षण चुनें।");
      return;
    }

    setBusy(true);
    setError(null);
    setSafetyMessage(null);
    setNeedsConsent(false);

    const res = await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symptoms: picked,
        severity,
        note: note.trim() || undefined,
      }),
    });

    setBusy(false);

    if (res.status === 403) {
      setNeedsConsent(true);
      return;
    }
    if (!res.ok) {
      setError("Log save नहीं हो सका। दोबारा कोशिश करें।");
      return;
    }

    const data = (await res.json()) as { message?: string };
    if (data.message) {
      setSafetyMessage(data.message);
    }

    setPicked([]);
    setSeverity(3);
    setNote("");
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">लक्षण</legend>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS.map((s) => {
            const active = picked.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(s)}
                className={`rounded-full border px-3 py-2 text-sm ${
                  active ? "border-brand bg-brand text-white" : "border-neutral-300 bg-white"
                }`}
              >
                {SYMPTOM_LABELS[s]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">गंभीरता (1 = हल्का, 5 = तेज़)</legend>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={severity === n}
              onClick={() => setSeverity(n)}
              className={`h-11 w-11 rounded-md border text-base ${
                severity === n ? "border-brand bg-brand text-white" : "border-neutral-300 bg-white"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="note" className="block text-sm font-medium">
          Note (वैकल्पिक, 280 अक्षर तक)
        </label>
        <textarea
          id="note"
          rows={3}
          maxLength={280}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
        />
        <p className="mt-1 text-xs text-neutral-600">यह note encrypted रहेगा।</p>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {safetyMessage ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
          {safetyMessage}
        </p>
      ) : null}

      {needsConsent ? (
        <p className="rounded-md bg-neutral-100 p-3 text-sm">
          Log save करने के लिए पहले अनुमति दें।{" "}
          <Link href={`/consent?next=${encodeURIComponent("/track")}`} className="text-brand underline">
            अनुमति दें
          </Link>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-60"
      >
        {busy ? "सेव हो रहा है..." : "आज का log सेव करें"}
      </button>
    </form>
  );
}