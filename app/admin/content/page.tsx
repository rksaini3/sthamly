import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  in_review: "Review में",
  approved: "Approved",
  retired: "Retired",
};

export default async function ContentListPage() {
  await requireAdmin();

  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from("content_items")
    .select("id, slug, kind, title, status, version, updated_at")
    .order("slug");

  if (error) {
    return (
      <main className="mx-auto min-h-screen max-w-md px-4 py-8">
        <p role="alert" className="text-red-700">
          Content लोड नहीं हुआ।
        </p>
      </main>
    );
  }

  const rows = data ?? [];
  const counts = rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = (acc[row.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-semibold text-brand">Content review</h1>
        <p className="mt-1 text-sm text-neutral-700">
          कुल {rows.length} items।{" "}
          {Object.entries(STATUS_LABEL)
            .map(([key, label]) => `${label}: ${counts[key] ?? 0}`)
            .join(" · ")}
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-soft text-brand">
            <tr>
              <th className="px-3 py-2 font-semibold">Slug</th>
              <th className="px-3 py-2 font-semibold">Kind</th>
              <th className="px-3 py-2 font-semibold">Status</th>
              <th className="px-3 py-2 font-semibold">v</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-neutral-200">
                <td className="px-3 py-2">
                  <Link href={`/admin/content/${row.slug}`} className="text-brand underline">
                    {row.slug}
                  </Link>
                  <span className="block text-xs text-neutral-600">{row.title}</span>
                </td>
                <td className="px-3 py-2">{row.kind}</td>
                <td className="px-3 py-2">{STATUS_LABEL[row.status] ?? row.status}</td>
                <td className="px-3 py-2">{row.version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}