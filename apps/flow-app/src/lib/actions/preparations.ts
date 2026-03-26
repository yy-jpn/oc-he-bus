"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReturnPreparation = {
  id: string;
  leave_id: string | null;
  started_at: string | null;
  rework_enrolled: boolean;
  rework_facility_name: string | null;
  rework_status: string | null;
  checklist_l1_return_intention: boolean;
  checklist_l2_doctor_clearance: boolean;
  checklist_l3_self_care: boolean;
  checklist_l4_communication: boolean;
  checklist_l5_work_performance: boolean;
  notes: string | null;
};

export async function getPreparation(leaveId: string): Promise<ReturnPreparation | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("return_preparations")
    .select("*")
    .eq("leave_id", leaveId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ReturnPreparation | null;
}

export async function createOrUpdatePreparation(
  caseId: string,
  leaveId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const reworkEnrolled = formData.get("rework_enrolled") === "on";
  const reworkFacilityName = formData.get("rework_facility_name") as string;
  const reworkStatus = (formData.get("rework_status") as string) || "not_applicable";
  const l1 = formData.get("checklist_l1") === "on";
  const l2 = formData.get("checklist_l2") === "on";
  const l3 = formData.get("checklist_l3") === "on";
  const l4 = formData.get("checklist_l4") === "on";
  const l5 = formData.get("checklist_l5") === "on";
  const notes = formData.get("notes") as string;

  const record = {
    leave_id: leaveId,
    started_at: new Date().toISOString().split("T")[0],
    rework_enrolled: reworkEnrolled,
    rework_facility_name: reworkFacilityName || null,
    rework_status: reworkEnrolled ? reworkStatus : "not_applicable",
    checklist_l1_return_intention: l1,
    checklist_l2_doctor_clearance: l2,
    checklist_l3_self_care: l3,
    checklist_l4_communication: l4,
    checklist_l5_work_performance: l5,
    notes: notes || null,
  };

  // Check if existing
  const existing = await getPreparation(leaveId);

  if (existing) {
    const { error } = await supabase
      .from("return_preparations")
      .update(record)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("return_preparations")
      .insert(record);
    if (error) throw error;

    // Record event for preparation start
    await supabase.from("case_events").insert({
      case_id: caseId,
      event_type: "preparation_started",
      event_date: new Date().toISOString(),
      description: "復職準備を開始",
      created_by: user.id,
    });
  }

  revalidatePath(`/cases/${caseId}`);
}

export async function transitionToDecision(caseId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("cases")
    .update({ current_phase: "phase4_decision" })
    .eq("id", caseId);

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "phase_change",
    event_date: new Date().toISOString(),
    description: "フェーズ変更: 復職判定へ",
    created_by: user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}
