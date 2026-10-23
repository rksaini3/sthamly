import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { askSchema } from "@/lib/validation";
import { checkRedFlags } from "@/lib/safety/red-flags";
import { answerFromApprovedContent } from "@/lib/ai/grounded-answer";
import { AIError } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const parsed = askSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_question" }, { status: 400 });
  }

  // Safety check runs before any AI call.
  const safety = checkRedFlags(parsed.data.question);
  if (safety.flagged) {
    return NextResponse.json({
      status: "safety",
      answer: safety.message,
      sources: [],
    });
  }

  try {
    const result = await answerFromApprovedContent(supabase, parsed.data.question);
    return NextResponse.json(result);
  } catch (err) {
    // Never log the question: it may contain health information.
    if (err instanceof AIError) {
      return NextResponse.json({ error: "ai_unavailable" }, { status: 502 });
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}