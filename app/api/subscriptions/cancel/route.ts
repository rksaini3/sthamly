import { NextResponse, type NextRequest } from "next/server";
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

  if (!keyId || !keySecret) {
    return NextResponse.redirect(new URL("/plus?error=cancel_failed", request.url), 303);
  }

  const db = createSupabaseAdminClient();

  const { data: subs } = await db
    .from("subscriptions")
    .select("id, razorpay_subscription_id, status")
    .eq("user_id", user.id)
    .in("status", ["authenticated", "active", "pending"]);

  if (!subs || subs.length === 0) {
    return NextResponse.redirect(new URL("/plus?error=none", request.url), 303);
  }

  const auth = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

  for (const sub of subs) {
    // Active subscriptions run to the end of the paid period.
    // Others are cancelled at once, since nothing has been paid yet.
    const atCycleEnd = sub.status === "active";

    try {
      const res = await fetch(`${RAZORPAY_API}/${sub.razorpay_subscription_id}/cancel`, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) throw new Error(`razorpay ${res.status}`);
    } catch (err) {
      console.error("subscription cancel failed", err instanceof Error ? err.message : "unknown");
      return NextResponse.redirect(new URL("/plus?error=cancel_failed", request.url), 303);
    }
  }

  // Final status and plan come from the subscription webhook, not from here.
  return NextResponse.redirect(new URL("/plus?cancelled=1", request.url), 303);
}