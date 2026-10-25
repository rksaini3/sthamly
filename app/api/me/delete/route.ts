import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { RECORDS_BUCKET } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The user must type DELETE to confirm.
const bodySchema = z.object({ confirm: z.literal("DELETE") });

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!bodySchema.safeParse(body).success) {
    return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const uid = user.id;

  // 1. Block deletion while a paid subscription is still active.
  const { data: activeSubs, error: subError } = await admin
    .from("subscriptions")
    .select("id")
    .eq("user_id", uid)
    .eq("status", "active");

  if (subError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  if ((activeSubs ?? []).length > 0) {
    return NextResponse.json({ error: "cancel_subscription_first" }, { status: 409 });
  }

  // 2. Medical report files come first. If a file cannot be removed, stop here so nothing is lost silently.
  const { data: recordFiles, error: recordListError } = await admin
    .from("medical_records")
    .select("file_path")
    .eq("user_id", uid);

  if (recordListError) {
    return NextResponse.json({ error: "delete_partial" }, { status: 500 });
  }

  const recordPaths = (recordFiles ?? []).map((r) => r.file_path as string);
  if (recordPaths.length > 0) {
    const { error: storageError } = await admin.storage.from(RECORDS_BUCKET).remove(recordPaths);
    if (storageError) {
      return NextResponse.json({ error: "delete_partial" }, { status: 500 });
    }
  }

  // 3. Delete health and preference data outright.
  const removals = await Promise.all([
    admin.from("medical_records").delete().eq("user_id", uid),
    admin.from("symptom_logs").delete().eq("user_id", uid),
    admin.from("daily_plans").delete().eq("user_id", uid),
    admin.from("dosha_results").delete().eq("user_id", uid),
    admin.from("consents").delete().eq("user_id", uid),
  ]);

  // 4. Keep billing rows for legal retention, but remove the health text in them.
  const billingScrub = await admin
    .from("consultations")
    .update({ concern_enc: null })
    .eq("user_id", uid);

  // 5. Anonymise the profile. The row stays because billing rows point to it.
  const profileScrub = await admin
    .from("profiles")
    .update({
      full_name: null,
      phone: null,
      city: null,
      deleted_at: new Date().toISOString(),
    })
    .eq("id", uid);

  // 6. Remove the email and block login. Access tokens expire within an hour.
  const authScrub = await admin.auth.admin.updateUserById(uid, {
    email: `deleted-${uid}@deleted.invalid`,
    ban_duration: "876000h",
  });

  const failed = [...removals, billingScrub, profileScrub].some((r) => r.error) || !!authScrub.error;

  // Audit entry. It records the action only, not any personal data.
  await admin.from("audit_log").insert({
    actor_id: uid,
    action: "account_deleted",
    target_table: "profiles",
    target_id: uid,
  });

  if (failed) {
    // Do not log details here: they may contain personal data.
    return NextResponse.json({ error: "delete_partial" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}