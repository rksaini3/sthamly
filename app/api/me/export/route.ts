import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptField, fromPgBytea } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Returns decrypted text, or null if the field is empty or cannot be decrypted.
function openField(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    return decryptField(fromPgBytea(value));
  } catch {
    return null;
  }
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const uid = user.id;

  const [profile, consents, doshaResults, plans, logs, consults, payments, subs] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase
        .from("consents")
        .select("purpose, policy_version, granted_at, revoked_at")
        .eq("user_id", uid),
      supabase
        .from("dosha_results")
        .select("quiz_version, scores, primary_dosha, created_at")
        .eq("user_id", uid),
      supabase
        .from("daily_plans")
        .select("plan_date, dosha_used, items, rules_version, created_at")
        .eq("user_id", uid),
      supabase
        .from("symptom_logs")
        .select("logged_on, symptoms, severity, note_enc, red_flag, created_at")
        .eq("user_id", uid),
      supabase
        .from("consultations")
        .select("status, amount_paise, created_at, concern_enc")
        .eq("user_id", uid),
      supabase
        .from("payments")
        .select("purpose, amount_paise, status, created_at")
        .eq("user_id", uid),
      supabase
        .from("subscriptions")
        .select("plan_tier, status, current_period_end, created_at")
        .eq("user_id", uid),
    ]);

  const results = [profile, consents, doshaResults, plans, logs, consults, payments, subs];
  if (results.some((r) => r.error)) {
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }

  const exported = {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    consents: consents.data ?? [],
    dosha_results: doshaResults.data ?? [],
    daily_plans: plans.data ?? [],
    symptom_logs: (logs.data ?? []).map(({ note_enc, ...row }) => ({
      ...row,
      note: openField(note_enc),
    })),
    consultations: (consults.data ?? []).map(({ concern_enc, ...row }) => ({
      ...row,
      concern: openField(concern_enc),
    })),
    payments: payments.data ?? [],
    subscriptions: subs.data ?? [],
  };

  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(exported, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sthamly-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}