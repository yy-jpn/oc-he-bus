"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getIntervalDays(frequency: string): number {
  switch (frequency) {
    case "weekly":
      return 7;
    case "biweekly":
      return 14;
    case "monthly":
      return 30;
    default:
      return 30;
  }
}

export async function createLeave(
  caseId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const startDate = formData.get("start_date") as string;
  if (!startDate) throw new Error("休職開始日は必須です");

  const diagnosisReceived = formData.get("diagnosis_received") === "on";
  const contactFrequency = (formData.get("contact_frequency") as string) || "monthly";
  const contactMethod = (formData.get("contact_method") as string) || "email";
  const infoContact = formData.get("info_contact_method") === "on";
  const infoInsurance = formData.get("info_social_insurance") === "on";
  const infoGuidance = formData.get("info_rest_guidance") === "on";

  // Create leave record
  const { data: leave, error } = await supabase
    .from("leaves")
    .insert({
      case_id: caseId,
      start_date: startDate,
      diagnosis_received: diagnosisReceived,
      contact_frequency: contactFrequency,
      contact_method: contactMethod,
      info_provided_contact_method: infoContact,
      info_provided_social_insurance: infoInsurance,
      info_provided_rest_guidance: infoGuidance,
    })
    .select("id")
    .single();

  if (error || !leave) throw error ?? new Error("Failed to create leave");

  // Create first contact reminder
  const intervalDays = getIntervalDays(contactFrequency);
  const nextContactDate = addDays(new Date(startDate), intervalDays);

  await supabase.from("contact_reminders").insert({
    leave_id: leave.id,
    scheduled_date: nextContactDate.toISOString().split("T")[0],
  });

  // Update case phase to phase2_rest
  await supabase
    .from("cases")
    .update({ current_phase: "phase2_rest" })
    .eq("id", caseId);

  // Record events
  await supabase.from("case_events").insert([
    {
      case_id: caseId,
      event_type: "leave_start",
      event_date: new Date().toISOString(),
      description: `休職開始 (${startDate})`,
      created_by: user.id,
    },
    {
      case_id: caseId,
      event_type: "info_provided",
      event_date: new Date().toISOString(),
      description: "情報提供完了",
      created_by: user.id,
    },
    {
      case_id: caseId,
      event_type: "phase_change",
      event_date: new Date().toISOString(),
      description: "フェーズ変更: 療養中へ",
      created_by: user.id,
    },
  ]);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}
