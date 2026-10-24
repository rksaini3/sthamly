import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const DAY_MS = 24 * 60 * 60 * 1000;

// Today's calendar date in India, as YYYY-MM-DD.
function istYmd(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// The previous full IST week, Monday (inclusive) to Monday (exclusive).
export function previousWeek(now: Date = new Date()): { start: string; end: string } {
  const today = new Date(`${istYmd(now)}T00:00:00Z`);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7; // Mon=0 ... Sun=6
  const thisMonday = new Date(today.getTime() - daysSinceMonday * DAY_MS);
  const lastMonday = new Date(thisMonday.getTime() - 7 * DAY_MS);

  return {
    start: lastMonday.toISOString().slice(0, 10),
    end: thisMonday.toISOString().slice(0, 10),
  };
}

// Returns how many consultations were settled in this range.
export async function settleRange(start: string, end: string): Promise<number> {
  const db = createSupabaseAdminClient();
  const { data, error } = await db.rpc("settle_payouts", {
    p_start: start,
    p_end: end,
  });

  if (error) {
    throw new Error(`settle_payouts failed: ${error.message}`);
  }

  return typeof data === "number" ? data : 0;
}