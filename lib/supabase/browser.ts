import { createBrowserClient } from "@supabase/ssr";

// Browser client. Uses only the public URL and anon key.
// Never import the service role key in browser code.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}