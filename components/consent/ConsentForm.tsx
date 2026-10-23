"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Purpose = "health_logging" | "consult_sharing" | "marketing";

const ITEMS: { purpose: Purpose; title: string; text: string; required: boolean }[] = [
  {
    purpose: "health_logging",
    title: "Plan और symptom logs",
    text: "मेरे quiz result, daily plan और symptom logs Sthamly में save हों। यह data encrypted रहेगा, और मैं इस अनुमति को कभी भी वापस ले सकता/सकती हूँ।",
    required: true,
  },
  {
    purpose: "consult_sharing",
    title: "Consultation में data साझा करना",
    text: "Consult book करने पर मेरा dosha profile और चुने हुए logs practitioner के साथ साझा हों।",
    required: false,
  },
  {
    purpose: "marketing",
    title: "Updates और offers",
    text: "नए content, features और offers के बारे में email या WhatsApp पर संदेश।",
    required: false,
  },
];

type Props = {
  next: string;
  policyVersion: string;
  initial: Record<Purpose, boolean>;
};

export default function ConsentForm({ next, policyVersion, initial }: Props) {
  const router = useRouter();
  const [choices, setChoices] = useState<Record<Purpose, boolean>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canContinue = choices.health_logging;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canContinue) return;

    setBusy(true);
    setError(null);

    try {
      for (const item of ITEMS) {
        const wanted = choices[item.purpose];
        if (wanted === initial[item.purpose]) continue;

        const res = await fetch("/api/consent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            purpose: item.purpose,
            action: wanted ? "grant" : "revoke",
          }),
        });
        if (!res.ok) throw new Error("consent_failed");
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Consent save नहीं हो सका। दोबारा कोशिश करें।");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-brand">आपकी अनुमति</h1>
        <p className="mt-2 text-sm text-neutral-700">
          Sthamly आपका data तभी इस्तेमाल करेगा जब आप इसकी अनुमति दें। हर विकल्प अलग है।
        </p>
      </header>

      {ITEMS.map((item) => (
        <label
          key={item.purpose}
          className="flex gap-3 rounded-lg border border-neutral-300 bg-white p-4"
        >
          <input
            type="checkbox"
            className="mt-1 h-5 w-5 accent-brand"
            checked={choices[item.purpose]}
            onChange={(e) =>
              setChoices((prev) => ({ ...prev, [item.purpose]: e.target.checked }))
            }
          />
          <span>
            <span className="block font-medium">
              {item.title}
              {item.required ? <span className="text-red-700"> *</span> : null}
            </span>
            <span className="mt-1 block text-sm text-neutral-700">{item.text}</span>
          </span>
        </label>
      ))}

      <p className="text-xs text-neutral-600">
        * ज़रूरी। Policy version {policyVersion}। बिना इसके plan और logs save नहीं होंगे।
      </p>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canContinue || busy}
        className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {busy ? "सेव हो रहा है..." : "आगे बढ़ें"}
      </button>
    </form>
  );
}