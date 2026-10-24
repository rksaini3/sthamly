"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Purpose = "health_logging" | "consult_sharing" | "marketing";

const LABELS: Record<Purpose, { title: string; hint: string }> = {
  health_logging: {
    title: "Plan और symptom logs",
    hint: "बंद करने पर नए logs और quiz result save नहीं होंगे। पुराना data हटाने के लिए नीचे account delete करें।",
  },
  consult_sharing: {
    title: "Consultation में data साझा करना",
    hint: "बंद करने पर practitioner को आपका dosha profile और logs नहीं दिखेंगे।",
  },
  marketing: {
    title: "Updates और offers",
    hint: "कभी भी बदल सकते हैं।",
  },
};

const CONFIRM_TEXT = "DELETE";

export default function ProfileActions({
  initial,
  policyVersion,
}: {
  initial: Record<Purpose, boolean>;
  policyVersion: string;
}) {
  const router = useRouter();
  const [consents, setConsents] = useState<Record<Purpose, boolean>>(initial);
  const [busyPurpose, setBusyPurpose] = useState<Purpose | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function toggleConsent(purpose: Purpose) {
    const next = !consents[purpose];
    setBusyPurpose(purpose);

    const res = await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, action: next ? "grant" : "revoke" }),
    });

    setBusyPurpose(null);
    if (res.ok) {
      setConsents((prev) => ({ ...prev, [purpose]: next }));
    }
  }

  async function deleteAccount(event: React.FormEvent) {
    event.preventDefault();
    if (confirmText !== CONFIRM_TEXT) return;

    setDeleting(true);
    setDeleteError(null);

    const res = await fetch("/api/me/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "DELETE" }),
    });

    if (res.status === 409) {
      setDeleting(false);
      setDeleteError("पहले अपना active subscription cancel करें, फिर account delete होगा।");
      return;
    }
    if (!res.ok) {
      setDeleting(false);
      setDeleteError("Account delete नहीं हो सका। Support से संपर्क करें।");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">आपकी अनुमतियाँ</h2>
        <p className="text-xs text-neutral-600">Policy version {policyVersion}</p>

        {(Object.keys(LABELS) as Purpose[]).map((purpose) => (
          <div key={purpose} className="rounded-lg border border-neutral-200 bg-white p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 accent-brand"
                checked={consents[purpose]}
                disabled={busyPurpose === purpose}
                onChange={() => toggleConsent(purpose)}
              />
              <span>
                <span className="block font-medium">{LABELS[purpose].title}</span>
                <span className="mt-1 block text-sm text-neutral-700">{LABELS[purpose].hint}</span>
              </span>
            </label>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">आपका data</h2>
        <p className="text-sm text-neutral-700">
          आपकी सारी जानकारी एक JSON file में डाउनलोड करें। इसमें notes भी decrypt होकर होंगे।
        </p>
        <a
          href="/api/me/export"
          download
          onClick={() => setExportError(null)}
          className="inline-block rounded-md border border-brand px-4 py-3 text-brand"
        >
          मेरा data डाउनलोड करें
        </a>
        {exportError ? <p className="text-sm text-red-700">{exportError}</p> : null}
      </section>

      <section className="space-y-3">
        <SignOutButton />
      </section>

      <section className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
        <h2 className="text-lg font-semibold text-red-800">Account delete करें</h2>
        <p className="text-sm text-neutral-800">
          इससे आपके plan, logs, quiz results और consents हमेशा के लिए हट जाएँगे। Billing रिकॉर्ड कानूनी
          ज़रूरत के हिसाब से रखे जाएँगे, लेकिन उनमें से आपका health text हटा दिया जाएगा। यह वापस नहीं होगा।
        </p>

        <form onSubmit={deleteAccount} className="space-y-3">
          <label htmlFor="confirm" className="block text-sm font-medium">
            पुष्टि के लिए <strong>{CONFIRM_TEXT}</strong> लिखें
          </label>
          <input
            id="confirm"
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-md border border-red-300 bg-white px-3 py-2"
          />
          {deleteError ? (
            <p role="alert" className="text-sm text-red-700">
              {deleteError}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={confirmText !== CONFIRM_TEXT || deleting}
            className="w-full rounded-md bg-red-700 px-4 py-3 text-white disabled:opacity-40"
          >
            {deleting ? "Account delete हो रहा है..." : "मेरा account delete करें"}
          </button>
        </form>
      </section>
    </div>
  );
}