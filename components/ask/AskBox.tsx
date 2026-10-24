"use client";

import { useState } from "react";

type Source = { slug: string; title: string };

type AskResponse = {
  status: "answered" | "no_match" | "safety";
  answer: string;
  sources: Source[];
};

const MAX_LENGTH = 500;

const SUGGESTIONS = [
  "गर्मी में कौन सा खाना अच्छा रहता है?",
  "रात को नींद कैसे सुधारें?",
  "सुबह की हल्की routine क्या हो?",
];

export default function AskBox() {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const trimmed = question.trim();
    if (trimmed.length < 3) {
      setError("सवाल कम से कम 3 अक्षर का लिखें।");
      return;
    }

    setBusy(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });

      if (res.status === 401) {
        window.location.href = `/login?next=${encodeURIComponent("/ask")}`;
        return;
      }
      if (res.status === 400) {
        setError("सवाल सही format में नहीं है। दोबारा लिखें।");
        return;
      }
      if (!res.ok) {
        setError("अभी जवाब नहीं मिल पा रहा। थोड़ी देर बाद कोशिश करें।");
        return;
      }

      setResult((await res.json()) as AskResponse);
    } catch {
      setError("नेटवर्क की समस्या है। कनेक्शन जाँचकर दोबारा कोशिश करें।");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="question" className="block text-sm font-medium">
          अपना सवाल लिखें
        </label>
        <textarea
          id="question"
          rows={3}
          maxLength={MAX_LENGTH}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="जैसे: पेट में गैस हो तो दिनचर्या में क्या बदलें?"
          className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <div className="flex items-center justify-between text-xs text-neutral-600">
          <span>{question.length}/{MAX_LENGTH}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setQuestion(s)}
              className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={busy || question.trim().length < 3}
          className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white disabled:opacity-50"
        >
          {busy ? "जवाब ढूँढा जा रहा है..." : "पूछें"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {result?.status === "safety" ? (
        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm font-medium text-red-800">
          {result.answer}
        </div>
      ) : null}

      {result && result.status !== "safety" ? (
        <article className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <p className="whitespace-pre-line text-base text-neutral-900">{result.answer}</p>

          {result.sources.length > 0 ? (
            <div>
              <h2 className="text-sm font-semibold text-neutral-700">स्रोत</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-700">
                {result.sources.map((s) => (
                  <li key={s.slug}>{s.title}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      ) : null}

      <p className="text-xs text-neutral-600">
        Sthamly general wellness जानकारी देता है। यह medical सलाह या doctor की जगह नहीं है।
      </p>
    </div>
  );
}