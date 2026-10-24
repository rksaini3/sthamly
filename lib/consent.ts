import type { SupabaseClient } from "@supabase/supabase-js";

// Bump this when the consent wording changes.
// Old consents stay in the table as history. Users must consent again to the new version.
export const CONSENT_VERSION = "1.0";

export type ConsentPurpose =
  | "health_logging"
  | "consult_sharing"
  | "marketing"
  | "practitioner_agreement";

export async function hasActiveConsent(
  supabase: SupabaseClient,
  userId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  const { data, error } = await supabase
    .from("consents")
    .select("id")
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .eq("policy_version", CONSENT_VERSION)
    .is("revoked_at", null)
    .limit(1);

  if (error) {
    throw new Error("consent_lookup_failed");
  }

  return (data ?? []).length > 0;
}

export async function grantConsent(
  supabase: SupabaseClient,
  userId: string,
  purpose: ConsentPurpose
): Promise<void> {
  if (await hasActiveConsent(supabase, userId, purpose)) {
    return;
  }

  const { error } = await supabase.from("consents").insert({
    user_id: userId,
    purpose,
    policy_version: CONSENT_VERSION,
  });

  if (error) {
    throw new Error("consent_save_failed");
  }
}

export async function revokeConsent(
  supabase: SupabaseClient,
  userId: string,
  purpose: ConsentPurpose
): Promise<void> {
  const { error } = await supabase
    .from("consents")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("revoked_at", null);

  if (error) {
    throw new Error("consent_revoke_failed");
  }
}