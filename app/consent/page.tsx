import { redirect } from "next/navigation";
import ConsentForm from "@/components/consent/ConsentForm";
import { CONSENT_VERSION, hasActiveConsent } from "@/lib/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Allow only paths inside this site.
function safeNext(value?: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/plan";
  }
  return value;
}

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = safeNext(searchParams.next);

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const back = `/consent?next=${encodeURIComponent(next)}`;
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  const [health, consult, marketing] = await Promise.all([
    hasActiveConsent(supabase, user.id, "health_logging"),
    hasActiveConsent(supabase, user.id, "consult_sharing"),
    hasActiveConsent(supabase, user.id, "marketing"),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 py-8">
      <ConsentForm
        next={next}
        policyVersion={CONSENT_VERSION}
        initial={{
          health_logging: health,
          consult_sharing: consult,
          marketing,
        }}
      />
    </main>
  );
}