import { markPayoutSent } from "@/app/admin/payouts/actions";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  invalid: "Reference कम से कम 4 अक्षरों का होना चाहिए।",
  save: "Save नहीं हो सका। दोबारा कोशिश करें।",
};

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

type PayoutRow = {
  id: string;
  practitioner_id: string;
  period_start: string;
  period_end: string;
  amount_paise: number;
  consult_count: number;
  status: string;
  reference: string | null;
  sent_at: string | null;
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requireAdmin();

  const db = createSupabaseAdminClient();

  const { data: payoutData } = await db
    .from("payouts")
    .select(
      "id, practitioner_id, period_start, period_end, amount_paise, consult_count, status, reference, sent_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const payouts = (payoutData ?? []) as PayoutRow[];

  const practitionerIds = [...new Set(payouts.map((p) => p.practitioner_id))];
  const { data: practitioners } = practitionerIds.length
    ? await db.from("practitioners").select("id, display_name").in("id", practitionerIds)
    : { data: [] as { id: string; display_name: string }[] };

  const names = new Map((practitioners ?? []).map((p) => [p.id, p.display_name]));

  const pending = payouts.filter((p) => p.status === "pending");
  const sent = payouts.filter((p) => p.status !== "pending");

  const errorText = searchParams.error
    ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8">
      <header>
        <h1 className="text-xl font-semibold text-brand">Payouts</h1>
        <p className="text-xs text-neutral-600">
          बैंक से भेजने के बाद UTR या reference नंबर डालें।
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
        <h2 className="text-lg font-semibold">बाकी ({pending.length})</h2>

        {pending.length === 0 ? (
          <p className="text-sm text-neutral-700">कोई pending payout नहीं।</p>
        ) : null}

        {pending.map((p) => (
          <article key={p.id} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
            <div>
              <p className="font-semibold">{names.get(p.practitioner_id) ?? "Practitioner"}</p>
              <p className="text-sm text-neutral-700">
                {p.period_start} से {p.period_end} तक · {p.consult_count} sessions ·{" "}
                <span className="font-medium">{rupees(p.amount_paise)}</span>
              </p>
            </div>

            <form action={markPayoutSent} className="space-y-2">
              <input type="hidden" name="payout_id" value={p.id} />
              <label htmlFor={`ref-${p.id}`} className="block text-sm font-medium">
                UTR / reference
              </label>
              <input
                id={`ref-${p.id}`}
                name="reference"
                required
                minLength={4}
                maxLength={60}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
              />
              <button
                type="submit"
                className="w-full rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
              >
                भेजा गया, चिह्नित करें
              </button>
            </form>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">भेजे गए</h2>

        {sent.length === 0 ? (
          <p className="text-sm text-neutral-700">अभी कुछ नहीं।</p>
        ) : null}

        <ul className="space-y-2">
          {sent.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-3 text-sm">
              <p className="font-medium">{names.get(p.practitioner_id) ?? "Practitioner"}</p>
              <p className="text-neutral-700">
                {rupees(p.amount_paise)} · {p.status} · ref: {p.reference ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}