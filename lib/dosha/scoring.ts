import type { Dosha, DoshaResult, QuizFile, Scores } from "./types";

export const RESULT_STORAGE_KEY = "sthamly:quiz-result";

const DOSHAS: Dosha[] = ["vata", "pitta", "kapha"];

// Keys are the two doshas sorted alphabetically and joined with "+".
const BLEND: Record<string, DoshaResult> = {
  "pitta+vata": "vata_pitta",
  "kapha+pitta": "pitta_kapha",
  "kapha+vata": "vata_kapha",
};

export function scoreAnswers(quiz: QuizFile, answers: Record<string, string>): Scores {
  const scores: Scores = { vata: 0, pitta: 0, kapha: 0 };

  for (const question of quiz.questions) {
    const option = question.options.find((o) => o.id === answers[question.id]);
    if (!option) continue;
    for (const dosha of DOSHAS) {
      scores[dosha] += option.weights[dosha] ?? 0;
    }
  }

  return scores;
}

export function classify(scores: Scores, thresholdPct = 15): DoshaResult {
  const total = DOSHAS.reduce((sum, d) => sum + scores[d], 0);
  if (total === 0) {
    throw new Error("Cannot classify without scored answers");
  }

  const [first, second] = [...DOSHAS].sort((a, b) => scores[b] - scores[a]);
  const gapPct = ((scores[first] - scores[second]) / total) * 100;

  if (gapPct > thresholdPct) return first;
  return BLEND[[first, second].sort().join("+")];
}