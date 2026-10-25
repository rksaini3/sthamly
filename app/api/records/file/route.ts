import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasActiveConsent } from "@/lib/consent";
import { decryptBytes } from "@/lib/crypto";
import { RECORDS_BUCKET, UUID_PATTERN } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Decrypts one report for its owner. Nothing is cached.
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!(await hasActiveConsent(supabase, user.id, "medical_records"))) {
    return NextResponse.json({ error: "consent_required" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // RLS: returns a row only if it belongs to this user.
  const { data: row, error: readError } = await supabase
    .from("medical_records")
    .select("file_path, mime_type")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { data: blob, error: downloadError } = await admin.storage
    .from(RECORDS_BUCKET)
    .download(row.file_path);

  if (downloadError || !blob) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  let plain: Buffer;
  try {
    plain = decryptBytes(Buffer.from(await blob.arrayBuffer()));
  } catch {
    return NextResponse.json({ error: "open_failed" }, { status: 500 });
  }

  return new NextResponse(new Uint8Array(plain), {
    status: 200,
    headers: {
      "Content-Type": row.mime_type,
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}