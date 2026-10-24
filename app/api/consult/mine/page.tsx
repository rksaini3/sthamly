import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  invalid: "कुछ गलत हुआ। दोबारा कोशिश करें।",
  not_found: "Booking नहीं मिली।",
  not_cancellable: "यह booking अब रद्द नहीं हो सकती।",
  already_started: "Consultation का समय शुरू हो चुका है, इसलिए रद्द नहीं हो सकती।",
  cancel_failed: "रद्द नहीं हो सका। दोबारा कोशिश करें।",
  refund_failed: "Refund शुरू नहीं हो सका, इसलिए booking वैसी ही रखी गई है। थोड़ी देर बाद दोबारा कोशिश करें।",
};

const STATUS_TEXT: Record<string, string> = {
  pending_payment: "भुगतान बाकी",
  confirmed: "पक्की",
  completed: "पूरी हुई",
  cancelled: "रद्द",
  expired: "समय सीमा खत्म",
  no_show: "नहीं आए",
};

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

// Same rule as refund_for_cancellation in the database.
function refundPercent(startsAt: Date): number {
  const hours = (startsAt.getTime() - Date.now()) / 36e5;
  if (hours > 24) return 100;
  if (hours >= 6) return 50;
  return 0;
}

type Row = {
  id: string;
  status: string;
  amount_paise: number;
  refund_paise: number;
  slot_id: string;
  practitioner_id: string;
  cancelled_by: string | null;
};

export default async function MyConsultsPage({
  searchParams,
}: {
  searchParams: { error?: string; cancelled?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/consult/mine")}`);
  }

  const db = createSupabaseAdminClient();

  const { data: rowsData } = await db
    .from("consultations")
    .select("id, status, amount_paise, refund_paise, slot_id, practitioner_id, cancelled_by")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (rowsData ?? []) as Row[];

  const slotIds = rows.map((r) => r.slot_id);
  const practitionerIds = [...new Set(rows.map((r) => r.practitioner_id))];

  const [{ data: slots }, { data: practitioners }] = await Promise.all([
    slotIds.length
      ? db.from("availability_slots").select("id, starts_at").in("id", slotIds)
      : Promise.resolve({ data: [] as { id: string; starts_at: string }[] }),
    practitionerIds.length
      ? db.from("practitioners").select("id, display_name").in("id", practitionerIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
  ]);

  const startsAt = new Map((slots ?? []).map((s) => [s.id, new Date(s.starts_at)]));
  const names = new Map((practitioners ?? []).map((p) => [p.id, p.display_name]));

  const now = Date.now();
  const upcoming = rows.filter(
    (r) => (r.status === "confirmed" || r.status === "pending_payment") && (startsAt.get(r.slot_id)?.getTime() ?? 0) > now
  );
  const past = rows.filter((r) => !upcoming.includes(r));

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.cancel_failed : null;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">मेरी consultations</h1>
      </header>

      {searchParams.cancelled ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          Consultation रद्द हो गई है। Refund (अगर लागू हो) 5 से 7 कार्यदिवसों में वापस होगा।
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">आने वाली</h2>

        {upcoming.length === 0 ? (
          <p className="text-sm text-neutral-700">
            कोई आने वाली consultation नहीं है।{" "}
            <Link href="/consult" className="text-brand underline">
              Consult बुक करें
            </Link>
          </p>
        ) : null}

        {upcoming.map((r) => {
          const when = startsAt.get(r.slot_id);
          const percent = when ? refundPercent(when) : 0;
          const refundAmount = ((r.amount_paise * percent) / 100 / 100).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          });

          return (
            <article key={r.id} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{names.get(r.practitioner_id) ?? "Practitioner"}</p>
                  <p className="text-sm text-neutral-700">
                    {when ? timeFmt.format(when) : "—"} (IST)
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                  {STATUS_TEXT[r.status] ?? r.status}
                </span>
              </div>

              {r.status === "pending_payment" ? (
                <Link
                  href={`/consult/pay?id=${r.id}`}
                  className="block rounded-md bg-brand px-4 py-2 text-center text-sm font-medium text-white"
                >
                  भुगतान पूरा करें
                </Link>
              ) : null}

              {r.status === "confirmed" ? (
                <>
                  <p className="text-sm text-neutral-700">
                    Video link slot से 5 मिनट पहले यहीं दिखेगा।
                  </p>
                  <div className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-800">
                    <p className="font-medium">अभी रद्द करें तो refund:</p>
                    <p>
                      {percent}% (₹{refundAmount})। 24 घंटे से पहले 100%, 6 से 24 घंटे के बीच 50%,
                      6 घंटे से कम में नहीं।
                    </p>
                  </div>
                  <form action="/api/consult/cancel" method="post">
                    <input type="hidden" name="consultation_id" value={r.id} />
                    <button
                      type="submit"
                      className="w-full rounded-md border border-red-700 px-4 py-2 text-sm font-medium text-red-700"
                    >
                      Consultation रद्द करें
                    </button>
                  </form>
                </>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">पिछली और रद्द</h2>

        {past.length === 0 ? <p className="text-sm text-neutral-700">अभी कुछ नहीं।</p> : null}

        <ul className="space-y-2">
          {past.map((r) => {
            const when = startsAt.get(r.slot_id);
            return (
              <li key={r.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
                <p className="font-medium">{names.get(r.practitioner_id) ?? "Practitioner"}</p>
                <p className="text-neutral-700">
                  {when ? timeFmt.format(when) : "—"} · {STATUS_TEXT[r.status] ?? r.status}
                  {r.refund_paise > 0 ? ` · refund ₹${(r.refund_paise / 100).toLocaleString("en-IN")}` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}