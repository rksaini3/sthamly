import { createHmac, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { refundPayment } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UNIQUE_VIOLATION = "23505";

type PaymentEntity = {
  id: string;
  order_id: string;
  amount: number;
  status: string;
};

type WebhookEvent = {
  event: string;
  payload?: { payment?: { entity: PaymentEntity } };
};

type PaymentRow = {
  id: string;
  user_id: string;
  purpose: string;
  consultation_id: string | null;
  amount_paise: number;
  status: string;
};

// Constant-time check of the HMAC SHA-256 over the raw body.
function signatureMatches(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");

  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  // Read the raw text first. Parsing before checking the signature would break it.
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signatureMatches(rawBody, signature, secret)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }

  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // Idempotency: an event already marked processed is acknowledged and skipped.
  const { error: insertError } = await db
    .from("webhook_events")
    .insert({ id: eventId, event_type: event.event, processed: false });

  if (insertError) {
    if (insertError.code !== UNIQUE_VIOLATION) {
      return NextResponse.json({ error: "store_failed" }, { status: 500 });
    }

    const { data: existing } = await db
      .from("webhook_events")
      .select("processed")
      .eq("id", eventId)
      .maybeSingle();

    if (existing?.processed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    // Not processed yet (an earlier attempt failed). Process it again.
  }

  try {
    await handleEvent(db, event);
  } catch {
    // Returning 500 makes Razorpay retry. Do not log details: they may contain personal data.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }

  await db.from("webhook_events").update({ processed: true }).eq("id", eventId);

  return NextResponse.json({ ok: true });
}

async function handleEvent(db: SupabaseClient, event: WebhookEvent) {
  const payment = event.payload?.payment?.entity;
  if (!payment) return;

  if (event.event === "payment.captured") {
    await onCaptured(db, payment);
  } else if (event.event === "payment.failed") {
    await onFailed(db, payment);
  }
  // Other events are recorded in webhook_events and otherwise ignored.
}

async function onCaptured(db: SupabaseClient, payment: PaymentEntity) {
  const { data: row, error } = await db
    .from("payments")
    .select("id, user_id, purpose, consultation_id, amount_paise, status")
    .eq("razorpay_order_id", payment.order_id)
    .maybeSingle();

  if (error) throw error;
  if (!row) return; // Unknown order. Nothing to confirm.

  const pay = row as PaymentRow;
  if (pay.status === "refunded") return;

  if (payment.amount !== pay.amount_paise) {
    // The money does not match the order. Refund everything that was captured.
    await refundAndMark(db, pay, payment.id, payment.amount, "amount_mismatch");
    return;
  }

  const { error: payError } = await db
    .from("payments")
    .update({ razorpay_payment_id: payment.id, status: "paid" })
    .eq("id", pay.id);

  if (payError) throw payError;

  if (pay.purpose !== "consult" || !pay.consultation_id) return;

  const { data: confirmed, error: confirmError } = await db.rpc("confirm_consultation", {
    p_consult: pay.consultation_id,
    p_payment_id: payment.id,
  });

  if (confirmError) throw confirmError;

  if (confirmed === true) {
    await db.from("audit_log").insert({
      actor_id: null,
      action: "consult_confirmed",
      target_table: "consultations",
      target_id: pay.consultation_id,
    });
    return;
  }

  // Not confirmed: the hold expired, or another payment already confirmed this consultation.
  const { data: consult, error: readError } = await db
    .from("consultations")
    .select("status, payment_id")
    .eq("id", pay.consultation_id)
    .maybeSingle();

  if (readError) throw readError;

  // The same payment delivered twice. Nothing to refund.
  if (consult?.status === "confirmed" && consult.payment_id === payment.id) return;

  await refundAndMark(db, pay, payment.id, payment.amount, "late_or_duplicate_payment");
}

async function onFailed(db: SupabaseClient, payment: PaymentEntity) {
  // Do not overwrite razorpay_payment_id here. A later retry may still succeed on the same order.
  const { error } = await db
    .from("payments")
    .update({ status: "failed" })
    .eq("razorpay_order_id", payment.order_id)
    .eq("status", "created");

  if (error) throw error;
}

async function refundAndMark(
  db: SupabaseClient,
  pay: PaymentRow,
  paymentId: string,
  capturedPaise: number,
  reason: string
) {
  await refundPayment({ paymentId, amountPaise: capturedPaise, reason });

  const { error } = await db
    .from("payments")
    .update({ status: "refunded", razorpay_payment_id: paymentId })
    .eq("id", pay.id);

  if (error) throw error;

  await db.from("audit_log").insert({
    actor_id: null,
    action: `payment_refunded_${reason}`,
    target_table: "payments",
    target_id: pay.id,
  });
}