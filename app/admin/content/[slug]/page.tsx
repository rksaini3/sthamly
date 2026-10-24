import Link from "next/link";
import { notFound } from "next/navigation";
import { saveContent } from "@/app/admin/content/actions";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ERROR_TEXT: Record<string, string> = {
  invalid: "फ़ॉर्म में गलती है। Title और text की लंबाई जाँचें।",
  placeholder: "Approve नहीं हो सकता: text में अभी placeholder बचा है।",
  claims: "Approve नहीं हो सकता: बीमारी या इलाज वाले शब्द हटाएँ।",
  reviewer: "Approve के लिए एक verified practitioner reviewer चुनें।",
  notfound: "Item नहीं मिला।",
  save: "Save नहीं हो सका। दोबारा कोशिश करें।",
};

const STATUSES = ["draft", "in_review", "approved", "retired"] as const;

export default async function EditContentPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { saved?: string; error?: string };
}) {
  await requireAdmin();

  const db = createSupabaseAdminClient();

  const { data: item } = await db
    .from("content_items")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!item) notFound();

  const { data: reviewers } = await db
    .from("practitioners")
    .select("id, display_name, qualification")
    .eq("verified", true)
    .order("display_name");

  const errorText = searchParams.error ? ERROR_TEXT[searchParams.error] ?? ERROR_TEXT.save : null;

  return (
    <main className="mx-auto min-h-screen max-w-2xl space-y-6 px-4 py-8">
      <nav>
        <Link href="/admin/content" className="text-sm text-brand underline">
          ← सभी content
        </Link>
      </nav>

      <header>
        <h1 className="text-xl font-semibold text-brand">{item.slug}</h1>
        <p className="text-sm text-neutral-700">
          Kind: {item.kind} · Version: {item.version} · Status: {item.status}
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

      <form action={saveContent} className="space-y-5">
        <input type="hidden" name="id" value={item.id} />
        <input type="hidden" name="slug" value={item.slug} />

        <div>
          <label htmlFor="title" className="block text-sm font-medium">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            minLength={3}
            maxLength={120}
            defaultValue={item.title}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="body_md" className="block text-sm font-medium">
            Text (सरल भाषा में, कोई बीमारी का claim नहीं)
          </label>
          <textarea
            id="body_md"
            name="body_md"
            required
            minLength={20}
            maxLength={5000}
            rows={12}
            defaultValue={item.body_md}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-base"
          />
        </div>

        <div>
          <label htmlFor="source_ref" className="block text-sm font-medium">
            Source (ग्रंथ या practitioner note)
          </label>
          <input
            id="source_ref"
            name="source_ref"
            maxLength={200}
            defaultValue={item.source_ref ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={item.status}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="reviewer_id" className="block text-sm font-medium">
            Reviewer (approve के लिए ज़रूरी)
          </label>
          <select
            id="reviewer_id"
            name="reviewer_id"
            defaultValue={item.reviewed_by ?? ""}
            className="mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2"
          >
            <option value="">— चुनें —</option>
            {(reviewers ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.display_name} ({r.qualification})
              </option>
            ))}
          </select>
          {(reviewers ?? []).length === 0 ? (
            <p className="mt-1 text-xs text-neutral-600">
              अभी कोई verified practitioner नहीं है। पहले practitioner को verify करें।
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-brand px-4 py-3 text-base font-medium text-white"
        >
          Save करें
        </button>
      </form>
    </main>
  );
}