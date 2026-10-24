"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { encryptField, toPgBytea } from "@/lib/crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE = "/practitioner/sessions";

const outcomeSchema = z.object({
  consultation_id: z.string().uuid(),
  decision: z.enum(["complete", "user_no_show"]),
});

const noteSchema = z.object({
  consultation_id: z.string().uuid(),
  body: z.string().trim().min(3).max(2000),
});

function go(path: string): never {
  redirect(path);
}

// Returns the verified practitioner's id, or sends the user away.
async function requirePractitioner(): Promise<string> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    go(`/login?next=${encodeURIComponent(PAGE)}`);
  }

  const db = createSupabaseAdminClient();
  const { data: practitioner } = await db
    .from("practitioners")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!practitioner?.verified) {
    go(`${PAGE}?error=not_verified`);
  }

  return user.id;
}

// Loads a consultation only if it belongs to this practitioner.
async function ownConsultation(
  db: ReturnType<typeof createSupabaseAdminClient>,
  consultationId: string,
  practitionerId: string
) {
  const { data } = await db
    .from("consultations")
    .select("id, practitioner_id, status, slot_id")
    .eq("id", consultationId)
    .maybeSingle();

  if (!data || data.practitioner_id !== practitionerId) return null;
  return data;
}

export async function setSessionOutcome(formData: FormData) {
  const uid = await requirePractitioner();

  const parsed = outcomeSchema.safeParse({
    consultation_id: formData.get("consultation_id"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) go(`${PAGE}?error=invalid`);

  const { consultation_id, decision } = parsed.data;
  const db = createSupabaseAdminClient();

  const consult = await ownConsultation(db, consultation_id, uid);
  if (!consult) go(`${PAGE}?error=not_found`);

  if (consult.status !== "confirmed") go(`${PAGE}?error=not_confirmed`);

  const { data: slot } = await db
    .from("availability_slots")
    .select("starts_at")
    .eq("id", consult.slot_id)
    .maybeSingle();

  if (!slot || new Date(slot.starts_at).getTime() > Date.now()) {
    go(`${PAGE}?error=not_started`);
  }

  const nextStatus = decision === "complete" ? "completed" : "no_show";

  // Only changes a confirmed booking, so a double click cannot change it twice.
  const { data: updated, error } = await db
    .from("consultations")
    .update({ status: nextStatus })
    .eq("id", consult.id)
    .eq("status", "confirmed")
    .select("id");

  if (error || !updated || updated.length === 0) go(`${PAGE}?error=save`);

  await db.from("audit_log").insert({
    actor_id: uid,
    action: `consult_marked_${nextStatus}`,
    target_table: "consultations",
    target_id: consult.id,
  });

  revalidatePath(PAGE);
  go(`${PAGE}?saved=1`);
}

export async function addNote(formData: FormData) {
  const uid = await requirePractitioner();

  const parsed = noteSchema.safeParse({
    consultation_id: formData.get("consultation_id"),
    body: formData.get("body"),
  });
  if (!parsed.success) go(`${PAGE}?error=note_invalid`);

  const { consultation_id, body } = parsed.data;
  const db = createSupabaseAdminClient();

  const consult = await ownConsultation(db, consultation_id, uid);
  if (!consult) go(`${PAGE}?error=not_found`);

  // Notes are encrypted before they reach the database.
  const { error } = await db.from("consult_notes").insert({
    consultation_id: consult.id,
    author_id: uid,
    body_enc: toPgBytea(encryptField(body)),
  });

  if (error) go(`${PAGE}/${consult.id}?error=save`);

  await db.from("audit_log").insert({
    actor_id: uid,
    action: "consult_note_added",
    target_table: "consult_notes",
    target_id: consult.id,
  });

  revalidatePath(`${PAGE}/${consult.id}`);
  go(`${PAGE}/${consult.id}?saved=1`);
}