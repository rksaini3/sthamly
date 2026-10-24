import Link from "next/link";
import { redirect } from "next/navigation";
import { DISCLAIMER } from "@/lib/dosha/descriptions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// General habits that suit most people. Only approved content is shown (RLS enforces this too).
const GENERAL_SLUGS = [
  "general-small-slow-meals",
  "general-short-walk-after-meal",
  "general-screen-free-wind-down",
  "general-calming-breath",
];

type Item = { slug: string; title: string; body_md: string };

const dateLabel = () =>
  new Intl.DateTimeFormat("hi-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

export default async function TodayPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed-in users get their personal plan.
  if (user) redirect("/plan");

  const { data } = await supabase
    .from("content_items")
    .select("slug, title, body_md")
    .in("slug", GENERAL_SLUGS)
    .eq("status", "approved");

  const rows = (data ?? []) as Item[];
  const items = GENERAL_SLUGS.flatMap((slug) => rows.filter((r) => r.slug === slug));

  return (
    <main className="mx-auto min-h-[100dvh] max-w-md space-y-8 px-6 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="font-serif text-xl font-semibold text-brand">
          Sthamly
        </Link>
        <span className="text-sm text-muted">{dateLabel()}</span>
      </header>

      <section className="space-y-2">
        <h1 className="font-serif text-3xl leading-tight text-ink">आज के लिए</h1>
        <p className="text-sm text-muted">
          ये सामान्य आदतें ज़्यादातर लोगों के लिए ठीक रहती हैं। अपने हिसाब से बदलने के लिए नीचे quiz लें।
        </p>
      </section>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-brand-soft p-5 text-sm text-brand">
          आज की सामग्री practitioner की समीक्षा के बाद यहाँ आएगी।
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <li key={item.slug} className="rounded-2xl border border-line bg-surface p-5">
              <h2 className="text-base font-semibold text-ink">{item.title}</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
                {item.body_md}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-2xl bg-surface p-5 shadow-sm">
        <p className="text-sm text-ink">अपनी प्रकृति के हिसाब से plan चाहिए?</p>
        <Link
          href="/quiz"
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-brand px-6 text-base font-medium text-white"
        >
          2 मिनट का quiz (वैकल्पिक)
        </Link>
        <Link href="/login" className="block text-center text-sm text-brand underline underline-offset-4">
          Login करके plan सेव करें
        </Link>
      </div>

      <p className="text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
    </main>
  );
}