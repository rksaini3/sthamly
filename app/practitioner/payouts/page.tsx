import { notFound, redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const STATUS_TEXT: Record<string, string> = {
  pending: "बाकी (जल्द भेजा जाएगा)",
  sent: "भेजा गया",
  failed: "नहीं जा सका, support से संपर्क करें",
};

type PayoutRow = {
  id: string;
  period_start: string;
  period_end: string;
  amount_paise: number;
  consult_count: number;
  status: string;
  reference: string | null;
  sent_at: string | null;
};

type UnsettledRow = {
  payout_paise: number;
  refund_paise: number;
};

export default async function PractitionerPayoutsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/practitioner/payouts")}`);
  }

  const db = createSupabaseAdminClient();

  const { data: practitioner } = await db
    .from("practitioners")
    .select("verified")
    .eq("id", user.id)
    .maybeSingle();

  if (!practitioner?.verified) notFound();

  // Every query is filtered to this practitioner's own id.
  const [{ data: payoutData }, { data: unsettledData }] = await Promise.all([
    db
      .from("payouts")
      .select("id, period_start, period_end, amount_paise, consult_count, status, reference, sent_at")
      .eq("practitioner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60),
    db
      .from("consultations")
      .select("payout_paise, refund_paise")
      .eq("practitioner_id", user.id)
      .in("status", ["completed", "no_show"])
      .is("payout_id", null),
  ]);

  const payouts = (payoutData ?? []) as PayoutRow[];
  const unsettled = (unsettledData ?? []) as UnsettledRow[];

  const unsettledPaise = unsettled.reduce(
    (sum, c) => sum + Math.max(c.payout_paise - c.refund_paise, 0),
    0
  );
  const pendingPaise = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount_paise, 0);
  const sentPaise = payouts
    .filter((p) => p.status === "sent")
    .reduce((sum, p) => sum + p.amount_paise, 0);

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">मेरी कमाई</h1>
        <p className="text-sm text-neutral-700">
          हर हफ़्ते (सोमवार से रविवार, IST) के पूरे हुए sessions का हिसाब यहाँ दिखता है।
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-600">अभी हिसाब में (अगले सप्ताह में जुड़ेगा)</p>
          <p className="text-xl font-semibold">{rupees(unsettledPaise)}</p>
          <p className="text-xs text-neutral-600">{unsettled.length} sessions</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-600">भेजने के लिए तैयार</p>
          <p className="text-xl font-semibold">{rupees(pendingPaise)}</p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-600">अब तक भेजा गया</p>
          <p className="text-xl font-semibold">{rupees(sentPaise)}</p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">हफ़्तेवार हिसाब</h2>

        {payouts.length === 0 ? (
          <p className="text-sm text-neutral-700">अभी कोई payout नहीं बना है।</p>
        ) : null}

        <ul className="space-y-3">
          {payouts.map((p) => (
            <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4 text-sm">
              <p className="font-medium">
                {dateFmt.format(new Date(p.period_start))} से{" "}
                {dateFmt.format(new Date(p.period_end))} तक
              </p>
              <p className="text-neutral-700">
                {p.consult_count} sessions · <span className="font-medium">{rupees(p.amount_paise)}</span>
              </p>
              <p className="mt-1 text-neutral-700">{STATUS_TEXT[p.status] ?? p.status}</p>
              {p.status === "sent" ? (
                <p className="text-xs text-neutral-600">
                  Reference: {p.reference ?? "—"}
                  {p.sent_at ? ` · ${dateFmt.format(new Date(p.sent_at))}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-800">
        <p className="font-medium">भुगतान कैसे होता है</p>
        <p>
          Practitioner की रकम हर हफ़्ते बैंक ट्रांसफ़र से भेजी जाती है। भेजने के बाद यहाँ
          reference नंबर दिखेगा। रद्द हुए sessions पर refund की रकम payout से काटी जाती है।
        </p>
      </section>
    </main>
  );
}