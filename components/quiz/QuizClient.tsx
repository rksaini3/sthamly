"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizFile } from "@/lib/dosha/types";
import { classify, RESULT_STORAGE_KEY, scoreAnswers } from "@/lib/dosha/scoring";

export default function QuizClient({ quiz }: { quiz: QuizFile }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const total = quiz.questions.length;
  const question = quiz.questions[index];
  const selected = answers[question.id];
  const isLast = index === total - 1;

  function choose(optionId: string) {
    setAnswers((prev) => ({ ...prev, [question.id]: optionId }));
  }

  function finish() {
    const scores = scoreAnswers(quiz, answers);
    const primary = classify(scores, quiz.scoring.dual_threshold_pct);

    try {
      localStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify({
          quiz_version: quiz.quiz_version,
          scores,
          primary_dosha: primary,
        })
      );
    } catch {
      // Storage can be blocked (private mode). The result page will then ask the user to retake the quiz.
    }

    router.push("/result");
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-soft">
          <div
            className="h-2 rounded-full bg-brand transition-all"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-neutral-600">
          सवाल {index + 1} / {total}
        </p>
      </div>

      <h1 className="text-xl font-semibold">{question.text}</h1>

      <div className="space-y-3" role="radiogroup" aria-label={question.text}>
        {question.options.map((option) => {
          const active = selected === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(option.id)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-base ${
                active
                  ? "border-brand bg-brand-soft font-medium text-brand"
                  : "border-neutral-300 bg-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex-1 rounded-md border border-brand px-4 py-3 text-brand disabled:opacity-40"
        >
          वापस
        </button>

        {isLast ? (
          <button
            type="button"
            onClick={finish}
            disabled={!selected}
            className="flex-1 rounded-md bg-brand px-4 py-3 text-white disabled:opacity-40"
          >
            नतीजा देखें
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            disabled={!selected}
            className="flex-1 rounded-md bg-brand px-4 py-3 text-white disabled:opacity-40"
          >
            अगला
          </button>
        )}
      </div>
    </div>
  );
}