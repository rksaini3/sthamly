import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hasActiveConsent } from "@/lib/consent";
import { encryptBytes } from "@/lib/crypto";
import { MAX_RECORD_BYTES, RECORD_KINDS, RECORDS_BUCKET, UUID_PATTERN, sniffType } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const metaSchema = z.object({
  title: z.string().trim().min(1).max(80),
  kind: z.enum(RECORD_KINDS),
});

// List of reports (no file contents).
export async function GET() {
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

  const { data, error } = await supabase
    .from("medical_records")
    .select("id, title, kind, mime_type, size_bytes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({ records: data ?? [] });
}

// Upload one report. The file is encrypted before it is stored.
export async function POST(request: Request) {
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "no_file" }, { status: 400 });
  }
  if (file.size > MAX_RECORD_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const meta = metaSchema.safeParse({
    title: String(form.get("title") ?? ""),
    kind: String(form.get("kind") ?? ""),
  });
  if (!meta.success) {
    return NextResponse.json({ error: "invalid_meta" }, { status: 400 });
  }

  const plain = Buffer.from(await file.arrayBuffer());
  const mime = sniffType(plain);
  if (!mime) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const id = randomUUID();
  const path = `${user.id}/${id}.bin`;
  const admin = createSupabaseAdminClient();

  const { error: uploadError } = await admin.storage
    .from(RECORDS_BUCKET)
    .upload(path, encryptBytes(plain), {
      contentType: "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  const { error: rowError } = await supabase.from("medical_records").insert({
    id,
    user_id: user.id,
    title: meta.data.title,
    kind: meta.data.kind,
    file_path: path,
    mime_type: mime,
    size_bytes: plain.length,
  });

  if (rowError) {
    // Do not keep an orphan file when the row was not saved.
    await admin.storage.from(RECORDS_BUCKET).remove([path]);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}

// Delete one report: the file first, then its row. If the file delete fails, the row stays, so the user can retry.
export async function DELETE(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // RLS: the user only sees their own rows.
  const { data: row, error: readError } = await supabase
    .from("medical_records")
    .select("file_path")
    .eq("id", id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  const { error: storageError } = await admin.storage.from(RECORDS_BUCKET).remove([row.file_path]);
  if (storageError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  const { error: deleteError } = await supabase.from("medical_records").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}