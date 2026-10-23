"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "email" | "phone";

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const GENERIC_ERROR = "कुछ गड़बड़ हुई। थोड़ी देर बाद फिर कोशिश करें।";

export default function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [mode, setMode] = useState<Mode>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91");
  const [code, setCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setEmailSent(false);
    setCodeSent(false);
  }

  async function sendEmailLink(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    setBusy(false);
    if (authError) {
      setError(GENERIC_ERROR);
      return;
    }
    setEmailSent(true);
  }

  async function sendPhoneCode(event: React.FormEvent) {
    event.preventDefault();
    const normalized = phone.replace(/\s+/g, "");

    if (!PHONE_PATTERN.test(normalized)) {
      setError("फ़ोन नंबर country code के साथ लिखें, जैसे +919876543210");
      return;
    }

    setError(null);
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({ phone: normalized });
    setBusy(false);

    if (authError) {
      setError(GENERIC_ERROR);
      return;
    }
    setPhone(normalized);
    setCodeSent(true);
  }

  async function verifyPhoneCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const { error: authError } = await supabase.auth.verifyOtp({
      phone,
      token: code.trim(),
      type: "sms",
    });

    setBusy(false);
    if (authError) {
      setError("OTP सही नहीं है या समय खत्म हो गया। दोबारा भेजें।");
      return;
    }

    router.replace(next);
    router.refresh();
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-medium ${
      active ? "bg-brand text-white" : "bg-brand-soft text-brand"
    }`;

  const inputClass =
    "mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand";

  const buttonClass =
    "mt-4 w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-60";

  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="tablist">
        <button type="button" className={tabClass(mode === "email")} onClick={() => switchMode("email")}>
          Email
        </button>
        <button type="button" className={tabClass(mode === "phone")} onClick={() => switchMode("phone")}>
          Phone OTP
        </button>
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {mode === "email" && !emailSent ? (
        <form onSubmit={sendEmailLink}>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? "भेजा जा रहा है..." : "Login link भेजें"}
          </button>
        </form>
      ) : null}

      {mode === "email" && emailSent ? (
        <p className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          आपके email पर login link भेजा गया है। Link खोलें, यह इसी device पर login करेगा।
        </p>
      ) : null}

      {mode === "phone" && !codeSent ? (
        <form onSubmit={sendPhoneCode}>
          <label className="block text-sm font-medium" htmlFor="phone">
            फ़ोन नंबर (+91 के साथ)
          </label>
          <input
            id="phone"
            type="tel"
            required
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? "भेजा जा रहा है..." : "OTP भेजें"}
          </button>
        </form>
      ) : null}

      {mode === "phone" && codeSent ? (
        <form onSubmit={verifyPhoneCode}>
          <label className="block text-sm font-medium" htmlFor="otp">
            OTP
          </label>
          <input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
          <button type="submit" disabled={busy} className={buttonClass}>
            {busy ? "जाँच हो रही है..." : "Verify और login करें"}
          </button>
        </form>
      ) : null}
    </div>
  );
}