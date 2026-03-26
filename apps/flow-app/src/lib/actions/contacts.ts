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

export type ContactReminder = {
  id: string;
  leave_id: string | null;
  scheduled_date: string;
  completed: boolean;
  completed_at: string | null;
  notes: string | null;
};

export async function getContactReminders(leaveId: string): Promise<ContactReminder[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contact_reminders")
    .select("*")
    .eq("leave_id", leaveId)
    .order("scheduled_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ContactReminder[];
}

export async function completeContact(
  reminderId: string,
  caseId: string,
  leaveId: string,
  formData: FormData
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const notes = formData.get("notes") as string;

  // Mark reminder as completed
  const { error } = await supabase
    .from("contact_reminders")
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      notes: notes || null,
    })
    .eq("id", reminderId);

  if (error) throw error;

  // Get leave info for frequency
  const { data: leave } = await supabase
    .from("leaves")
    .select("contact_frequency")
    .eq("id", leaveId)
    .single();

  // Create next reminder
  if (leave?.contact_frequency) {
    const intervalDays = getIntervalDays(leave.contact_frequency);
    const nextDate = addDays(new Date(), intervalDays);

    await supabase.from("contact_reminders").insert({
      leave_id: leaveId,
      scheduled_date: nextDate.toISOString().split("T")[0],
    });
  }

  // Record event
  await supabase.from("case_events").insert({
    case_id: caseId,
    event_type: "contact_completed",
    event_date: new Date().toISOString(),
    description: `定期連絡を実施${notes ? `: ${notes}` : ""}`,
    created_by: user.id,
  });

  revalidatePath(`/cases/${caseId}`);
}

export async function transitionToPreparation(
  caseId: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Update case phase
  await supabase
    .from("cases")
    .update({ current_phase: "phase3_preparation" })
    .eq("id", caseId);

  // Record events
  await supabase.from("case_events").insert([
    {
      case_id: caseId,
      event_type: "doctor_clearance",
      event_date: new Date().toISOString(),
      description: "主治医から「復職可能」の意見あり",
      created_by: user.id,
    },
    {
      case_id: caseId,
      event_type: "phase_change",
      event_date: new Date().toISOString(),
      description: "フェーズ変更: 復職準備中へ",
      created_by: user.id,
    },
  ]);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
}
