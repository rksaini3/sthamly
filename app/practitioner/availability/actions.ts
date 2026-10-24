"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE = "/practitioner/availability";

const ruleSchema = z.object({
  weekday: z.coerce.number().int().min(0).max(6),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
});

const idSchema = z.object({ id: z.string().uuid() });

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function back(error?: string, saved?: string): never {
  redirect(error ? `${PAGE}?error=${error}` : `${PAGE}?saved=${saved ?? "1"}`);
}

// Returns the verified practitioner's id, or sends the user away.
async function requireVerifiedPractitioner(): Promise<string> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(PAGE)}`);
  }

  const db = createSupabaseAdminClient();
  const { data: practitioner } = await db
    .from("practitioners")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!practitioner?.verified) {
    back("not_verified");
  }

  return user.id;
}

// Rebuilds future slots from the current rules.
// Slots that any consultation has ever used are kept, so bookings are never lost.
async function refreshSlots(uid: string): Promise<void> {
  const db = createSupabaseAdminClient();

  const { data: used, error: usedError } = await db.from("consultations").select("slot_id");
  if (usedError) throw new Error("refresh_failed");

  const usedIds = (used ?? []).map((row) => row.slot_id as string);

  let del = db
    .from("availability_slots")
    .delete()
    .eq("practitioner_id", uid)
    .gt("starts_at", new Date().toISOString());

  if (usedIds.length > 0) {
    del = del.not("id", "in", `(${usedIds.join(",")})`);
  }

  const { error: deleteError } = await del;
  if (deleteError) throw new Error("refresh_failed");

  const { error: genError } = await db.rpc("generate_practitioner_slots", {
    p_practitioner: uid,
    p_days: 30,
  });
  if (genError) throw new Error("refresh_failed");
}

async function refreshOrFail(uid: string): Promise<void> {
  try {
    await refreshSlots(uid);
  } catch {
    back("refresh");
  }
}

export async function addRule(formData: FormData) {
  const uid = await requireVerifiedPractitioner();

  const parsed = ruleSchema.safeParse({
    weekday: formData.get("weekday"),
    start_time: formData.get("start_time"),
    end_time: formData.get("end_time"),
  });
  if (!parsed.success) back("invalid");

  const { weekday, start_time, end_time } = parsed.data;
  const start = toMinutes(start_time);
  const end = toMinutes(end_time);

  if (end <= start) back("invalid_range");
  if (end - start > 12 * 60) back("too_long");
  if (start % 30 !== 0 || end % 30 !== 0) back("half_hours");

  const supabase = createSupabaseServerClient();

  const { data: existing, error: readError } = await supabase
    .from("availability_rules")
    .select("start_time, end_time")
    .eq("practitioner_id", uid)
    .eq("weekday", weekday)
    .eq("active", true);

  if (readError) back("save");

  const overlaps = (existing ?? []).some((r) => {
    const s = toMinutes(r.start_time);
    const e = toMinutes(r.end_time);
    return start < e && s < end;
  });
  if (overlaps) back("overlap");

  const { error: insertError } = await supabase.from("availability_rules").insert({
    practitioner_id: uid,
    weekday,
    start_time,
    end_time,
    active: true,
  });
  if (insertError) back("save");

  await refreshOrFail(uid);

  revalidatePath(PAGE);
  back(undefined, "added");
}

export async function deleteRule(formData: FormData) {
  const uid = await requireVerifiedPractitioner();

  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) back("invalid");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("availability_rules")
    .delete()
    .eq("id", parsed.data.id)
    .eq("practitioner_id", uid);

  if (error) back("save");

  await refreshOrFail(uid);

  revalidatePath(PAGE);
  back(undefined, "deleted");
}

export async function regenerateSlots() {
  const uid = await requireVerifiedPractitioner();

  await refreshOrFail(uid);

  revalidatePath(PAGE);
  back(undefined, "regenerated");
}