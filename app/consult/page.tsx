import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchOpenSlots } from "@/lib/consult/slots";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Practitioner = {
  id: string;
  display_name: string;
  qualification: string;
  specialities: string[];
  languages: string[];
  consult_fee_paise: number;
  bio: string | null;
};

export default async function ConsultListPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/consult")}`);
  }

  const db = createSupabaseAdminClient();

  const { data, error } = await db
    .from("practitioners")
    .select("id, display_name, qualification, specialities, languages, consult_fee_paise, bio")
    .eq("verified", true)
    .eq("is_listed", true)
    .order("display_name");

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-8">
        <p role="alert" className="text-red-700">
          Practitioners लोड नहीं हुए।
        </p>
      </main>
    );
  }

  const practitioners = (data ?? []) as Practitioner[];
  const slots = await fetchOpenSlots(
    db,
    practitioners.map((p) => p.id)
  );

  const countBy = new Map<string, number>();
  for (const s of slots) {
    countBy.set(s.practitioner_id, (countBy.get(s.practitioner_id) ?? 0) + 1);
  }

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-4 py-8 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-brand">Consult बुक करें</h1>
        <p className="mt-1 text-sm text-neutral-700">
          Verified BAMS या MD (Ayurveda) practitioners के साथ 30 मिनट की wellness consultation।
          यह diagnosis या इलाज नहीं है।
        </p>
      </header>

      {practitioners.length === 0 ? (
        <p className="text-sm text-neutral-700">अभी कोई practitioner उपलब्ध नहीं है। जल्द ही वापस देखें।</p>
      ) : null}

      <ul className="space-y-4">
        {practitioners.map((p) => {
          const open = countBy.get(p.id) ?? 0;
          const fee = (p.consult_fee_paise / 100).toLocaleString("en-IN");

          return (
            <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <Link href={`/consult/${p.id}`} className="block">
                <p className="font-semibold text-brand">{p.display_name}</p>
                <p className="text-sm text-neutral-700">
                  {p.qualification === "MD_Ayurveda" ? "MD (Ayurveda)" : p.qualification}
                  {p.specialities.length > 0 ? ` · ${p.specialities.join(", ")}` : ""}
                </p>
                <p className="mt-1 text-sm text-neutral-700">भाषा: {p.languages.join(", ")}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-medium">₹{fee} / 30 मिनट</span>
                  <span className={open > 0 ? "text-brand" : "text-neutral-500"}>
                    {open > 0 ? `${open} slots खुले` : "अभी slot नहीं"}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}