import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { PLUS_STATUSES } from "@/lib/subscriptions/status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function signatureValid(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = Buffer.from(createHmac("sha256", secret).update(rawBody).digest("hex"));
  const given = Buffer.from(signature);

  return expected.length === given.length && timingSafeEqual(expected, given);
}

type SubscriptionEntity = {
  id: string;
  status: string;
  current_end?: number | null;
};

type WebhookBody = {
  event: string;
  payload?: { subscription?: { entity?: SubscriptionEntity } };
};

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!signatureValid(rawBody, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) {
    return NextResponse.json({ error: "missing_event_id" }, { status: 400 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  // Idempotency: a repeated event id is accepted and skipped.
  const { error: insertError } = await db
    .from("webhook_events")
    .insert({ id: eventId, event_type: body.event });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  try {
    const entity = body.payload?.subscription?.entity;

    if (!body.event.startsWith("subscription.") || !entity) {
      await db.from("webhook_events").update({ processed: true }).eq("id", eventId);
      return NextResponse.json({ ok: true, ignored: true });
    }

    const { data: sub } = await db
      .from("subscriptions")
      .select("id, user_id")
      .eq("razorpay_subscription_id", entity.id)
      .maybeSingle();

    if (!sub) {
      // Unknown subscription. Accept it so Razorpay does not retry forever.
      console.warn("unknown subscription event", body.event);
      await db.from("webhook_events").update({ processed: true }).eq("id", eventId);
      return NextResponse.json({ ok: true, unknown: true });
    }

    const periodEnd = entity.current_end
      ? new Date(entity.current_end * 1000).toISOString()
      : null;

    await db
      .from("subscriptions")
      .update({ status: entity.status, current_period_end: periodEnd })
      .eq("id", sub.id);

    // Plus only while the user has at least one active subscription.
    const { data: activeRows } = await db
      .from("subscriptions")
      .select("id")
      .eq("user_id", sub.user_id)
      .in("status", PLUS_STATUSES)
      .limit(1);

    const plan = (activeRows ?? []).length > 0 ? "plus" : "free";

    await db.from("profiles").update({ plan }).eq("id", sub.user_id);

    await db.from("webhook_events").update({ processed: true }).eq("id", eventId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    // Remove the marker so Razorpay's retry is processed, not skipped as a duplicate.
    console.error("subscription webhook failed", err instanceof Error ? err.message : "unknown");
    await db.from("webhook_events").delete().eq("id", eventId);
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}