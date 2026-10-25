import { redirect } from "next/navigation";
import RecordsClient, { type RecordRow } from "@/components/records/RecordsClient";
import { hasActiveConsent } from "@/lib/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function RecordsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/records")}`);
  }

  const consented = await hasActiveConsent(supabase, user.id, "medical_records");

  let records: RecordRow[] = [];
  if (consented) {
    const { data } = await supabase
      .from("medical_records")
      .select("id, title, kind, mime_type, size_bytes, created_at")
      .order("created_at", { ascending: false });
    records = (data ?? []) as RecordRow[];
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <h1 className="text-2xl font-semibold text-brand">मेरी reports</h1>
      <RecordsClient initialConsent={consented} initialRecords={records} />
    </main>
  );
}