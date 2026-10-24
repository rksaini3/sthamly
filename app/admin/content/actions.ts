"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { findClaimIssues, PLACEHOLDER } from "@/lib/content-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STATUSES = ["draft", "in_review", "approved", "retired"] as const;

const formSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(3).max(80),
  title: z.string().trim().min(3).max(120),
  body_md: z.string().trim().min(20).max(5000),
  source_ref: z.string().trim().max(200).optional(),
  status: z.enum(STATUSES),
  reviewer_id: z.string().uuid().optional(),
});

function back(slug: string, error: string): never {
  redirect(`/admin/content/${encodeURIComponent(slug)}?error=${error}`);
}

export async function saveContent(formData: FormData) {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const slug = raw.slug ?? "";

  const parsed = formSchema.safeParse({
    ...raw,
    source_ref: raw.source_ref ? raw.source_ref : undefined,
    reviewer_id: raw.reviewer_id ? raw.reviewer_id : undefined,
  });

  if (!parsed.success) back(slug, "invalid");

  const input = parsed.data;
  const approving = input.status === "approved";

  if (approving) {
    if (input.body_md.includes(PLACEHOLDER)) back(slug, "placeholder");
    if (findClaimIssues(`${input.title} ${input.body_md}`).length > 0) back(slug, "claims");
    if (!input.reviewer_id) back(slug, "reviewer");
  }

  const db = createSupabaseAdminClient();

  let reviewedBy: string | null = null;
  if (approving && input.reviewer_id) {
    const { data: reviewer } = await db
      .from("practitioners")
      .select("id")
      .eq("id", input.reviewer_id)
      .eq("verified", true)
      .maybeSingle();

    if (!reviewer) back(slug, "reviewer");
    reviewedBy = input.reviewer_id;
  }

  const { data: current, error: readError } = await db
    .from("content_items")
    .select("title, body_md, version")
    .eq("id", input.id)
    .maybeSingle();

  if (readError || !current) back(slug, "notfound");

  const changed = current.title !== input.title || current.body_md !== input.body_md;
  const now = new Date().toISOString();

  const { error: updateError } = await db
    .from("content_items")
    .update({
      title: input.title,
      body_md: input.body_md,
      source_ref: input.source_ref ?? null,
      status: input.status,
      reviewed_by: reviewedBy,
      reviewed_at: approving ? now : null,
      version: changed ? current.version + 1 : current.version,
      updated_at: now,
    })
    .eq("id", input.id);

  if (updateError) back(slug, "save");

  await db.from("audit_log").insert({
    actor_id: admin.id,
    action: `content_set_${input.status}`,
    target_table: "content_items",
    target_id: input.id,
  });

  revalidatePath("/plan");
  revalidatePath("/admin/content");

  redirect(`/admin/content/${encodeURIComponent(slug)}?saved=1`);
}