import { redirect } from "next/navigation";
import TrackClient from "@/components/track/TrackClient";
import { hasActiveConsent } from "@/lib/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TrackPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/track")}`);
  }

  if (!(await hasActiveConsent(supabase, user.id, "health_logging"))) {
    redirect(`/consent?next=${encodeURIComponent("/track")}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <TrackClient />
    </main>
  );
}