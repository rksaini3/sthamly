import { NextResponse } from "next/server";
import { z } from "zod";
import { refundPayment } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const formSchema = z.object({ consultation_id: z.string().uuid() });

// Browser form POST. Redirects back to the bookings page with a short code.
function go(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return go(request, `/login?next=${encodeURIComponent("/consult/mine")}`);
  }

  const form = await request.formData();
  const parsed = formSchema.safeParse({ consultation_id: form.get("consultation_id") });
  if (!parsed.success) {
    return go(request, "/consult/mine?error=invalid");
  }

  const consultationId = parsed.data.consultation_id;
  const db = createSupabaseAdminClient();

  const { data: consult } = await db
    .from("consultations")
    .select("id, user_id, status, amount_paise, payment_id, slot_id")
    .eq("id", consultationId)
    .maybeSingle();

  if (!consult || consult.user_id !== user.id) {
    return go(request, "/consult/mine?error=not_found");
  }

  if (consult.status !== "confirmed") {
    return go(request, "/consult/mine?error=not_cancellable");
  }

  const { data: slot } = await db
    .from("availability_slots")
    .select("starts_at")
    .eq("id", consult.slot_id)
    .maybeSingle();

  if (!slot || new Date(slot.starts_at).getTime() <= Date.now()) {
    return go(request, "/consult/mine?error=already_started");
  }

  // Refund amount, calculated in the database from the same rule shown to the user.
  const { data: refundValue, error: calcError } = await db.rpc("refund_for_cancellation", {
    p_consult: consult.id,
    p_by: "user",
  });

  if (calcError || refundValue === null || refundValue === undefined) {
    return go(request, "/consult/mine?error=cancel_failed");
  }

  const refundPaise = Number(refundValue);

  // Step 1: mark cancelled, only if it is still confirmed. This blocks double submits.
  const { data: updated, error: updateError } = await db
    .from("consultations")
    .update({
      status: "cancelled",
      cancelled_by: "user",
      cancelled_at: new Date().toISOString(),
      cancel_reason: "user_request",
      refund_paise: refundPaise,
    })
    .eq("id", consult.id)
    .eq("status", "confirmed")
    .select("id");

  if (updateError || !updated || updated.length === 0) {
    return go(request, "/consult/mine?error=cancel_failed");
  }

  // Step 2: refund if the rule gives any amount back.
  if (refundPaise > 0) {
    if (!consult.payment_id) {
      await revertCancellation(db, consult.id);
      return go(request, "/consult/mine?error=cancel_failed");
    }

    try {
      await refundPayment({
        paymentId: consult.payment_id,
        amountPaise: refundPaise,
        reason: "user_cancel",
      });
    } catch {
      // Put the booking back so the user can try again. Do not log details.
      await revertCancellation(db, consult.id);
      return go(request, "/consult/mine?error=refund_failed");
    }

    // Full refund: mark the payment row. Partial refunds are tracked in consultations.refund_paise.
    if (refundPaise === consult.amount_paise) {
      await db
        .from("payments")
        .update({ status: "refunded" })
        .eq("razorpay_payment_id", consult.payment_id);
    }
  }

  await db.from("audit_log").insert({
    actor_id: user.id,
    action: "consult_cancelled_by_user",
    target_table: "consultations",
    target_id: consult.id,
  });

  return go(request, "/consult/mine?cancelled=1");
}

async function revertCancellation(
  db: ReturnType<typeof createSupabaseAdminClient>,
  consultationId: string
) {
  await db
    .from("consultations")
    .update({
      status: "confirmed",
      cancelled_by: null,
      cancelled_at: null,
      cancel_reason: null,
      refund_paise: 0,
    })
    .eq("id", consultationId)
    .eq("status", "cancelled");
}