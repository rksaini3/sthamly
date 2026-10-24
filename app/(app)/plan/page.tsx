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

  // Red-flag rule: if today's log has a flag, show the safety message instead of the plan.
  const todayLogs = (recent ?? []).filter((r) => r.logged_on === today);
  if (todayLogs.some((r) => r.red_flag)) {
    return (
      <main className="mx-auto min-h-screen max-w-md space-y-6 px-4 py-8">
        <h1 className="text-xl font-semibold text-red-800">आज का plan अभी नहीं दिखाया जा सकता</h1>
        <p role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800">
          {EMERGENCY_MESSAGE}
        </p>
        <p className="text-sm text-neutral-700">
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
  });

  const ids = sections.flatMap((s) => s.items.map((i) => i.id));

  // Save today's plan. Re-opening the page updates the same row.
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
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-4 py-8 pb-24">
      <header>
        <p className="text-sm text-neutral-600">आज का plan · {today}</p>
        <h1 className="text-2xl font-semibold text-brand">{view.title}</h1>
        <p className="text-sm text-neutral-700">{view.theme}</p>
      </header>

      {!hasAnyItem ? (
        <p className="rounded-md bg-brand-soft p-4 text-sm text-brand">
          आपके लिए आज का plan तैयार हो रहा है। Content को practitioner review के बाद यहाँ दिखाया जाएगा।
        </p>
      ) : (
        <PlanChecklist dateKey={today} sections={sections} />
      )}

      <p className="rounded-md bg-neutral-100 p-3 text-xs text-neutral-700">{DISCLAIMER}</p>

      <Link href="/track" className="block text-center text-sm text-brand underline">
        आज का लक्षण दर्ज करें
      </Link>
    </main>
  );
}