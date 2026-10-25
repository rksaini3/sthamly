import type { SupabaseClient } from "@supabase/supabase-js";

// Bump this when the consent wording changes.
// Old consents stay in the table as history. Users must consent again to the new version.
export const CONSENT_VERSION = "1.0";

export type ConsentPurpose =
  | "health_logging"
  | "consult_sharing"
  | "marketing"
  | "practitioner_agreement"
  | "medical_records";

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

// Returns true when the consent is saved (or was already active).
// Returns false on a database error, so the caller can answer with a clean message.
export async function grantConsent(
  supabase: SupabaseClient,
  userId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  if (await hasActiveConsent(supabase, userId, purpose)) {
    return true;
  }

  const { error } = await supabase.from("consents").insert({
    user_id: userId,
    purpose,
    policy_version: CONSENT_VERSION,
  });

  return !error;
}

export async function revokeConsent(
  supabase: SupabaseClient,
  userId: string,
  purpose: ConsentPurpose
): Promise<boolean> {
  const { error } = await supabase
    .from("consents")
    .update({ revoked_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("purpose", purpose)
    .is("revoked_at", null);

  return !error;
}