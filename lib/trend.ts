import { istDateOffset } from "@/lib/time";

export type TrendRow = {
  logged_on: string; // YYYY-MM-DD in IST
  symptoms: string[];
};

// Distinct days on which the symptom was logged, between fromDaysAgo and toDaysAgo (inclusive).
// Example: daysWithSymptom(rows, "acidity", 6, 0) counts the last 7 days.
function daysWithSymptom(
  rows: TrendRow[],
  symptom: string,
  fromDaysAgo: number,
  toDaysAgo: number
): number {
  const older = istDateOffset(-fromDaysAgo);
  const newer = istDateOffset(-toDaysAgo);

  const days = new Set(
    rows
      .filter((r) => r.logged_on >= older && r.logged_on <= newer && r.symptoms.includes(symptom))
      .map((r) => r.logged_on)
  );
  return days.size;
}

export type TopSymptom = { symptom: string; days: number };

// Top symptoms over the last 14 days, by number of distinct days logged.
export function topSymptoms(rows: TrendRow[], limit = 3): TopSymptom[] {
  const names = new Set(rows.flatMap((r) => r.symptoms));

  return [...names]
    .map((symptom) => ({ symptom, days: daysWithSymptom(rows, symptom, 13, 0) }))
    .filter((s) => s.days > 0)
    .sort((a, b) => b.days - a.days)
    .slice(0, limit);
}

export type WeekChange = "more" | "fewer" | "same";

// Compares the last 7 days with the 7 days before them. Uses plain words, not percentages.
export function weekChange(rows: TrendRow[], symptom: string): WeekChange {
  const thisWeek = daysWithSymptom(rows, symptom, 6, 0);
  const lastWeek = daysWithSymptom(rows, symptom, 13, 7);

  if (thisWeek > lastWeek) return "more";
  if (thisWeek < lastWeek) return "fewer";
  return "same";
}