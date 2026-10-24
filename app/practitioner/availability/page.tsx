import Link from "next/link";
import { redirect } from "next/navigation";
import { addRule, deleteRule, regenerateSlots } from "@/app/practitioner/availability/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKDAYS = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];

const ERROR_TEXT: Record<string, string> = {
  invalid: "समय सही नहीं है। दोबारा भरें।",
  invalid_range: "End time, start time के बाद होना चाहिए।",
  too_long: "एक दिन में अधिकतम 12 घंटे रखे जा सकते हैं।",
  half_hours: "समय 30 मिनट के हिसाब से हो, जैसे 18:00 या 18:30।",
  overlap: "यह समय पहले से दिए गए समय से overlap करता है।",
  not_verified: "Availability तभी सेट होगी जब आपका account verify हो जाए।",
  refresh: "Slots बनाने में समस्या हुई। दोबारा कोशिश करें।",
  save: "Save नहीं हो सका। दोबारा कोशिश करें।",
};

const SAVED_TEXT: Record<string, string> = {
  added: "समय जोड़ दिया गया और slots बन गए।",
  deleted: "समय हटा दिया गया।",
  regenerated: "Slots दोबारा बन गए।",
  "1": "Save हो गया।",
};

type Rule = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/practitioner/availability")}`);
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
        <h1 className="text-xl font-semibold text-brand">Availability</h1>
        <p className="text-sm text-neutral-700">
          Verification पूरा होने के बाद यहाँ अपने समय सेट कर सकेंगे।
        </p>
        <Link href="/practitioner/onboarding" className="text-brand underline">
          Onboarding पर जाएँ
        </Link>
      </main>
    );
  }

  const { data: rulesData } = await supabase
    .from("availability_rules")
    .select("id, weekday, start_time, end_time")
    .eq("practitioner_id", user.id)
    .eq("active", true)
    .order("weekday")
    .order("start_time");

  const rules = (rulesData ?? []) as Rule[];

  const { count: upcoming } = await db
    .from("availability_slots")
    .select("id", { count: "exact", head: true })
    .eq("practitioner_id", user.id)
    .gt("starts_at", new Date().toISOString());

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save : null;
  const savedText = searchParams.saved ? SAVED_TEXT[searchParams.saved] ?? SAVED_TEXT["1"] : null;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">आपका समय</h1>
        <p className="mt-1 text-sm text-neutral-700">
          हर हफ्ते के लिए समय चुनें। Sthamly अगले 30 दिनों के 30-मिनट के slots अपने-आप बनाएगा।
        </p>
        <p className="mt-2 text-sm text-neutral-700">आगे के खुले slots: {upcoming ?? 0}</p>
      </header>

      {savedText ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          {savedText}
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">मौजूदा समय</h2>

        {rules.length === 0 ? (
          <p className="text-sm text-neutral-700">अभी कोई समय नहीं है।</p>
        ) : null}

        <ul className="space-y-2">
          {rules.map((rule) => (
            <li
              key={rule.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3"
            >
              <span className="text-sm">
                <span className="font-medium">{WEEKDAYS[rule.weekday]}</span>{" "}
                {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
              </span>
              <form action={deleteRule}>
                <input type="hidden" name="id" value={rule.id} />
                <button type="submit" className="text-sm text-red-700 underline">
                  हटाएँ
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">नया समय जोड़ें</h2>

        <form action={addRule} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div>
            <label htmlFor="weekday" className="block text-sm font-medium">
              दिन
            </label>
            <select
              id="weekday"
              name="weekday"
              required
              className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
            >
              {WEEKDAYS.map((label, i) => (
                <option key={label} value={i}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="start_time" className="block text-sm font-medium">
                शुरू
              </label>
              <input
                id="start_time"
                name="start_time"
                type="time"
                step={1800}
                required
                defaultValue="18:00"
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="end_time" className="block text-sm font-medium">
                खत्म
              </label>
              <input
                id="end_time"
                name="end_time"
                type="time"
                step={1800}
                required
                defaultValue="20:00"
                className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white"
          >
            समय जोड़ें
          </button>
        </form>
      </section>

      <form action={regenerateSlots}>
        <button
          type="submit"
          className="w-full rounded-md border border-brand px-4 py-3 text-base font-medium text-brand"
        >
          Slots दोबारा बनाएँ
        </button>
      </form>
    </main>
  );
}