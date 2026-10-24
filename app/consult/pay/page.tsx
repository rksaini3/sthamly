import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PayButton from "@/components/consult/PayButton";
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

export default async function PayPage({
  searchParams,
}: {
  searchParams: { id?: string; paid?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/consult")}`);
  }

  const id = searchParams.id ?? "";
  if (!UUID_PATTERN.test(id)) notFound();

  const db = createSupabaseAdminClient();

  const { data: consult } = await db
    .from("consultations")
    .select("id, user_id, status, amount_paise, held_until, slot_id, practitioner_id")
    .eq("id", id)
    .maybeSingle();

  if (!consult || consult.user_id !== user.id) notFound();

  const [{ data: slot }, { data: practitioner }] = await Promise.all([
    db.from("availability_slots").select("starts_at").eq("id", consult.slot_id).maybeSingle(),
    db
      .from("practitioners")
      .select("display_name")
      .eq("id", consult.practitioner_id)
      .maybeSingle(),
  ]);

  const amount = (consult.amount_paise / 100).toLocaleString("en-IN");
  const when = slot ? timeFmt.format(new Date(slot.starts_at)) : "—";
  const name = practitioner?.display_name ?? "Practitioner";

  const holdActive =
    consult.status === "pending_payment" &&
    !!consult.held_until &&
    new Date(consult.held_until).getTime() > Date.now();

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">Consultation की पुष्टि</h1>
      </header>

      <section className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <p>
          <span className="font-medium">Practitioner:</span> {name}
        </p>
        <p>
          <span className="font-medium">समय (IST):</span> {when}
        </p>
        <p>
          <span className="font-medium">कुल रकम:</span> ₹{amount}
        </p>
      </section>

      {consult.status === "confirmed" ? (
        <div className="space-y-3 rounded-lg bg-brand-soft p-4 text-sm text-brand">
          <p className="font-medium">आपकी consultation confirm हो गई है।</p>
          <p>Slot से 5 मिनट पहले यहाँ video room का link दिखेगा।</p>
        </div>
      ) : null}

      {holdActive ? (
        <>
          <p className="text-sm text-neutral-700">
            Slot 10 मिनट के लिए आपके नाम पर रखा गया है। इस समय में payment पूरा करें।
          </p>
          <PayButton consultationId={consult.id} initialPaid={searchParams.paid === "1"} />
        </>
      ) : null}

      {consult.status === "pending_payment" && !holdActive ? (
        <div className="space-y-3">
          <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            Hold का समय खत्म हो गया। Slot दोबारा चुनें।
          </p>
          <Link href="/consult" className="text-brand underline">
            Consult list पर जाएँ
          </Link>
        </div>
      ) : null}

      {["cancelled", "expired", "no_show"].includes(consult.status) ? (
        <p className="text-sm text-neutral-700">यह booking अब सक्रिय नहीं है।</p>
      ) : null}

      <p className="text-xs text-neutral-600">
        यह wellness consultation है, diagnosis या इलाज नहीं।
      </p>
    </main>
  );
}