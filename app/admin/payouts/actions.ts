"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const markSchema = z.object({
  payout_id: z.string().uuid(),
  reference: z.string().trim().min(4).max(60),
});

export async function markPayoutSent(formData: FormData) {
  await requireAdmin();

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = markSchema.safeParse({
    payout_id: formData.get("payout_id"),
    reference: formData.get("reference"),
  });

  if (!parsed.success) {
    redirect("/admin/payouts?error=invalid");
  }

  const db = createSupabaseAdminClient();

  // Only a pending payout can be marked sent. This stops double marking.
  const { error } = await db
    .from("payouts")
    .update({
      status: "sent",
      reference: parsed.data.reference,
      sent_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.payout_id)
    .eq("status", "pending");

  if (error) {
    redirect("/admin/payouts?error=save");
  }

  await db.from("audit_log").insert({
    actor_id: user.id,
    action: "mark_payout_sent",
    target_table: "payouts",
    target_id: parsed.data.payout_id,
  });

  revalidatePath("/admin/payouts");
  redirect("/admin/payouts?saved=1");
}