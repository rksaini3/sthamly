import Link from "next/link";
import { reviewPractitioner } from "@/app/admin/practitioners/actions";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  invalid: "फ़ॉर्म में गलती है। दोबारा कोशिश करें।",
  checks: "Approve से पहले दोनों जाँच (council और नाम) tick करें।",
  save: "Save नहीं हो सका। दोबारा कोशिश करें।",
};

type Row = {
  id: string;
  display_name: string;
  qualification: string;
  registration_no: string;
  registration_council: string;
  verified: boolean;
  is_listed: boolean;
  agreement_version: string | null;
  consult_fee_paise: number;
  created_at: string;
};

export default async function PractitionersPage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  await requireAdmin();

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("practitioners")
    .select(
      "id, display_name, qualification, registration_no, registration_council, verified, is_listed, agreement_version, consult_fee_paise, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-8">
        <p role="alert" className="text-red-700">
          Practitioners लोड नहीं हुए।
        </p>
      </main>
    );
  }

  // Unverified first, so pending applications are at the top.
  const rows = ((data ?? []) as Row[]).sort((a, b) => Number(a.verified) - Number(b.verified));
  const pending = rows.filter((r) => !r.verified).length;

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-8">
      <nav>
        <Link href="/admin/content" className="text-sm text-brand underline">
          Content review पर जाएँ
        </Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold text-brand">Practitioner verification</h1>
        <p className="mt-1 text-sm text-neutral-700">
          कुल {rows.length} · Pending: {pending}
        </p>
      </header>

      {searchParams.saved ? (
        <p role="status" className="rounded-md bg-brand-soft p-3 text-sm text-brand">
          Save हो गया।
        </p>
      ) : null}

      {errorText ? (
        <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {errorText}
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-700">अभी कोई practitioner नहीं है।</p>
      ) : null}

      <ul className="space-y-4">
        {rows.map((p) => {
          const status = p.verified ? (p.is_listed ? "Listed" : "Verified, not listed") : "Pending";
          const fee = (p.consult_fee_paise / 100).toLocaleString("en-IN");

          return (
            <li key={p.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.display_name}</p>
                  <p className="text-sm text-neutral-700">
                    {p.qualification} · Reg. {p.registration_no}
                  </p>
                  <p className="text-sm text-neutral-700">Council: {p.registration_council}</p>
                  <p className="text-sm text-neutral-700">फ़ीस: ₹{fee} / 30 मिनट</p>
                  <p className="text-xs text-neutral-600">
                    Agreement: {p.agreement_version ?? "अभी साइन नहीं"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
                  {status}
                </span>
              </div>

              <form action={reviewPractitioner} className="mt-4 space-y-3">
                <input type="hidden" name="id" value={p.id} />

                {!p.verified || !p.is_listed ? (
                  <fieldset className="space-y-2 text-sm">
                    <legend className="sr-only">Approve से पहले जाँच</legend>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="check_council" className="h-4 w-4 accent-brand" />
                      {p.registration_council} पर registration जाँची
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="check_name" className="h-4 w-4 accent-brand" />
                      नाम documents से मेल खाता है
                    </label>
                  </fieldset>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {!p.verified || !p.is_listed ? (
                    <button
                      type="submit"
                      name="decision"
                      value="approve"
                      className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white"
                    >
                      Approve और list करें
                    </button>
                  ) : null}

                  {!p.verified ? (
                    <button
                      type="submit"
                      name="decision"
                      value="reject"
                      className="rounded-md border border-red-700 px-4 py-2 text-sm font-medium text-red-700"
                    >
                      Reject
                    </button>
                  ) : null}

                  {p.verified && p.is_listed ? (
                    <button
                      type="submit"
                      name="decision"
                      value="suspend"
                      className="rounded-md border border-neutral-500 px-4 py-2 text-sm font-medium text-neutral-800"
                    >
                      Listing बंद करें
                    </button>
                  ) : null}
                </div>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}