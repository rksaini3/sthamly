"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Mode = "email" | "phone";

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const GENERIC_ERROR = "कुछ गड़बड़ हुई। थोड़ी देर बाद फिर कोशिश करें।";

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48" className="shrink-0">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

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

  async function signInWithGoogle() {
    setError(null);
    setBusy(true);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    // On success the browser moves to Google, so "busy" stays on.
    if (authError) {
      setBusy(false);
      setError(GENERIC_ERROR);
    }
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
    `flex-1 min-h-[44px] rounded-full px-3 text-sm font-medium ${
      active ? "bg-brand text-white" : "bg-brand-soft text-brand"
    }`;

  const inputClass =
    "mt-1 w-full min-h-[48px] rounded-xl border border-line bg-surface px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand";

  const buttonClass =
    "mt-4 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-brand px-4 text-base font-medium text-white disabled:opacity-60";

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={busy}
        className="flex min-h-[52px] w-full items-center justify-center gap-3 rounded-2xl border border-line bg-surface px-4 text-base font-medium text-ink disabled:opacity-60"
      >
        <GoogleMark />
        {busy ? "Google पर ले जा रहे हैं..." : "Google से जारी रखें"}
      </button>

      <div className="flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        या
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "email"} className={tabClass(mode === "email")} onClick={() => switchMode("email")}>
          Email
        </button>
        <button type="button" role="tab" aria-selected={mode === "phone"} className={tabClass(mode === "phone")} onClick={() => switchMode("phone")}>
          Phone OTP
        </button>
      </div>

      {error ? (
        <p role="alert" aria-live="polite" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">
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
        <p className="rounded-xl bg-brand-soft p-4 text-sm text-brand">
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