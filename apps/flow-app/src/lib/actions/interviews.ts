"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInterview(
  caseId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const outcome = formData.get("outcome") as string;
  const summary = formData.get("summary") as string;

  const { error } = await supabase.from("interviews").insert({
    case_id: caseId,
    conducted_at: new Date().toISOString(),
    conducted_by: user.id,
    outcome,
    summary,
  });

  if (error) throw error;

  // Record event
  const outcomeLabels: Record<string, string> = {
    continue_monitoring: "経過観察",
    recommend_medical: "受診勧奨",
    proceed_to_leave: "休職手続きへ移行",
  };

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "interview",
    event_date: new Date().toISOString(),
    description: `面談実施 → ${outcomeLabels[outcome] ?? outcome}`,
    created_by: user.id,
  });

  // Update phase based on outcome
  if (outcome === "proceed_to_leave") {
    await supabase
      .from("cases")
      .update({ current_phase: "phase1_leave_start" })
      .eq("id", caseId);

    await supabase.from("case_events").insert({
      case_id: caseId,
      event_type: "phase_change",
      event_date: new Date().toISOString(),
      description: "フェーズ変更: 休職開始手続きへ",
      created_by: user.id,
    });
  } else if (outcome === "continue_monitoring") {
    await supabase
      .from("cases")
      .update({ current_phase: "resolved_without_leave" })
      .eq("id", caseId);

    await supabase.from("case_events").insert({
      case_id: caseId,
      event_type: "phase_change",
      event_date: new Date().toISOString(),
      description: "フェーズ変更: 解決（休職なし）へ自動アーカイブ",
      created_by: user.id,
    });
  }

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}
