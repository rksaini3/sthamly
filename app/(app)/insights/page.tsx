import Link from "next/link";
import { redirect } from "next/navigation";
import { buildWeeklyInsight, bandLabel, type LogRow } from "@/lib/insights";
import { hasActiveConsent } from "@/lib/consent";
import { DISCLAIMER } from "@/lib/dosha/descriptions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { istDateOffset } from "@/lib/time";

export const dynamic = "force-dynamic";

const CHANGE_TEXT = {
  more: "पिछले हफ़्ते से ज़्यादा",
  fewer: "पिछले हफ़्ते से कम",
  same: "पिछले हफ़्ते जैसा",
};

const SCORE_CHANGE_TEXT = {
  up: "पिछले हफ़्ते से बेहतर",
  down: "पिछले हफ़्ते से कम",
  same: "पिछले हफ़्ते जैसा",
  none: "",
};

export default async function InsightsPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/insights")}`);
  }

  if (!(await hasActiveConsent(supabase, user.id, "health_logging"))) {
    redirect(`/consent?next=${encodeURIComponent("/insights")}`);
  }

  // 56 दिन: forecast के लिए 8 हफ़्ते का डेटा चाहिए।
  const { data, error } = await supabase
    .from("symptom_logs")
    .select("logged_on, symptoms, severity")
    .gte("logged_on", istDateOffset(-55));

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-8 pb-24">
        <p className="error-box">डेटा नहीं मिला। बाद में फिर देखें।</p>
      </main>
    );
  }

  const insight = buildWeeklyInsight((data ?? []) as LogRow[]);
  const { week, scoreChange, top, forecast } = insight;

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <h1 className="text-2xl font-semibold text-brand">इस हफ़्ते का balance</h1>

      <section className="card space-y-3 text-center">
        {week.score === null ? (
          <>
            <p className="text-sm text-muted">Score के लिए कम से कम 2 दिन check-in करें।</p>
            <p className="text-sm font-medium text-ink">{week.checkinDays} / 2</p>
            <Link href="/track" className="btn-link">
              आज का check-in
            </Link>
          </>
        ) : (
          <>
            <p className="text-5xl font-semibold text-brand">{week.score}</p>
            <p className="font-medium text-ink">{bandLabel(week.score)}</p>
            {scoreChange !== "none" && (
              <p className="text-sm text-muted">{SCORE_CHANGE_TEXT[scoreChange]}</p>
            )}
            <p className="text-xs text-muted">
              7 में से {week.checkinDays} दिन check-in · {week.ease ?? 0}% हल्के दिन
            </p>
          </>
        )}
      </section>

      {top.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-ink">पैटर्न (14 दिन)</h2>
          <ul className="space-y-2">
            {top.map((t) => (
              <li key={t.symptom} className="card flex items-center justify-between p-4">
                <span className="font-medium text-ink">{t.label}</span>
                <span className="text-xs text-muted">
                  {t.days} दिन · {CHANGE_TEXT[t.change]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-ink">अगले 7 दिन</h2>

        {!forecast.ready ? (
          <div className="card space-y-2">
            <p className="text-sm text-muted">
              पैटर्न बन रहा है। अभी {forecast.checkinDays} / {forecast.needed} दिन जमा हैं।
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-brand"
                style={{
                  width: `${Math.min(100, Math.round((forecast.checkinDays / forecast.needed) * 100))}%`,
                }}
              />
            </div>
          </div>
        ) : forecast.days.length === 0 ? (
          <p className="card text-sm text-muted">अगले 7 दिनों में कोई खास पैटर्न नहीं दिख रहा।</p>
        ) : (
          <ul className="space-y-3">
            {forecast.days.map((d) => (
              <li key={d.date} className="card space-y-2 p-4">
                <p className="font-medium text-ink">{d.weekday}</p>
                <ul className="space-y-1 text-sm text-muted">
                  {d.items.map((i) => (
                    <li key={i.symptom}>
                      {i.label}: check-in वाले {i.of} {d.weekday} में से {i.hits} बार दिखा
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-muted">
        यह आपकी logs का पैटर्न है। {DISCLAIMER}
      </p>
    </main>
  );
}