"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "sthamly:install-dismissed-at";
const DISMISS_DAYS = 14;

function isStandalone(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent);
}

function recentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ageMs = Date.now() - Number(raw);
    return ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    if (isIOS()) {
      setShowIOSHint(true);
      setVisible(true);
      return;
    }

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function onInstalled() {
      setVisible(false);
      setDeferred(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setVisible(false);
    }
    setDeferred(null);
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Storage blocked: the banner will show again next time.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <section
      aria-label="ऐप इंस्टॉल करें"
      className="fixed inset-x-0 bottom-16 z-30 mx-auto max-w-md px-4"
    >
      <div className="rounded-lg border border-brand bg-white p-4 shadow-lg">
        <p className="font-medium text-brand">Sthamly को फ़ोन पर रखें</p>

        {showIOSHint ? (
          <p className="mt-1 text-sm text-neutral-800">
            Safari में नीचे <strong>Share</strong> बटन दबाएँ, फिर <strong>Add to Home Screen</strong> चुनें।
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-800">
            इंस्टॉल करने पर Sthamly बिना browser खोले एक क्लिक में खुलेगा।
          </p>
        )}

        <div className="mt-3 flex gap-2">
          {!showIOSHint && deferred ? (
            <button
              type="button"
              onClick={install}
              className="flex-1 rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
            >
              इंस्टॉल करें
            </button>
          ) : null}
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-800"
          >
            बाद में
          </button>
        </div>
      </div>
    </section>
  );
}