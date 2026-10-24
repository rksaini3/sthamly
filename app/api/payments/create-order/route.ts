import { NextResponse } from "next/server";
import { z } from "zod";
import { createRazorpayOrder, razorpayEnv } from "@/lib/payments/razorpay";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ consultation_id: z.string().uuid() });

// A hold lasts 10 minutes. Reuse an open order for up to 9 minutes so retries do not create many orders.
const REUSE_WINDOW_MS = 9 * 60 * 1000;

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
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const consultationId = parsed.data.consultation_id;
  const db = createSupabaseAdminClient();

  const { data: consult } = await db
    .from("consultations")
    .select("id, user_id, status, amount_paise, held_until")
    .eq("id", consultationId)
    .maybeSingle();

  if (!consult || consult.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (consult.status !== "pending_payment") {
    return NextResponse.json({ error: "not_payable" }, { status: 409 });
  }

  if (!consult.held_until || new Date(consult.held_until).getTime() <= Date.now()) {
    return NextResponse.json({ error: "hold_expired" }, { status: 409 });
  }

  let keyId: string;
  try {
    keyId = razorpayEnv().RAZORPAY_KEY_ID;
  } catch {
    return NextResponse.json({ error: "payments_not_configured" }, { status: 500 });
  }

  // Reuse a recent open order for the same amount.
  const { data: recent } = await db
    .from("payments")
    .select("razorpay_order_id, amount_paise")
    .eq("consultation_id", consult.id)
    .eq("status", "created")
    .gte("created_at", new Date(Date.now() - REUSE_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let orderId: string;

  if (recent && recent.amount_paise === consult.amount_paise) {
    orderId = recent.razorpay_order_id;
  } else {
    try {
      const order = await createRazorpayOrder({
        amountPaise: consult.amount_paise,
        receipt: consult.id,
        notes: { consultation_id: consult.id },
      });
      orderId = order.id;
    } catch {
      return NextResponse.json({ error: "order_failed" }, { status: 502 });
    }

    const { error: insertError } = await db.from("payments").insert({
      user_id: user.id,
      purpose: "consult",
      consultation_id: consult.id,
      razorpay_order_id: orderId,
      amount_paise: consult.amount_paise,
      status: "created",
    });

    if (insertError) {
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({
    key_id: keyId,
    order_id: orderId,
    amount: consult.amount_paise,
    currency: "INR",
  });
}