import { redirect } from "next/navigation";
import ProfileActions from "@/components/profile/ProfileActions";
import { CONSENT_VERSION, hasActiveConsent } from "@/lib/consent";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/profile")}`);
  }

  const [{ data: profile }, health, consult, marketing] = await Promise.all([
    supabase.from("profiles").select("full_name, phone, city, plan").eq("id", user.id).maybeSingle(),
    hasActiveConsent(supabase, user.id, "health_logging"),
    hasActiveConsent(supabase, user.id, "consult_sharing"),
    hasActiveConsent(supabase, user.id, "marketing"),
  ]);

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-8 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">आपकी profile</h1>
        <dl className="mt-3 space-y-1 text-sm text-neutral-700">
          <div className="flex gap-2">
            <dt className="font-medium">नाम:</dt>
            <dd>{profile?.full_name ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Email:</dt>
            <dd>{user.email ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium">Plan:</dt>
            <dd>{profile?.plan === "plus" ? "Plus" : "Free"}</dd>
          </div>
        </dl>
      </header>

      <ProfileActions
        policyVersion={CONSENT_VERSION}
        initial={{ health_logging: health, consult_sharing: consult, marketing }}
      />
    </main>
  );
}