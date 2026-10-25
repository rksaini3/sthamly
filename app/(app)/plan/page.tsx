import Link from "next/link";
import { redirect } from "next/navigation";
import PlanChecklist from "@/components/plan/PlanChecklist";
import { hasActiveConsent } from "@/lib/consent";
import { describe, DISCLAIMER } from "@/lib/dosha/descriptions";
import { buildPlan, PLAN_RULES_VERSION, type PlanSection } from "@/lib/dosha/plan-rules";
import type { DoshaResult } from "@/lib/dosha/types";
import { EMERGENCY_MESSAGE } from "@/lib/safety/red-flags";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Symptom } from "@/lib/symptoms";
import { istDateOffset, istMonthIndex } from "@/lib/time";

export const dynamic = "force-dynamic";

const SECTION_LABELS: Record<PlanSection, string> = {
  food: "खाना",
  routine: "दिनचर्या",
  yoga: "योग",
  skin: "त्वचा",
};

const SECTION_ORDER: PlanSection[] = ["food", "routine", "yoga", "skin"];

type PlanItemRow = { id: string; slug: string; title: string; body_md: string };

export default async function PlanPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/plan")}`);
  }

  if (!(await hasActiveConsent(supabase, user.id, "health_logging"))) {
    redirect(`/consent?next=${encodeURIComponent("/plan")}`);
  }

  const { data: dosha, error: doshaError } = await supabase
    .from("dosha_results")
    .select("primary_dosha")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (doshaError) throw new Error("plan_load_failed");
  if (!dosha) redirect("/quiz");

  const today = istDateOffset(0);
  const { data: recent, error: logError } = await supabase
    .from("symptom_logs")
    .select("logged_on, symptoms, red_flag")
    .gte("logged_on", istDateOffset(-2));

  if (logError) throw new Error("plan_load_failed");

  // Red-flag rule: अगर आज के log में flag है, तो plan की जगह safety message दिखे
  const todayLogs = (recent ?? []).filter((r) => r.logged_on === today);
  if (todayLogs.some((r) => r.red_flag)) {
    return (
      <main className="mx-auto max-w-md space-y-6 px-5 pt-8">
        <h1 className="text-2xl font-semibold text-red-800">आज का plan अभी नहीं दिखाया जा सकता</h1>
        <p role="alert" className="error-box">
          {EMERGENCY_MESSAGE}
        </p>
        <p className="text-sm text-muted">
          अगर मन में खुद को नुकसान पहुँचाने के विचार हैं, तो Tele-MANAS को 14416 पर कॉल करें।
        </p>
      </main>
    );
  }

  const primary = dosha.primary_dosha as DoshaResult;
  const recentSymptoms = new Set<Symptom>(
    (recent ?? []).flatMap((r) => r.symptoms as Symptom[])
  );

  const plan = buildPlan({
    primary,
    month: istMonthIndex(),
    recentSymptoms,
  });

  const allSlugs = [...new Set(Object.values(plan.sections).flat())];

  const { data: itemRows, error: itemError } = await supabase
    .from("content_items")
    .select("id, slug, title, body_md")
    .in("slug", allSlugs)
    .eq("status", "approved");

  if (itemError) throw new Error("plan_load_failed");

  const bySlug = new Map((itemRows ?? []).map((row) => [row.slug, row as PlanItemRow]));

  const sections = SECTION_ORDER.map((section) => {
    const items = plan.sections[section].flatMap((slug) => {
      const row = bySlug.get(slug);
      return row ? [row] : [];
    });
    return { section, label: SECTION_LABELS[section], items };
  }).filter((s) => s.items.length > 0);

  const ids = sections.flatMap((s) => s.items.map((i) => i.id));

  // आज का plan सेव करें। पेज दोबारा खोलने पर वही row अपडेट होती है।
  await supabase.from("daily_plans").upsert(
    {
      user_id: user.id,
      plan_date: today,
      dosha_used: primary,
      items: ids,
      rules_version: PLAN_RULES_VERSION,
    },
    { onConflict: "user_id,plan_date" }
  );

  const view = describe(primary);
  const hasAnyItem = ids.length > 0;

  return (
    <main className="mx-auto max-w-md space-y-8 px-5 pt-8">
      <header className="space-y-1">
        <p className="eyebrow">आज का plan · {today}</p>
        <h1 className="text-3xl font-semibold leading-tight text-brand">{view.title}</h1>
        <p className="text-[15px] text-muted">{view.theme}</p>
      </header>

      {/* Check-in सबसे ऊपर: plan इसी से बदलता है */}
      <Link href="/track" className="card flex items-center justify-between gap-4">
        <span>
          <span className="block text-base font-semibold text-ink">आज कैसा महसूस हो रहा है?</span>
          <span className="mt-1 block text-sm text-muted">1 मिनट में दर्ज करें, plan उसी हिसाब से बदलेगा</span>
        </span>
        <span aria-hidden="true" className="text-2xl text-brand">
          →
        </span>
      </Link>

      {hasAnyItem ? (
        <PlanChecklist dateKey={today} sections={sections} />
      ) : (
        <section className="space-y-4">
          <div className="card space-y-3">
            <h2 className="text-base font-semibold text-ink">आज के लिए 3 छोटे सुझाव</h2>
            <ul className="space-y-2 text-[15px] text-ink">
              {view.balance.map((t) => (
                <li key={t} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="notice text-muted">
            पूरा plan (खाना, दिनचर्या, योग और त्वचा) एक योग्य practitioner की समीक्षा के बाद यहाँ जुड़ेगा। तब तक ये सुझाव आपके साथ हैं।
          </p>
        </section>
      )}

      <p className="text-xs leading-relaxed text-muted">{DISCLAIMER}</p>
    </main>
  );
}