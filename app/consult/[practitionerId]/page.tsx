import { notFound, redirect } from "next/navigation";
import { fetchOpenSlots } from "@/lib/consult/slots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f-]{36}$/i;

const ERROR_TEXT: Record<string, string> = {
  taken: "यह slot अभी किसी और ने ले लिया है। कोई और समय चुनें।",
  too_soon: "यह slot बहुत जल्दी है। कोई बाद का समय चुनें।",
  unavailable: "यह slot अब उपलब्ध नहीं है।",
  practitioner: "Practitioner अभी बुकिंग नहीं ले रहे।",
  self: "आप खुद से consultation नहीं बुक कर सकते।",
  invalid: "कुछ गलत हुआ। दोबारा कोशिश करें।",
  hold_failed: "Slot hold नहीं हो सका। दोबारा कोशिश करें।",
};

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dayLabel = new Intl.DateTimeFormat("hi-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "long",
  day: "numeric",
  month: "long",
});

const timeLabel = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export default async function PractitionerPage({
  params,
  searchParams,
}: {
  params: { practitionerId: string };
  searchParams: { error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/consult/${params.practitionerId}`)}`);
  }

  if (!UUID_PATTERN.test(params.practitionerId)) notFound();

  const db = createSupabaseAdminClient();

  const { data: p } = await db
    .from("practitioners")
    .select("id, display_name, qualification, specialities, languages, consult_fee_paise, bio")
    .eq("id", params.practitionerId)
    .eq("verified", true)
    .eq("is_listed", true)
    .maybeSingle();

  if (!p) notFound();

  const slots = await fetchOpenSlots(db, [p.id]);

  // Group slots by IST day.
  const days = new Map<string, { label: string; items: typeof slots }>();
  for (const s of slots) {
    const d = new Date(s.starts_at);
    const key = dayKey.format(d);
    if (!days.has(key)) {
      days.set(key, { label: dayLabel.format(d), items: [] });
    }
    days.get(key)!.items.push(s);
  }

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.hold_failed : null;
  const fee = (p.consult_fee_paise / 100).toLocaleString("en-IN");

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-brand">{p.display_name}</h1>
        <p className="text-sm text-neutral-700">
          {p.qualification === "MD_Ayurveda" ? "MD (Ayurveda)" : p.qualification}
          {p.specialities.length > 0 ? ` · ${p.specialities.join(", ")}` : ""}
        </p>
        <p className="text-sm text-neutral-700">भाषा: {p.languages.join(", ")}</p>
        {p.bio ? <p className="text-sm text-neutral-800">{p.bio}</p> : null}
        <p className="font-medium">₹{fee} / 30 मिनट</p>
      </header>

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">खुले slots (IST, अगले 14 दिन)</h2>

        {days.size === 0 ? (
          <p className="text-sm text-neutral-700">अभी कोई slot खुला नहीं है।</p>
        ) : null}

        {[...days.entries()].map(([key, day]) => (
          <div key={key} className="space-y-2">
            <h3 className="text-sm font-medium text-neutral-800">{day.label}</h3>
            <div className="flex flex-wrap gap-2">
              {day.items.map((s) => (
                <form key={s.id} action="/api/consult/hold" method="post">
                  <input type="hidden" name="slot_id" value={s.id} />
                  <input type="hidden" name="practitioner_id" value={p.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-brand bg-white px-4 py-2 text-sm text-brand"
                  >
                    {timeLabel.format(new Date(s.starts_at))}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-2 rounded-lg bg-neutral-100 p-4 text-xs leading-relaxed text-neutral-700">
        <h2 className="text-sm font-semibold text-neutral-900">Consultation की शर्तें</h2>
        <p>यह wellness consultation है, diagnosis या इलाज नहीं। Medicine लिखी नहीं जाएगी।</p>
        <p>
          Slot चुनने पर 10 मिनट के लिए रुकता है। इस समय में payment पूरा करें, नहीं तो slot फिर खुल जाएगा।
        </p>
        <p>
          रद्द करने पर refund: 24 घंटे से पहले 100%, 6 से 24 घंटे के बीच 50%, 6 घंटे से कम में नहीं।
          (यह नीति अभी lawyer की समीक्षा में है।)
        </p>
      </section>
    </main>
  );
}