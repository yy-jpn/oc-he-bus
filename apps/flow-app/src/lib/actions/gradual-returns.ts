"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ReturnRecord = {
  id: string;
  leave_id: string | null;
  return_type: string | null;
  return_date: string;
  department: string | null;
  position: string | null;
  notes: string | null;
};

export type GradualStep = {
  id: string;
  return_id: string | null;
  step_number: number;
  start_date: string;
  end_date: string;
  work_hours_per_day: number | null;
  work_days_per_week: number | null;
  duty_adjustments: string | null;
  review_date: string | null;
  status: string;
};

export type PreventionPlan = {
  id: string;
  return_id: string | null;
  workplace_adjustments: string[];
  identified_stressors: string[];
  countermeasures: string[];
  monitoring_items: string[];
  monitoring_frequency: string | null;
  monitoring_duration_months: number | null;
  next_review_date: string | null;
};

export async function getReturnRecord(leaveId: string): Promise<ReturnRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("returns")
    .select("*")
    .eq("leave_id", leaveId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ReturnRecord | null;
}

export async function getGradualSteps(returnId: string): Promise<GradualStep[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gradual_schedule_steps")
    .select("*")
    .eq("return_id", returnId)
    .order("step_number", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as GradualStep[];
}

export async function addGradualStep(
  returnId: string,
  caseId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Get current max step number
  const existing = await getGradualSteps(returnId);
  const nextStepNumber = existing.length > 0
    ? Math.max(...existing.map((s) => s.step_number)) + 1
    : 1;

  const { error } = await supabase.from("gradual_schedule_steps").insert({
    return_id: returnId,
    step_number: nextStepNumber,
    start_date: formData.get("start_date") as string,
    end_date: formData.get("end_date") as string,
    work_hours_per_day: parseFloat(formData.get("work_hours_per_day") as string) || null,
    work_days_per_week: parseInt(formData.get("work_days_per_week") as string) || null,
    duty_adjustments: (formData.get("duty_adjustments") as string) || null,
    review_date: (formData.get("review_date") as string) || null,
    status: "planned",
  });

  if (error) throw error;
  revalidatePath(`/cases/${caseId}`);
}

export async function updateStepStatus(
  stepId: string,
  status: string,
  caseId: string
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("gradual_schedule_steps")
    .update({ status })
    .eq("id", stepId);

  if (error) throw error;
  revalidatePath(`/cases/${caseId}`);
}

export async function getPreventionPlan(returnId: string): Promise<PreventionPlan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("relapse_prevention_plans")
    .select("*")
    .eq("return_id", returnId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as PreventionPlan | null;
}

export async function savePreventionPlan(
  returnId: string,
  caseId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const parseArrayField = (name: string): string[] => {
    const value = formData.get(name) as string;
    if (!value) return [];
    return value
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  };

  const record = {
    return_id: returnId,
    workplace_adjustments: parseArrayField("workplace_adjustments"),
    identified_stressors: parseArrayField("identified_stressors"),
    countermeasures: parseArrayField("countermeasures"),
    monitoring_items: parseArrayField("monitoring_items"),
    monitoring_frequency: (formData.get("monitoring_frequency") as string) || "monthly",
    monitoring_duration_months: parseInt(formData.get("monitoring_duration_months") as string) || 6,
    next_review_date: (formData.get("next_review_date") as string) || null,
  };

  const existing = await getPreventionPlan(returnId);

  if (existing) {
    const { error } = await supabase
      .from("relapse_prevention_plans")
      .update(record)
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("relapse_prevention_plans")
      .insert(record);
    if (error) throw error;

    // Record event
    await supabase.from("case_events").insert({
      case_id: caseId,
      event_type: "prevention_plan_created",
      event_date: new Date().toISOString(),
      description: "再発防止計画を策定",
      created_by: user.id,
    });
  }

  revalidatePath(`/cases/${caseId}`);
}

export async function completeGradualReturn(caseId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("cases")
    .update({ current_phase: "closed" })
    .eq("id", caseId);

  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "phase_change",
    event_date: new Date().toISOString(),
    description: "段階的復職が完了 → ケースクローズ",
    created_by: user.id,
  });

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}
