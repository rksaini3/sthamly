"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const formSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject", "suspend"]),
  check_council: z.literal("on").optional(),
  check_name: z.literal("on").optional(),
});

function back(error?: string): never {
  redirect(error ? `/admin/practitioners?error=${error}` : "/admin/practitioners?saved=1");
}

export async function reviewPractitioner(formData: FormData) {
  const admin = await requireAdmin();

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = formSchema.safeParse({
    id: raw.id,
    decision: raw.decision,
    check_council: raw.check_council,
    check_name: raw.check_name,
  });

  if (!parsed.success) back("invalid");

  const { id, decision, check_council, check_name } = parsed.data;
  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (decision === "approve") {
    // Both checks must be ticked. The server enforces this, not only the browser.
    if (!check_council || !check_name) back("checks");

    const { error } = await db
      .from("practitioners")
      .update({
        verified: true,
        verified_at: now,
        verified_by: admin.id,
        is_listed: true,
      })
      .eq("id", id);

    if (error) back("save");

    // Give the practitioner role only to accounts that are still plain users.
    await db.from("profiles").update({ role: "practitioner" }).eq("id", id).eq("role", "user");
  }

  if (decision === "reject") {
    const { error } = await db
      .from("practitioners")
      .update({
        verified: false,
        verified_at: null,
        verified_by: null,
        is_listed: false,
      })
      .eq("id", id);

    if (error) back("save");
  }

  if (decision === "suspend") {
    // Keeps the verification record, so the practitioner can be listed again without re-checking.
    const { error } = await db
      .from("practitioners")
      .update({ is_listed: false })
      .eq("id", id);

    if (error) back("save");
  }

  await db.from("audit_log").insert({
    actor_id: admin.id,
    action: `practitioner_${decision}`,
    target_table: "practitioners",
    target_id: id,
  });

  revalidatePath("/admin/practitioners");
  back();
}