import { NextResponse, type NextRequest } from "next/server";
import { BLOCKING_STATUSES } from "@/lib/subscriptions/status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const RAZORPAY_API = "https://api.razorpay.com/v1/subscriptions";

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent("/plus")}`, request.url),
      303
    );
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const planId = process.env.RAZORPAY_PLUS_PLAN_ID;

  if (!keyId || !keySecret || !planId) {
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  const db = createSupabaseAdminClient();

  const { data: existing } = await db
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .in("status", BLOCKING_STATUSES)
    .limit(1);

  if ((existing ?? []).length > 0) {
    return NextResponse.redirect(new URL("/profile?error=already_plus", request.url), 303);
  }

  // Only the user id goes to Razorpay, in notes. No health data or email is sent here.
  let created: { id: string; short_url: string; status: string };
  try {
    const res = await fetch(RAZORPAY_API, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 120,
        customer_notify: 1,
        notes: { user_id: user.id },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`razorpay ${res.status}`);
    created = await res.json();
  } catch (err) {
    console.error("subscription create failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.redirect(new URL("/profile?error=start_failed", request.url), 303);
  }

  const { error } = await db.from("subscriptions").insert({
    user_id: user.id,
    razorpay_subscription_id: created.id,
    plan_tier: "plus",
    status: created.status,
  });

  if (error) {
    console.error("subscription save failed", error.message);
    return NextResponse.redirect(new URL("/profile?error=start_failed", request.url), 303);
  }

  // Send the user to Razorpay's hosted page to approve the mandate and pay.
  return NextResponse.redirect(created.short_url, 303);
}