"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const BUCKET = "practitioner-docs";
const MAX_BYTES = 5 * 1024 * 1024;
const EXTENSIONS: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const AGREEMENT_VERSION = "1.0";

const textSchema = z.object({
  display_name: z.string().trim().min(3).max(80),
  qualification: z.enum(["BAMS", "MD_Ayurveda"]),
  registration_no: z.string().trim().min(3).max(40),
  registration_council: z.string().trim().min(3).max(120),
  languages: z.string().trim().min(2).max(120),
  specialities: z.string().trim().max(200),
  fee_rupees: z.coerce.number().int().min(200).max(2000),
  bio: z.string().trim().max(500).optional(),
  agreement: z.literal("on"),
});

type UploadResult = { ok: true; path: string } | { ok: false; error: string };

function back(error: string): never {
  redirect(`/practitioner/onboarding?error=${error}`);
}

function splitList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function uploadDoc(
  db: SupabaseClient,
  uid: string,
  kind: "degree" | "registration",
  value: FormDataEntryValue | null
): Promise<UploadResult> {
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false, error: "docs" };
  }
  if (value.size > MAX_BYTES) {
    return { ok: false, error: "file_size" };
  }

  const ext = EXTENSIONS[value.type];
  if (!ext) {
    return { ok: false, error: "file_type" };
  }

  const path = `${uid}/${kind}-${Date.now()}.${ext}`;
  const { error } = await db.storage
    .from(BUCKET)
    .upload(path, value, { contentType: value.type, upsert: false });

  if (error) {
    return { ok: false, error: "upload" };
  }
  return { ok: true, path };
}

export async function submitPractitioner(formData: FormData) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/practitioner/onboarding")}`);
  }

  const get = (key: string) => String(formData.get(key) ?? "");

  const parsed = textSchema.safeParse({
    display_name: get("display_name"),
    qualification: get("qualification"),
    registration_no: get("registration_no"),
    registration_council: get("registration_council"),
    languages: get("languages"),
    specialities: get("specialities"),
    fee_rupees: get("fee_rupees"),
    bio: get("bio") || undefined,
    agreement: formData.get("agreement") === "on" ? "on" : undefined,
  });

  if (!parsed.success) back("invalid");

  const input = parsed.data;
  const db = createSupabaseAdminClient();

  // A verified practitioner's profile is managed by admin, not by this form.
  const { data: existing } = await db
    .from("practitioners")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.verified) back("already_verified");

  const degree = await uploadDoc(db, user.id, "degree", formData.get("degree_doc"));
  if (!degree.ok) back(degree.error);

  const registration = await uploadDoc(
    db,
    user.id,
    "registration",
    formData.get("registration_doc")
  );
  if (!registration.ok) back(registration.error);

  const now = new Date().toISOString();

  const { error: saveError } = await db.from("practitioners").upsert(
    {
      id: user.id,
      display_name: input.display_name,
      qualification: input.qualification,
      registration_no: input.registration_no,
      registration_council: input.registration_council,
      languages: splitList(input.languages),
      specialities: splitList(input.specialities),
      consult_fee_paise: input.fee_rupees * 100,
      bio: input.bio ?? null,
      verified: false,
      is_listed: false,
      agreement_version: AGREEMENT_VERSION,
      agreement_signed_at: now,
      degree_doc_path: degree.path,
      registration_doc_path: registration.path,
    },
    { onConflict: "id" }
  );

  if (saveError) back("save");

  await db.from("consents").insert({
    user_id: user.id,
    purpose: "practitioner_agreement",
    policy_version: AGREEMENT_VERSION,
  });

  await db.from("audit_log").insert({
    actor_id: user.id,
    action: "practitioner_applied",
    target_table: "practitioners",
    target_id: user.id,
  });

  revalidatePath("/admin/practitioners");
  redirect("/practitioner/onboarding?submitted=1");
}