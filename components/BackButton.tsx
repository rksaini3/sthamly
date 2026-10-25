"use client";

import { usePathname, useRouter } from "next/navigation";

// इन पेजों पर नीचे का nav (BottomNav) पहले से वापस जाने का बटन दिखाता है
const HIDE_ON = ["/", "/plan", "/track", "/ask", "/profile"];

export default function BackButton() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();

  if (HIDE_ON.includes(pathname)) return null;

  function goBack() {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/plan");
    }
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="वापस जाएँ"
      className="fixed left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow active:scale-95"
      style={{
        top: "calc(env(safe-area-inset-top) + 0.75rem)",
        background: "var(--nav-bg)",
        color: "var(--nav-active)",
        border: "1px solid var(--nav-line)",
      }}
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
  );
}