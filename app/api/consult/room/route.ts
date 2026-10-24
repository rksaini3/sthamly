import { NextResponse } from "next/server";
import { createMeetingToken, getOrCreateRoom } from "@/lib/video/daily";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const MIN = 60 * 1000;
const EARLY_JOIN_MS = 10 * MIN;
const LATE_JOIN_MS = 35 * MIN;
const ROOM_LIFETIME_MS = 40 * MIN;

function go(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

// GET /api/consult/room?id=<consultation-id>
// Redirects the participant to the video room, only inside the join window.
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return go(request, `/login?next=${encodeURIComponent("/consult/mine")}`);
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID_PATTERN.test(id)) {
    return go(request, "/consult/mine?error=invalid");
  }

  const db = createSupabaseAdminClient();

  const { data: consult } = await db
    .from("consultations")
    .select("id, user_id, practitioner_id, status, slot_id")
    .eq("id", id)
    .maybeSingle();

  const isClient = consult?.user_id === user.id;
  const isPractitioner = consult?.practitioner_id === user.id;

  if (!consult || (!isClient && !isPractitioner)) {
    return go(request, "/consult/mine?error=not_found");
  }

  const backPath = isPractitioner ? `/practitioner/sessions/${id}` : "/consult/mine";

  if (consult.status !== "confirmed") {
    return go(request, `${backPath}?error=not_joinable`);
  }

  const { data: slot } = await db
    .from("availability_slots")
    .select("starts_at")
    .eq("id", consult.slot_id)
    .maybeSingle();

  if (!slot) {
    return go(request, `${backPath}?error=not_found`);
  }

  const start = new Date(slot.starts_at).getTime();
  const now = Date.now();

  if (now < start - EARLY_JOIN_MS || now > start + LATE_JOIN_MS) {
    return go(request, `${backPath}?error=not_in_window`);
  }

  const nbf = Math.floor((start - EARLY_JOIN_MS) / 1000);
  const exp = Math.floor((start + ROOM_LIFETIME_MS) / 1000);
  const roomName = `sthamly-${consult.id}`;

  try {
    const room = await getOrCreateRoom(roomName, nbf, exp);

    const token = await createMeetingToken({
      room: room.name,
      label: isPractitioner ? "Practitioner" : "Client",
      owner: isPractitioner,
      nbf,
      exp,
    });

    // Store the room URL once, for records. Re-joining does not change it.
    await db
      .from("consultations")
      .update({ video_room_url: room.url })
      .eq("id", consult.id)
      .is("video_room_url", null);

    return NextResponse.redirect(`${room.url}?t=${token}`, { status: 303 });
  } catch {
    // Do not log details. They can include room or token data.
    return go(request, `${backPath}?error=room_failed`);
  }
}