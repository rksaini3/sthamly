import type { Symptom } from "@/lib/symptoms";
import type { Dosha, DoshaResult } from "./types";

export const PLAN_RULES_VERSION = "1.0.0";

export type PlanSection = "food" | "routine" | "yoga" | "skin";

const SECTIONS: PlanSection[] = ["food", "routine", "yoga", "skin"];

export type Plan = {
  rulesVersion: string;
  dosha: DoshaResult;
  // Slugs point to content_items. The app shows only items with status "approved".
  sections: Record<PlanSection, string[]>;
};

const BASE: Record<Dosha, Record<PlanSection, string[]>> = {
  vata: {
    food: ["vata-warm-oatmeal"],
    routine: ["vata-regular-meal-times"],
    yoga: ["vata-slow-stretching"],
    skin: ["vata-gentle-oil-moisturiser"],
  },
  pitta: {
    food: ["pitta-cooling-lunch"],
    routine: ["pitta-midday-rest"],
    yoga: ["pitta-calming-breath"],
    skin: ["pitta-cooling-toner"],
  },
  kapha: {
    food: ["kapha-light-spiced-dal"],
    routine: ["kapha-brisk-walk"],
    yoga: ["kapha-energising-breath"],
    skin: ["kapha-light-cleanser"],
  },
};

const SYMPTOM_RULES: Partial<Record<Symptom, Partial<Record<PlanSection, string[]>>>> = {
  acidity: { food: ["general-acidity-light-dinner"] },
  poor_sleep: {
    routine: ["general-screen-free-wind-down"],
    yoga: ["general-calming-breath"],
  },
  gas: { food: ["general-small-slow-meals"] },
  bloating: { food: ["general-small-slow-meals"] },
  fatigue: { routine: ["general-short-walk-after-meal"] },
  skin_flare: { skin: ["general-patch-test-new-products"] },
  low_appetite: { food: ["general-light-regular-meals"] },
};

type Season = "summer" | "monsoon" | "winter";

const SEASON_RULES: Record<Season, Partial<Record<PlanSection, string[]>>> = {
  summer: { food: ["season-summer-cooling-drinks"] },
  monsoon: { food: ["season-monsoon-warm-cooked"] },
  winter: { routine: ["season-winter-early-sleep"] },
};

// month: 0 = January ... 11 = December
function seasonOf(month: number): Season {
  if (month >= 2 && month <= 5) return "summer";
  if (month >= 6 && month <= 9) return "monsoon";
  return "winter";
}

export function buildPlan(input: {
  primary: DoshaResult;
  month: number;
  recentSymptoms: Set<Symptom>;
}): Plan {
  const doshas = input.primary.split("_") as Dosha[];
  const sections: Record<PlanSection, string[]> = { food: [], routine: [], yoga: [], skin: [] };

  const add = (section: PlanSection, slugs: string[] = []) => {
    sections[section].push(...slugs);
  };

  // 1. Primary dosha
  for (const section of SECTIONS) add(section, BASE[doshas[0]][section]);

  // 2. Second dosha in a blend: add its food and yoga
  if (doshas[1]) {
    add("food", BASE[doshas[1]].food);
    add("yoga", BASE[doshas[1]].yoga);
  }

  // 3. Recent symptoms (last 3 days)
  for (const symptom of input.recentSymptoms) {
    const rule = SYMPTOM_RULES[symptom];
    if (!rule) continue;
    for (const section of SECTIONS) add(section, rule[section]);
  }

  // 4. Season
  const season = SEASON_RULES[seasonOf(input.month)];
  for (const section of SECTIONS) add(section, season[section]);

  for (const section of SECTIONS) {
    sections[section] = [...new Set(sections[section])];
  }

  return { rulesVersion: PLAN_RULES_VERSION, dosha: input.primary, sections };
}