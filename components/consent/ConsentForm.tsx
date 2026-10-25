"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Purpose = "health_logging" | "consult_sharing" | "marketing";

type Props = {
  next: string;
  policyVersion: string;
  initial: Record<Purpose, boolean>;
};

async function saveConsent(purpose: Purpose, action: "grant" | "revoke") {
  const res = await fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, action }),
  });
  if (!res.ok) throw new Error("consent_failed");
}

const OPTIONAL: { purpose: "consult_sharing" | "marketing"; title: string; text: string }[] = [
  {
    purpose: "consult_sharing",
    title: "Consult में data साझा करना",
    text: "Consult book करते समय practitioner को मेरा dosha profile और चुने हुए logs दिखें।",
  },
  {
    purpose: "marketing",
    title: "नए content और offers",
    text: "Email या WhatsApp पर नए content, features और offers।",
  },
];

export default function ConsentForm({ next, policyVersion, initial }: Props) {
  const router = useRouter();
  const alreadyAgreed = initial.health_logging;

  // वैकल्पिक विकल्प: हमेशा खाली (unchecked) से शुरू होते हैं। user खुद tick करे तभी सहमति मानी जाएगी।
  const [optional, setOptional] = useState({
    consult_sharing: initial.consult_sharing,
    marketing: initial.marketing,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setBusy(true);
    setError(null);

    try {
      // ज़रूरी अनुमति: बटन दबाना साफ़ सहमति है
      if (!alreadyAgreed) await saveConsent("health_logging", "grant");

      // वैकल्पिक विकल्प: सिर्फ़ तब भेजें जब बदले हों
      for (const item of OPTIONAL) {
        const wanted = optional[item.purpose];
        if (wanted !== initial[item.purpose]) {
          await saveConsent(item.purpose, wanted ? "grant" : "revoke");
        }
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("अभी सेव नहीं हो पाया। इंटरनेट जाँचें और एक बार फिर दबाएँ। आपका quiz result सुरक्षित है।");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">एक ज़रूरी कदम</p>
        <h1 className="text-2xl font-semibold leading-tight text-ink">आपका plan सुरक्षित रखें</h1>
        <p className="text-[15px] leading-relaxed text-muted">
          Sthamly आपका quiz result और रोज़ के symptom logs सिर्फ़ आपके लिए, encrypted रूप में रखेगा।
        </p>
      </header>

      <ul className="card space-y-3 text-sm leading-relaxed text-ink">
        <li>• आपका data बिना आपकी अनुमति किसी और के साथ साझा नहीं होगा।</li>
        <li>• Profile में जाकर कभी भी कोई अनुमति बंद कर सकते हैं।</li>
        <li>• पूरा data download किया जा सकता है, और account हमेशा के लिए delete भी।</li>
      </ul>

      <details className="card group p-5">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink">
          और विकल्प (वैकल्पिक){" "}
          <span className="text-muted">· पहले से बंद हैं</span>
        </summary>
        <div className="mt-4 space-y-4">
          {OPTIONAL.map((item) => (
            <label key={item.purpose} className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 shrink-0 accent-brand"
                checked={optional[item.purpose]}
                onChange={(e) =>
                  setOptional((prev) => ({ ...prev, [item.purpose]: e.target.checked }))
                }
              />
              <span>
                <span className="block text-sm font-medium text-ink">{item.title}</span>
                <span className="mt-1 block text-sm text-muted">{item.text}</span>
              </span>
            </label>
          ))}
        </div>
      </details>

      {error ? (
        <p role="alert" className="error-box">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <button type="button" onClick={agree} disabled={busy} className="btn-primary">
          {busy ? "सेव हो रहा है..." : alreadyAgreed ? "जारी रखें" : "सहमत हूँ, plan देखें"}
        </button>
        <p className="text-center text-xs text-muted">Policy version {policyVersion}</p>
      </div>
    </div>
  );
}