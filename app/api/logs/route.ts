import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logSchema } from "@/lib/validation";
import { checkRedFlags, EMERGENCY_MESSAGE, SELF_HARM_MESSAGE } from "@/lib/safety/red-flags";
import { hasActiveConsent } from "@/lib/consent";
import { encryptField, decryptField, toPgBytea, fromPgBytea } from "@/lib/crypto";
import { istDateOffset } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Save a symptom check-in.
export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveConsent(supabase, user.id, "health_logging"))) {
    return NextResponse.json({ error: "consent_required" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = logSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_log" }, { status: 400 });
  }

  const { symptoms, severity, note } = parsed.data;

  // Red-flag check on the free-text note. The flag is stored, and the UI shows the safety message.
  const safety = note ? checkRedFlags(note) : { flagged: false as const };
  const redFlag = safety.flagged;

  const { error } = await supabase.from("symptom_logs").insert({
    user_id: user.id,
    symptoms,
    severity,
    note_enc: note ? toPgBytea(encryptField(note)) : null,
    red_flag: redFlag,
  });

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  if (safety.flagged) {
    const message =
      safety.kind === "self_harm" ? SELF_HARM_MESSAGE : EMERGENCY_MESSAGE;
    return NextResponse.json({ saved: true, safety: safety.kind, message });
  }

  return NextResponse.json({ saved: true });
}

// Last 14 days of logs for the Track page. Notes are decrypted for the owner only.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("symptom_logs")
    .select("id, logged_on, symptoms, severity, note_enc, red_flag, created_at")
    .gte("logged_on", istDateOffset(-13))
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const logs = (data ?? []).map((row) => {
    let note: string | null = null;
    if (row.note_enc) {
      try {
        note = decryptField(fromPgBytea(row.note_enc as unknown as string));
      } catch {
        note = null; // Do not expose decryption errors to the client.
      }
    }
    return {
      id: row.id,
      logged_on: row.logged_on,
      symptoms: row.symptoms,
      severity: row.severity,
      note,
      red_flag: row.red_flag,
    };
  });

  return NextResponse.json({ logs });
}