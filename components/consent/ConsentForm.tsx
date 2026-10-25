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

const OPTIONAL: { purpose: "consult_sharing" | "marketing"; title: string }[] = [
  { purpose: "consult_sharing", title: "Consult में साझा करें" },
  { purpose: "marketing", title: "Offers और updates" },
];

export default function ConsentForm({ next, policyVersion, initial }: Props) {
  const router = useRouter();
  const alreadyAgreed = initial.health_logging;

  // वैकल्पिक विकल्प हमेशा बंद से शुरू होते हैं
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
      if (!alreadyAgreed) await saveConsent("health_logging", "grant");

      for (const item of OPTIONAL) {
        const wanted = optional[item.purpose];
        if (wanted !== initial[item.purpose]) {
          await saveConsent(item.purpose, wanted ? "grant" : "revoke");
        }
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("कुछ गड़बड़ हुई। फिर कोशिश करें।");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-ink">सहमति</h1>
        <p className="text-muted">आपका data सिर्फ़ आपके लिए, encrypted रहेगा।</p>
      </header>

      <details className="card p-5">
        <summary className="cursor-pointer list-none text-sm font-medium text-ink">
          और विकल्प
        </summary>
        <div className="mt-4 space-y-4">
          {OPTIONAL.map((item) => (
            <label key={item.purpose} className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-brand"
                checked={optional[item.purpose]}
                onChange={(e) =>
                  setOptional((prev) => ({ ...prev, [item.purpose]: e.target.checked }))
                }
              />
              <span className="text-sm text-ink">{item.title}</span>
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
          {busy ? "रुकें..." : alreadyAgreed ? "जारी रखें" : "सहमत हूँ"}
        </button>
        <p className="text-center text-xs text-muted">v{policyVersion}</p>
      </div>
    </div>
  );
}