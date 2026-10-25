import { istDateOffset } from "@/lib/time";
import { topSymptoms, weekChange, type TrendRow, type WeekChange } from "@/lib/trend";
import { SYMPTOMS, SYMPTOM_LABELS, type Symptom } from "@/lib/symptoms";

export type LogRow = { logged_on: string; symptoms: string[]; severity: number };

const WEEKDAYS_HI = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

const HISTORY_DAYS = 56; // 8 हफ़्ते
const SCORE_MIN_CHECKIN_DAYS = 2;
const FORECAST_MIN_CHECKIN_DAYS = 21;
const WEEKDAY_MIN_SAMPLES = 3;
const WEEKDAY_MIN_HITS = 3;
const WEEKDAY_MIN_RATE = 0.5;
const CHANGE_MIN_POINTS = 5;

type DayRow = { symptoms: string[]; maxSeverity: number };
type DayMap = Map<string, DayRow>;

// Offsets from today: 0 आज, -1 कल, 1 कल के बाद.
function rangeOffsets(fromDaysAgo: number, toDaysAgo: number): number[] {
  const out: number[] = [];
  for (let d = fromDaysAgo; d >= toDaysAgo; d--) out.push(-d);
  return out;
}

function datesFor(offsets: number[]): string[] {
  return offsets.map((o) => istDateOffset(o));
}

// एक दिन की एक ही row: सारे लक्षण और उस दिन की सबसे ज़्यादा severity।
function byDay(logs: LogRow[]): DayMap {
  const map: DayMap = new Map();
  for (const log of logs) {
    const cur = map.get(log.logged_on);
    if (!cur) {
      map.set(log.logged_on, { symptoms: Array.from(new Set(log.symptoms)), maxSeverity: log.severity });
    } else {
      cur.symptoms = Array.from(new Set([...cur.symptoms, ...log.symptoms]));
      cur.maxSeverity = Math.max(cur.maxSeverity, log.severity);
    }
  }
  return map;
}

export function weekdayOf(date: string): number {
  // दोपहर 12 बजे IST लें, ताकि server की time zone से तारीख न खिसके।
  return new Date(`${date}T12:00:00+05:30`).getDay();
}

// ---------- हफ़्ते का balance ----------

export type WeekScore = {
  score: number | null;
  checkinDays: number;
  consistency: number; // 0-100
  ease: number | null; // 0-100: check-in वाले दिनों में हल्के दिनों का हिस्सा
};

export function scoreWindow(days: DayMap, windowDates: string[]): WeekScore {
  const logged = windowDates.map((d) => days.get(d)).filter((x): x is DayRow => x !== undefined);
  const checkinDays = logged.length;
  const consistency = Math.round((checkinDays / windowDates.length) * 100);

  if (checkinDays < SCORE_MIN_CHECKIN_DAYS) {
    return { score: null, checkinDays, consistency, ease: null };
  }

  const easyDays = logged.filter((d) => d.maxSeverity <= 2).length;
  const ease = Math.round((easyDays / checkinDays) * 100);
  const score = Math.round(0.5 * consistency + 0.5 * ease);

  return { score, checkinDays, consistency, ease };
}

export function bandLabel(score: number): string {
  if (score >= 75) return "संतुलित";
  if (score >= 50) return "ठीक-ठाक";
  return "थोड़ा असंतुलित";
}

export type ScoreChange = "up" | "down" | "same" | "none";

function scoreChange(now: number | null, before: number | null): ScoreChange {
  if (now === null || before === null) return "none";
  if (now - before >= CHANGE_MIN_POINTS) return "up";
  if (before - now >= CHANGE_MIN_POINTS) return "down";
  return "same";
}

// ---------- अगले 7 दिन (पैटर्न) ----------

export type ForecastItem = { symptom: Symptom; label: string; hits: number; of: number };
export type ForecastDay = { date: string; weekday: string; items: ForecastItem[] };
export type Forecast =
  | { ready: false; checkinDays: number; needed: number }
  | { ready: true; days: ForecastDay[] };

function buildForecast(days: DayMap, history: string[], upcoming: string[]): Forecast {
  const checkinDays = history.filter((d) => days.has(d)).length;
  if (checkinDays < FORECAST_MIN_CHECKIN_DAYS) {
    return { ready: false, checkinDays, needed: FORECAST_MIN_CHECKIN_DAYS };
  }

  // हर weekday के लिए: कितने check-in दिन, और हर लक्षण कितने दिन आया।
  const stats = new Map<number, { samples: number; hits: Record<string, number> }>();
  for (const date of history) {
    const row = days.get(date);
    if (!row) continue;
    const wd = weekdayOf(date);
    const s = stats.get(wd) ?? { samples: 0, hits: {} };
    s.samples += 1;
    for (const sym of row.symptoms) {
      s.hits[sym] = (s.hits[sym] ?? 0) + 1;
    }
    stats.set(wd, s);
  }

  const result: ForecastDay[] = [];
  for (const date of upcoming) {
    const wd = weekdayOf(date);
    const s = stats.get(wd);
    if (!s || s.samples < WEEKDAY_MIN_SAMPLES) continue;

    const items: ForecastItem[] = [];
    for (const sym of SYMPTOMS) {
      const hits = s.hits[sym] ?? 0;
      if (hits >= WEEKDAY_MIN_HITS && hits / s.samples >= WEEKDAY_MIN_RATE) {
        items.push({ symptom: sym, label: SYMPTOM_LABELS[sym], hits, of: s.samples });
      }
    }
    if (items.length > 0) {
      result.push({ date, weekday: WEEKDAYS_HI[wd], items });
    }
  }

  return { ready: true, days: result };
}

// ---------- पूरा हफ़्तेवार insight ----------

export type TopItem = { symptom: string; label: string; days: number; change: WeekChange };

export type WeeklyInsight = {
  week: WeekScore;
  prevWeek: WeekScore;
  scoreChange: ScoreChange;
  top: TopItem[];
  forecast: Forecast;
};

export function buildWeeklyInsight(logs: LogRow[]): WeeklyInsight {
  const days = byDay(logs);

  const thisWeek = datesFor(rangeOffsets(6, 0));
  const lastWeek = datesFor(rangeOffsets(13, 7));
  const history = datesFor(rangeOffsets(HISTORY_DAYS - 1, 0));
  const upcoming = datesFor([1, 2, 3, 4, 5, 6, 7]);

  const week = scoreWindow(days, thisWeek);
  const prevWeek = scoreWindow(days, lastWeek);

  const trendRows: TrendRow[] = logs.map((l) => ({ logged_on: l.logged_on, symptoms: l.symptoms }));
  const top: TopItem[] = topSymptoms(trendRows).map((t) => ({
    symptom: t.symptom,
    label: SYMPTOM_LABELS[t.symptom as Symptom] ?? t.symptom,
    days: t.days,
    change: weekChange(trendRows, t.symptom),
  }));

  return {
    week,
    prevWeek,
    scoreChange: scoreChange(week.score, prevWeek.score),
    top,
    forecast: buildForecast(days, history, upcoming),
  };
}