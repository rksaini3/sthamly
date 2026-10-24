import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { addNote, setSessionOutcome } from "@/app/practitioner/sessions/actions";
import { decryptField, fromPgBytea } from "@/lib/crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const ERROR_TEXT: Record<string, string> = {
  note_invalid: "Note 3 से 2000 अक्षरों के बीच होना चाहिए।",
  save: "Save नहीं हो सका। दोबारा कोशिश करें।",
  not_found: "Session नहीं मिला।",
  not_confirmed: "यह session अब बदला नहीं जा सकता।",
  not_started: "Session का समय अभी शुरू नहीं हुआ है।",
};

function openNote(value: string): string {
  try {
    return decryptField(fromPgBytea(value));
  } catch {
    return "[यह note पढ़ा नहीं जा सका]";
  }
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: { consultId: string };
  searchParams: { saved?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/practitioner/sessions/${params.consultId}`)}`);
  }

  if (!UUID_PATTERN.test(params.consultId)) notFound();

  const db = createSupabaseAdminClient();

  const { data: practitioner } = await db
    .from("practitioners")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!practitioner?.verified) notFound();

  const { data: consult } = await db
    .from("consultations")
    .select("id, practitioner_id, user_id, status, slot_id")
    .eq("id", params.consultId)
    .maybeSingle();

  if (!consult || consult.practitioner_id !== user.id) notFound();

  const { data: slot } = await db
    .from("availability_slots")
    .select("starts_at")
    .eq("id", consult.slot_id)
    .maybeSingle();

  // Only this practitioner's own notes. Admins do not see them by default.
  const { data: notes } = await db
    .from("consult_notes")
    .select("id, body_enc, created_at, author_id")
    .eq("consultation_id", consult.id)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  const when = slot ? new Date(slot.starts_at) : null;
  const started = when ? when.getTime() <= Date.now() : false;
  const clientCode = consult.user_id.slice(0, 6).toUpperCase();
  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save : null;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <nav>
        <Link href="/practitioner/sessions" className="text-sm text-brand underline">
          ← सभी sessions
        </Link>
      </nav>

      <header>
        <h1 className="text-xl font-semibold text-brand">Client {clientCode}</h1>
        <p className="text-sm text-neutral-700">
          {when ? timeFmt.format(when) : "—"} (IST) · स्थिति: {consult.status}
        </p>
      </header>

      {searchParams.saved ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          Save हो गया।
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      {consult.status === "confirmed" && started ? (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="font-semibold">Session का परिणाम</h2>
          <form action={setSessionOutcome} className="flex flex-wrap gap-2">
            <input type="hidden" name="consultation_id" value={consult.id} />
            <button
              type="submit"
              name="decision"
              value="complete"
              className="rounded-md bg-brand px-3 py-2 text-sm font-medium text-white"
            >
              Session पूरा हुआ
            </button>
            <button
              type="submit"
              name="decision"
              value="user_no_show"
              className="rounded-md border border-neutral-500 px-3 py-2 text-sm font-medium text-neutral-800"
            >
              User नहीं आया
            </button>
          </form>
          <p className="text-xs text-neutral-600">
            "User नहीं आया" चुनने पर session की रकम आपके payout में जुड़ती है और refund नहीं होता।
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">मेरे निजी notes</h2>
        <p className="text-xs text-neutral-600">
          ये notes सिर्फ़ आपको दिखते हैं। ये encrypted रहते हैं।
        </p>

        <form action={addNote} className="space-y-3">
          <input type="hidden" name="consultation_id" value={consult.id} />
          <label htmlFor="body" className="block text-sm font-medium">
            नया note
          </label>
          <textarea
            id="body"
            name="body"
            required
            minLength={3}
            maxLength={2000}
            rows={4}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-brand px-4 py-3 text-sm font-medium text-white"
          >
            Note सेव करें
          </button>
        </form>

        <ul className="space-y-3">
          {(notes ?? []).length === 0 ? (
            <li className="text-sm text-neutral-700">अभी कोई note नहीं।</li>
          ) : null}
          {(notes ?? []).map((n) => (
            <li key={n.id} className="rounded-lg border border-neutral-200 bg-white p-3">
              <p className="text-xs text-neutral-600">
                {timeFmt.format(new Date(n.created_at))}
              </p>
              <p className="mt-1 whitespace-pre-line text-sm text-neutral-900">
                {openNote(n.body_enc as unknown as string)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}