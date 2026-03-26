"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReturnDecision = {
  id: string;
  leave_id: string | null;
  decided_at: string | null;
  decision: string | null;
  l1_return_intention: boolean;
  l1_intention_expressed_at: string | null;
  l1_intention_confirmed_by: string | null;
  l2_doctor_clearance: boolean;
  l2_symptom_stable: boolean;
  l2_episode_recall_tolerance: boolean;
  l2_clearance_received_at: string | null;
  l3_life_rhythm_stable: boolean;
  l3_medication_self_managed: boolean;
  l3_grooming_adequate: boolean;
  l3_daily_outing_possible: boolean;
  l3_eating_adequate: boolean;
  l4_family_friends_ok: boolean;
  l4_strangers_ok: boolean;
  l4_rework_staff_ok: boolean | null;
  l4_hr_interview_ok: boolean;
  l5_attendance_stable: boolean;
  l5_task_performance_ok: boolean;
  l5_concentration_adequate: boolean;
  l5_commute_training_ok: boolean;
  l5_rework_completion: boolean | null;
  regional_ohc_consulted: boolean;
  regional_ohc_opinion: string | null;
  decided_by: string | null;
  notes: string | null;
};

export async function getDecision(leaveId: string): Promise<ReturnDecision | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("return_decisions")
    .select("*")
    .eq("leave_id", leaveId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ReturnDecision | null;
}

export async function saveDecision(
  caseId: string,
  leaveId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const record = {
    leave_id: leaveId,
    // L1
    l1_return_intention: formData.get("l1_return_intention") === "on",
    l1_intention_expressed_at: (formData.get("l1_intention_expressed_at") as string) || null,
    l1_intention_confirmed_by: user.id,
    // L2
    l2_doctor_clearance: formData.get("l2_doctor_clearance") === "on",
    l2_symptom_stable: formData.get("l2_symptom_stable") === "on",
    l2_episode_recall_tolerance: formData.get("l2_episode_recall_tolerance") === "on",
    l2_clearance_received_at: (formData.get("l2_clearance_received_at") as string) || null,
    // L3
    l3_life_rhythm_stable: formData.get("l3_life_rhythm_stable") === "on",
    l3_medication_self_managed: formData.get("l3_medication_self_managed") === "on",
    l3_grooming_adequate: formData.get("l3_grooming_adequate") === "on",
    l3_daily_outing_possible: formData.get("l3_daily_outing_possible") === "on",
    l3_eating_adequate: formData.get("l3_eating_adequate") === "on",
    // L4
    l4_family_friends_ok: formData.get("l4_family_friends_ok") === "on",
    l4_strangers_ok: formData.get("l4_strangers_ok") === "on",
    l4_rework_staff_ok: formData.get("l4_rework_staff_ok") === "on" ? true : formData.get("l4_rework_staff_ok") === "off" ? false : null,
    l4_hr_interview_ok: formData.get("l4_hr_interview_ok") === "on",
    // L5
    l5_attendance_stable: formData.get("l5_attendance_stable") === "on",
    l5_task_performance_ok: formData.get("l5_task_performance_ok") === "on",
    l5_concentration_adequate: formData.get("l5_concentration_adequate") === "on",
    l5_commute_training_ok: formData.get("l5_commute_training_ok") === "on",
    l5_rework_completion: formData.get("l5_rework_completion") === "on" ? true : formData.get("l5_rework_completion") === "off" ? false : null,
    // 地さんぽ
    regional_ohc_consulted: formData.get("regional_ohc_consulted") === "on",
    regional_ohc_opinion: (formData.get("regional_ohc_opinion") as string) || null,
    // メタ
    decided_by: user.id,
    notes: (formData.get("notes") as string) || null,
  };

  const existing = await getDecision(leaveId);

  if (existing) {
    const { error } = await supabase
      .from("return_decisions")
      .update(record)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("return_decisions")
      .insert(record);
    if (error) throw error;
  }

  revalidatePath(`/cases/${caseId}`);
}

export async function finalizeDecision(
  caseId: string,
  leaveId: string,
  decision: "approved_full" | "approved_gradual" | "deferred"
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Update decision record
  const existing = await getDecision(leaveId);
  if (existing) {
    await supabase
      .from("return_decisions")
      .update({
        decision,
        decided_at: new Date().toISOString().split("T")[0],
      })
      .eq("id", existing.id);
  }

  // Determine new phase
  let newPhase: string;
  let eventDescription: string;

  switch (decision) {
    case "approved_full":
      newPhase = "phase5a_full_return";
      eventDescription = "復職判定: 通常勤務での復職を承認";
      break;
    case "approved_gradual":
      newPhase = "phase5b_gradual_return";
      eventDescription = "復職判定: 段階的復職を承認";
      break;
    case "deferred":
      newPhase = "phase3_preparation";
      eventDescription = "復職判定: 復職準備へ差し戻し（基準未充足）";
      break;
  }

  await supabase
    .from("cases")
    .update({ current_phase: newPhase })
    .eq("id", caseId);

  await supabase.from("case_events").insert([
    {
      case_id: caseId,
      event_type: "return_decision",
      event_date: new Date().toISOString(),
      description: eventDescription,
      created_by: user.id,
    },
    {
      case_id: caseId,
      event_type: "phase_change",
      event_date: new Date().toISOString(),
      description: `フェーズ変更: ${newPhase === "phase5a_full_return" ? "通常勤務復職" : newPhase === "phase5b_gradual_return" ? "段階的復職" : "復職準備"}へ`,
      created_by: user.id,
    },
  ]);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}
