export type Dosha = "vata" | "pitta" | "kapha";

export type DoshaResult =
  | "vata"
  | "pitta"
  | "kapha"
  | "vata_pitta"
  | "pitta_kapha"
  | "vata_kapha";

export type Scores = Record<Dosha, number>;

export type Weights = Partial<Record<Dosha, number>>;

export type QuizOption = {
  id: string;
  label: string;
  weights: Weights;
};

export type QuizQuestion = {
  id: string;
  text: string;
  options: QuizOption[];
};

export type QuizFile = {
  quiz_version: string;
  scoring: { dual_threshold_pct: number };
  questions: QuizQuestion[];
};