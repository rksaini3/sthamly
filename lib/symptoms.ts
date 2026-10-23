export const SYMPTOMS = [
  "acidity",
  "gas",
  "bloating",
  "fatigue",
  "poor_sleep",
  "skin_flare",
  "low_appetite",
] as const;

export type Symptom = (typeof SYMPTOMS)[number];

export const SYMPTOM_LABELS: Record<Symptom, string> = {
  acidity: "Acidity",
  gas: "Gas",
  bloating: "Bloating",
  fatigue: "Fatigue",
  poor_sleep: "Poor sleep",
  skin_flare: "Skin flare-up",
  low_appetite: "Low appetite",
};