"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { QuizFile } from "@/lib/dosha/types";
import { classify, RESULT_STORAGE_KEY, scoreAnswers } from "@/lib/dosha/scoring";

const PROGRESS_KEY = "sthamly:quiz-progress";
const LANG_KEY = "sthamly:lang";
const ADVANCE_DELAY_MS = 260;

type Lang = "hi" | "en";
type Progress = { answers: Record<string, string>; index: number };

const UI: Record<Lang, { back: string; later: string; pace: string; auto: string }> = {
  hi: {
    back: "← वापस",
    later: "बाद में पूरा करें",
    pace: "लगभग 2 मिनट · कभी भी छोड़ सकते हैं",
    auto: "जवाब चुनते ही अगला सवाल अपने-आप आएगा।",
  },
  en: {
    back: "← Back",
    later: "Finish later",
    pace: "About 2 minutes · you can stop anytime",
    auto: "Your next question appears automatically after you choose.",
  },
};

export default function QuizClient({ quiz }: { quiz: QuizFile }) {
  const router = useRouter();
  const total = quiz.questions.length;

  const [ready, setReady] = useState(false);
  const [lang, setLang] = useState<Lang>("hi");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore the language choice and any unfinished quiz on this device.
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(LANG_KEY);
      if (savedLang === "hi" || savedLang === "en") setLang(savedLang);

      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Progress;
        const validIds = new Set(quiz.questions.map((q) => q.id));
        const clean = Object.fromEntries(
          Object.entries(saved.answers ?? {}).filter(([id]) => validIds.has(id))
        );
        setAnswers(clean);
        setIndex(Math.min(Math.max(saved.index ?? 0, 0), total - 1));
      }
    } catch {
      // Storage blocked or corrupt: start fresh.
    }
    setReady(true);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [quiz, total]);

  // Save progress after every change, so leaving the page loses nothing.
  useEffect(() => {
    if (!ready) return;
    try {
      const progress: Progress = { answers, index };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // Storage blocked: the quiz still works for this visit.
    }
  }, [answers, index, ready]);

  function changeLang(next: Lang) {
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      // Storage blocked: the choice lasts for this visit only.
    }
  }

  function finish(all: Record<string, string>) {
    const scores = scoreAnswers(quiz, all);
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
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // The result page will ask the user to retake the quiz.
    }

    router.push("/result");
  }

  // One tap answers the question. The next question appears on its own.
  function choose(optionId: string) {
    const question = quiz.questions[index];
    const next = { ...answers, [question.id]: optionId };
    setAnswers(next);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (index >= total - 1) {
        finish(next);
      } else {
        setIndex(index + 1);
      }
    }, ADVANCE_DELAY_MS);
  }

  function goBack() {
    if (timer.current) clearTimeout(timer.current);
    setIndex((i) => Math.max(0, i - 1));
  }

  if (!ready) {
    return <div className="min-h-[100dvh]" aria-hidden="true" />;
  }

  const question = quiz.questions[index];
  const selected = answers[question.id];
  const answered = Object.keys(answers).length;
  const percent = Math.round((answered / total) * 100);
  const t = UI[lang];

  const questionText = lang === "hi" ? question.text_hi ?? question.text : question.text;

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-6 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={index === 0}
          className="min-h-[44px] text-sm text-muted disabled:opacity-0"
        >
          {t.back}
        </button>

        <div role="group" aria-label="Language / भाषा" className="flex rounded-full bg-brand-soft p-1">
          {(["hi", "en"] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              onClick={() => changeLang(code)}
              className={`min-h-[36px] rounded-full px-4 text-sm font-medium ${
                lang === code ? "bg-brand text-white" : "text-brand"
              }`}
            >
              {code === "hi" ? "हिंदी" : "English"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-soft">
          <div
            className="h-1.5 rounded-full bg-brand transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted">
          <span>
            {index + 1} / {total}
          </span>
          <span>{t.pace}</span>
        </div>
      </div>

      <h1 className="mt-10 font-serif text-2xl leading-snug text-ink">{questionText}</h1>

      <div className="mt-8 space-y-3" role="radiogroup" aria-label={questionText}>
        {question.options.map((option) => {
          const active = selected === option.id;
          const label = lang === "hi" ? option.label_hi ?? option.label : option.label;

          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => choose(option.id)}
              className={`flex min-h-[56px] w-full items-center rounded-2xl border-2 px-5 py-4 text-left text-base transition-colors ${
                active
                  ? "border-brand bg-brand-soft font-medium text-brand"
                  : "border-line bg-surface text-ink active:bg-canvas"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-between pt-10">
        <p className="text-xs text-muted">{t.auto}</p>
      </div>

      <a
        href="/today"
        className="mt-4 block min-h-[44px] text-center text-sm text-muted underline underline-offset-4"
      >
        {t.later}
      </a>
    </div>
  );
}