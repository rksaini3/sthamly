import { createClient } from "@supabase/supabase-js";

// Service role bypasses Row Level Security. Server code only.
export function createSupabaseAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("Admin client must not run in the browser");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase admin environment variables are missing");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}