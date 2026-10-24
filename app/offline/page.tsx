import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ऑफ़लाइन",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-semibold text-brand">आप ऑफ़लाइन हैं</h1>
      <p className="mt-3 text-neutral-800">
        इंटरनेट से जुड़ते ही यह पेज अपने-आप ठीक हो जाएगा। Quiz इंटरनेट के बिना भी दिया जा सकता है।
      </p>

      <div className="mt-8 space-y-3">
        <a
          href="/quiz"
          className="block rounded-md bg-brand px-4 py-3 text-center text-base font-medium text-white"
        >
          Quiz शुरू करें
        </a>
        <a
          href="/"
          className="block rounded-md border border-brand px-4 py-3 text-center text-base font-medium text-brand"
        >
          होम पेज पर जाएँ
        </a>
      </div>

      <p className="mt-10 text-xs text-neutral-600">
        आपका निजी plan और logs ऑफ़लाइन नहीं दिखाए जाते, ताकि आपका data सुरक्षित रहे।
      </p>
    </main>
  );
}