import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formSchema = z.object({
  slot_id: z.string().uuid(),
  practitioner_id: z.string().uuid(),
});

// Browser form POST. Redirects back to the picker with a short error code,
// or forward to the payment page with the new consultation id.
function go(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

function errorCode(message: string): string {
  if (message.includes("slot_taken")) return "taken";
  if (message.includes("slot_too_soon")) return "too_soon";
  if (message.includes("slot_unavailable")) return "unavailable";
  if (message.includes("practitioner_unavailable")) return "practitioner";
  if (message.includes("self_booking")) return "self";
  return "hold_failed";
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return go(request, `/login?next=${encodeURIComponent("/consult")}`);
  }

  const form = await request.formData();
  const parsed = formSchema.safeParse({
    slot_id: form.get("slot_id"),
    practitioner_id: form.get("practitioner_id"),
  });

  if (!parsed.success) {
    return go(request, "/consult?error=invalid");
  }

  const { slot_id, practitioner_id } = parsed.data;
  const db = createSupabaseAdminClient();

  const { data, error } = await db.rpc("hold_consultation", {
    p_user: user.id,
    p_slot: slot_id,
  });

  if (error || !data) {
    const code = errorCode(error?.message ?? "");
    return go(request, `/consult/${practitioner_id}?error=${code}`);
  }

  return go(request, `/consult/pay?id=${data}`);
}