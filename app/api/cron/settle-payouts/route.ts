import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { previousWeek, settleRange } from "@/lib/payouts/settle";

export const dynamic = "force-dynamic";

// Vercel Cron sends "Authorization: Bearer <CRON_SECRET>".
function isAuthorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);

  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function GET(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const range = previousWeek();

  try {
    const settled = await settleRange(range.start, range.end);
    return NextResponse.json({ ok: true, ...range, consultations_settled: settled });
  } catch (err) {
    // Log without any personal or health data.
    console.error("settle-payouts failed", err instanceof Error ? err.message : "unknown");
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}