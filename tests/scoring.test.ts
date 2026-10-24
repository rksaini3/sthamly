import { describe, expect, it } from "vitest";
import { classify, scoreAnswers } from "@/lib/dosha/scoring";
import type { QuizFile, Scores } from "@/lib/dosha/types";

const quiz: QuizFile = {
  quiz_version: "test",
  scoring: { dual_threshold_pct: 15 },
  questions: [
    {
      id: "q1",
      text: "test",
      options: [
        { id: "a", label: "a", weights: { vata: 2 } },
        { id: "b", label: "b", weights: { pitta: 2 } },
        { id: "c", label: "c", weights: { kapha: 2 } },
      ],
    },
    {
      id: "q2",
      text: "test",
      options: [
        { id: "a", label: "a", weights: { vata: 2 } },
        { id: "b", label: "b", weights: { pitta: 2, kapha: 1 } },
        { id: "c", label: "c", weights: { kapha: 2 } },
      ],
    },
  ],
};

describe("scoreAnswers", () => {
  it("adds weights across questions", () => {
    const scores = scoreAnswers(quiz, { q1: "a", q2: "b" });
    expect(scores).toEqual({ vata: 2, pitta: 2, kapha: 1 });
  });

  it("ignores unknown option ids and missing answers", () => {
    const scores = scoreAnswers(quiz, { q1: "zzz" });
    expect(scores).toEqual({ vata: 0, pitta: 0, kapha: 0 });
  });
});

describe("classify", () => {
  it("returns a single dosha when the gap is above the threshold", () => {
    const scores: Scores = { vata: 20, pitta: 5, kapha: 5 };
    expect(classify(scores, 15)).toBe("vata");
  });

  it("returns a blend when the top two are within the threshold", () => {
    const scores: Scores = { vata: 12, pitta: 10, kapha: 8 };
    expect(classify(scores, 15)).toBe("vata_pitta");
  });

  it("builds the blend name in a fixed order, whichever dosha is higher", () => {
    const scores: Scores = { vata: 10, pitta: 0, kapha: 10 };
    expect(classify(scores, 15)).toBe("vata_kapha");
  });

  it("throws when there are no scored answers", () => {
    expect(() => classify({ vata: 0, pitta: 0, kapha: 0 }, 15)).toThrow();
  });
});