"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

// सिर्फ़ landing पर top bar नहीं दिखेगा
const HIDE_ON = ["/"];

export default function BackButton() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const show = !HIDE_ON.includes(pathname);

  // Bar की ऊँचाई जितनी जगह page के ऊपर छोड़ें, ताकि heading bar के नीचे से शुरू हो
  useEffect(() => {
    if (!show) return;
    document.body.classList.add("has-top-bar");
    return () => document.body.classList.remove("has-top-bar");
  }, [show]);

  if (!show) return null;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/plan");
    }
  }

  return (
    <header
      className="fixed inset-x-0 top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur"
      style={{
        height: "calc(3.5rem + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div className="flex h-14 items-center px-4">
        <button
          type="button"
          onClick={goBack}
          aria-label="वापस जाएँ"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-brand shadow-sm active:scale-95"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>
    </header>
  );
}