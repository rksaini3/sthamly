import ResultClient from "@/components/quiz/ResultClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasActiveConsent } from "@/lib/consent";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  searchParams,
}: {
  searchParams: { save?: string };
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasConsent = user
    ? await hasActiveConsent(supabase, user.id, "health_logging")
    : false;

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      <ResultClient
        loggedIn={!!user}
        hasConsent={hasConsent}
        autoSave={searchParams.save === "1"}
      />
    </main>
  );
}