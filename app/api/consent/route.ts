import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENT_VERSION, grantConsent, hasActiveConsent } from "@/lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PURPOSES = ["health_logging", "consult_sharing", "marketing"] as const;

const bodySchema = z.object({
  purpose: z.enum(PURPOSES),
  action: z.enum(["grant", "revoke"]),
});

// Current state of each consent purpose for the signed-in user.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("consents")
    .select("purpose, revoked_at")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const consents = PURPOSES.map((purpose) => ({
    purpose,
    active: (data ?? []).some((row) => row.purpose === purpose && row.revoked_at === null),
  }));

  return NextResponse.json({ policy_version: CONSENT_VERSION, consents });
}

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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_consent" }, { status: 400 });
  }

  const { purpose, action } = parsed.data;

  if (action === "grant") {
    if (await hasActiveConsent(supabase, user.id, purpose)) {
      return NextResponse.json({ ok: true, changed: false });
    }
    const saved = await grantConsent(supabase, user.id, purpose);
    if (!saved) {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, changed: true });
  }

  // Revoke: mark every active row for this purpose as revoked.
  const { error } = await supabase
    .from("consents")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("purpose", purpose)
    .is("revoked_at", null);

  if (error) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, changed: true });
}