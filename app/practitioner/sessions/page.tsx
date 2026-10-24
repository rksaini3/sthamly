import Link from "next/link";
import { redirect } from "next/navigation";
import { setSessionOutcome } from "@/app/practitioner/sessions/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const STATUS_TEXT: Record<string, string> = {
  confirmed: "पक्की",
  completed: "पूरी हुई",
  no_show: "User नहीं आया",
  cancelled: "रद्द",
  expired: "समय सीमा खत्म",
};

const ERROR_TEXT: Record<string, string> = {
  invalid: "कुछ गलत हुआ। दोबारा कोशिश करें।",
  not_found: "Session नहीं मिला।",
  not_confirmed: "यह session अब बदला नहीं जा सकता।",
  not_started: "Session का समय अभी शुरू नहीं हुआ है।",
  not_verified: "Sessions तभी दिखेंगे जब आपका account verify हो जाए।",
  save: "Save नहीं हो सका। दोबारा कोशिश करें।",
};

type Row = {
  id: string;
  user_id: string;
  status: string;
  slot_id: string;
};

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/practitioner/sessions")}`);
  }

  const db = createSupabaseAdminClient();

  const { data: practitioner } = await db
    .from("practitioners")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!practitioner?.verified) {
    return (
      <main className="mx-auto min-h-screen max-w-md space-y-4 px-4 py-8">
        <h1 className="text-xl font-semibold text-brand">Sessions</h1>
        <p className="text-sm text-neutral-700">Verification के बाद यहाँ आपके sessions दिखेंगे।</p>
      </main>
    );
  }

  const { data: rowsData } = await db
    .from("consultations")
    .select("id, user_id, status, slot_id")
    .eq("practitioner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (rowsData ?? []) as Row[];
  const slotIds = rows.map((r) => r.slot_id);

  const { data: slotsData } = slotIds.length
    ? await db.from("availability_slots").select("id, starts_at").in("id", slotIds)
    : { data: [] as { id: string; starts_at: string }[] };

  const startsAt = new Map((slotsData ?? []).map((s) => [s.id, new Date(s.starts_at)]));
  const now = Date.now();

  const withTime = rows
    .map((r) => ({ ...r, when: startsAt.get(r.slot_id) ?? null }))
    .filter((r) => r.when !== null) as (Row & { when: Date })[];

  const upcoming = withTime
    .filter((r) => r.status === "confirmed" && r.when.getTime() > now)
    .sort((a, b) => a.when.getTime() - b.when.getTime());

  const recent = withTime
    .filter((r) => !(r.status === "confirmed" && r.when.getTime() > now))
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 50);

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save : null;

  function Card({ r, showActions }: { r: Row & { when: Date }; showActions: boolean }) {
    const clientCode = r.user_id.slice(0, 6).toUpperCase();
    const started = r.when.getTime() <= Date.now();

    return (
      <li className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">Client {clientCode}</p>
            <p className="text-sm text-neutral-700">{timeFmt.format(r.when)} (IST)</p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
            {STATUS_TEXT[r.status] ?? r.status}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={`${"/practitioner/sessions"}/${r.id}`} className="text-sm text-brand underline">
            Session और notes
          </Link>
        </div>

        {showActions && r.status === "confirmed" && started ? (
          <form action={setSessionOutcome} className="flex flex-wrap gap-2">
            <input type="hidden" name="consultation_id" value={r.id} />
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
        ) : null}
      </li>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">मेरे sessions</h1>
        <p className="mt-1 text-sm text-neutral-700">
          User का नाम नहीं दिखाया जाता। सिर्फ़ client code दिखता है।
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

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">आने वाले</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-neutral-700">कोई आने वाला session नहीं है।</p>
        ) : null}
        <ul className="space-y-3">
          {upcoming.map((r) => (
            <Card key={r.id} r={r} showActions={false} />
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">पिछले</h2>
        {recent.length === 0 ? <p className="text-sm text-neutral-700">अभी कुछ नहीं।</p> : null}
        <ul className="space-y-3">
          {recent.map((r) => (
            <Card key={r.id} r={r} showActions={true} />
          ))}
        </ul>
      </section>
    </main>
  );
}