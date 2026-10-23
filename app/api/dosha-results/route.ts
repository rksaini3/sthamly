import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { doshaResultSchema } from "@/lib/validation";
import { hasActiveConsent } from "@/lib/consent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Saves the quiz result for the signed-in user.
// The consent screen (next part) must grant "health_logging" before this works.
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

  const parsed = doshaResultSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_result" }, { status: 400 });
  }

  const { quiz_version, scores, primary_dosha } = parsed.data;

  const { data, error } = await supabase
    .from("dosha_results")
    .insert({
      user_id: user.id,
      quiz_version,
      scores,
      primary_dosha,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

// Latest saved result for the signed-in user.
export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("dosha_results")
    .select("id, quiz_version, scores, primary_dosha, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({ result: data });
}