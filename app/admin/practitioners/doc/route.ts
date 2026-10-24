import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;
const SIGNED_URL_SECONDS = 120;

// Opens one practitioner document for an admin. Every view is logged.
// GET /admin/practitioners/doc?id=<practitioner-uuid>&kind=degree|registration
export async function GET(request: Request) {
  const admin = await requireAdmin();

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? "";
  const kind = url.searchParams.get("kind") ?? "";

  if (!UUID_PATTERN.test(id) || (kind !== "degree" && kind !== "registration")) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = createSupabaseAdminClient();

  const { data: practitioner, error: readError } = await db
    .from("practitioners")
    .select("degree_doc_path, registration_doc_path")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  const path =
    kind === "degree" ? practitioner?.degree_doc_path : practitioner?.registration_doc_path;

  if (!path) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: signed, error: signError } = await db.storage
    .from("practitioner-docs")
    .createSignedUrl(path, SIGNED_URL_SECONDS);

  if (signError || !signed) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  await db.from("audit_log").insert({
    actor_id: admin.id,
    action: `practitioner_doc_${kind}_viewed`,
    target_table: "practitioners",
    target_id: id,
  });

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
    headers: { "Cache-Control": "no-store" },
  });
}