"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CaseWithEmployee, CaseDetail } from "@/types/case";

export async function getCases(): Promise<CaseWithEmployee[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select("*, employees(name, department)")
    .not("current_phase", "in", '("resolved_without_leave","closed","phase0_monitoring")')
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as CaseWithEmployee[];
}

export async function getCaseSummary(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select("current_phase")
    .not("current_phase", "in", '("resolved_without_leave","closed","phase0_monitoring")');

  if (error) throw error;

  const summary: Record<string, number> = {};
  for (const row of data ?? []) {
    summary[row.current_phase] = (summary[row.current_phase] || 0) + 1;
  }
  return summary;
}

export async function getCaseDetail(id: string): Promise<CaseDetail | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cases")
    .select(
      "*, employees(name, department, position), case_events(*), interviews(*), leaves(*)"
    )
    .eq("id", id)
    .single();

  if (error) return null;
  return data as unknown as CaseDetail;
}

export async function createCase(formData: FormData): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("Company not found");

  const employeeId = formData.get("employee_id") as string;
  const triggerType = formData.get("trigger_type") as string;
  const triggerDetail = formData.get("trigger_detail") as string;

  const { data: caseData, error } = await supabase
    .from("cases")
    .insert({
      company_id: profile.company_id,
      employee_id: employeeId,
      current_phase: "phase0_detection",
      trigger_type: triggerType,
      trigger_detail: triggerDetail,
      detected_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !caseData) throw error ?? new Error("Failed to create case");

  const caseId: string = caseData.id;

  // Get employee name for the event description
  const { data: employee } = await supabase
    .from("employees")
    .select("name")
    .eq("id", employeeId)
    .single();

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "case_created",
    event_date: new Date().toISOString(),
    description: `予兆検知: ${employee?.name ?? "不明"}のケースを作成`,
    created_by: user.id,
  });

  revalidatePath("/dashboard");
  return caseId;
}

export async function updateCasePhase(
  caseId: string,
  newPhase: string,
  eventDescription: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("cases")
    .update({ current_phase: newPhase })
    .eq("id", caseId);

  if (error) throw error;

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "phase_change",
    event_date: new Date().toISOString(),
    description: eventDescription,
    created_by: user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}

export async function deleteCase(caseId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Delete related records first
  await supabase.from("case_events").delete().eq("case_id", caseId);
  await supabase.from("interviews").delete().eq("case_id", caseId);

  // Delete leaves and their contact_reminders
  const { data: leaves } = await supabase
    .from("leaves")
    .select("id")
    .eq("case_id", caseId);

  if (leaves) {
    for (const leave of leaves) {
      await supabase.from("contact_reminders").delete().eq("leave_id", leave.id);
    }
    await supabase.from("leaves").delete().eq("case_id", caseId);
  }

  const { error } = await supabase.from("cases").delete().eq("id", caseId);
  if (error) throw error;

  revalidatePath("/dashboard");
}
