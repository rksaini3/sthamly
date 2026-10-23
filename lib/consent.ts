import type { SupabaseClient } from "@supabase/supabase-js";

export const CONSENT_VERSION = "1.0";

export async function hasActiveConsent(
  supabase: SupabaseClient,
  userId: string,
  purpose: string
): Promise<boolean> {
  const { count, error } = await supabase
    .from("consents")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("revoked_at", null);

  if (error) return false;
  return (count ?? 0) > 0;
}

export async function grantConsent(
  supabase: Sup