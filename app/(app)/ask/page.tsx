import { redirect } from "next/navigation";
import AskBox from "@/components/ask/AskBox";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/ask")}`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">Sthamly से पूछें</h1>
        <p className="mt-1 text-sm text-neutral-700">
          जवाब सिर्फ practitioner-approved content से मिलते हैं। हर जवाब अपना स्रोत भी बताता है।
        </p>
      </header>

      <AskBox />
    </main>
  );
}