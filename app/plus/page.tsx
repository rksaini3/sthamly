import Link from "next/link";
import { redirect } from "next/navigation";
import { BLOCKING_STATUSES } from "@/lib/subscriptions/status";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Edit this list to match the product spec. Keep claims about health out.
const PLUS_BENEFITS = [
  "सभी दिनचर्या योजनाएँ और पूरा हफ़्तेवार trend",
  "Symptom log का पूरा इतिहास",
  "Export और data सुरक्षा के सभी विकल्प",
];

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const ERROR_TEXT: Record<string, string> = {
  already_plus: "आपकी Plus सदस्यता पहले से चालू है।",
  start_failed: "अभी शुरू नहीं हो सका। थोड़ी देर बाद दोबारा कोशिश करें।",
  none: "कोई सक्रिय सदस्यता नहीं मिली।",
  cancel_failed: "रद्द नहीं हो सका। थोड़ी देर बाद दोबारा कोशिश करें।",
};

export default async function PlusPage({
  searchParams,
}: {
  searchParams: { error?: string; cancelled?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/plus")}`);
  }

  const db = createSupabaseAdminClient();

  const { data: subs } = await db
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", user.id)
    .in("status", BLOCKING_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1);

  const current = subs?.[0] ?? null;
  const isPlus = current?.status === "active";
  const errorText = searchParams.error
    ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.start_failed
    : null;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <nav>
        <Link href="/profile" className="text-sm text-brand underline">
          ← प्रोफ़ाइल
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold text-brand">Sthamly Plus</h1>
        <p className="text-sm text-neutral-700">
          मासिक सदस्यता। कभी भी रद्द करें, Plus बिलिंग अवधि के अंत तक चलता है।
        </p>
      </header>

      {searchParams.cancelled ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          सदस्यता रद्द हो गई है। आपकी Plus सुविधाएँ मौजूदा अवधि के अंत तक चलेंगी।
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">इसमें क्या है</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-900">
          {PLUS_BENEFITS.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      {isPlus ? (
        <section className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
          <p className="font-semibold text-brand">आपकी Plus सदस्यता चालू है।</p>
          {current?.current_period_end ? (
            <p className="text-sm text-neutral-700">
              अगला बिलिंग अवधि अंत: {dateFmt.format(new Date(current.current_period_end))}
            </p>
          ) : null}

          <form action="/api/subscriptions/cancel" method="post">
            <button
              type="submit"
              className="w-full rounded-md border border-red-700 px-4 py-2 text-sm font-medium text-red-700"
            >
              सदस्यता रद्द करें
            </button>
          </form>
        </section>
      ) : current ? (
        <section className="rounded-md bg-neutral-100 p-3 text-sm text-neutral-800">
          आपकी सदस्यता प्रक्रिया में है (स्थिति: {current.status})। भुगतान पूरा होने के बाद
          Plus चालू हो जाएगा।
        </section>
      ) : (
        <form action="/api/subscriptions/start" method="post">
          <button
            type="submit"
            className="w-full rounded-md bg-brand px-4 py-3 text-sm font-medium text-white"
          >
            Plus शुरू करें
          </button>
        </form>
      )}

      <p className="text-xs text-neutral-600">
        यह एक स्वयं-चिंतन और जीवनशैली का उपकरण है। यह चिकित्सा सलाह या इलाज नहीं है।
      </p>
    </main>
  );
}