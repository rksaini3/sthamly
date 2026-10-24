import type { SupabaseClient } from "@supabase/supabase-js";

export type OpenSlot = {
  id: string;
  practitioner_id: string;
  starts_at: string;
};

// Future slots that are not blocked and have no active booking.
// Uses the service role client, because users cannot read other users' consultations.
export async function fetchOpenSlots(
  db: SupabaseClient,
  practitionerIds: string[] | null,
  days = 14
): Promise<OpenSlot[]> {
  if (practitionerIds && practitionerIds.length === 0) return [];

  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const base = db
    .from("availability_slots")
    .select("id, practitioner_id, starts_at")
    .eq("blocked", false)
    .gt("starts_at", new Date(now.getTime() + 30 * 60 * 1000).toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at");

  const { data: slots, error } = practitionerIds
    ? await base.in("practitioner_id", practitionerIds)
    : await base;

  if (error) return [];

  const { data: active } = await db
    .from("consultations")
    .select("slot_id")
    .in("status", ["pending_payment", "confirmed"]);

  const busy = new Set((active ?? []).map((row) => row.slot_id as string));

  return ((slots ?? []) as OpenSlot[]).filter((s) => !busy.has(s.id));
}