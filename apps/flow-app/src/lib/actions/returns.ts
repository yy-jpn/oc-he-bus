"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createReturn(
  caseId: string,
  leaveId: string,
  returnType: "full_duty" | "gradual",
  formData: FormData
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const returnDate = formData.get("return_date") as string;
  if (!returnDate) throw new Error("復職日は必須です");

  const department = formData.get("department") as string;
  const position = formData.get("position") as string;
  const notes = formData.get("notes") as string;

  // Create return record
  const { data: returnRecord, error } = await supabase
    .from("returns")
    .insert({
      leave_id: leaveId,
      return_type: returnType,
      return_date: returnDate,
      department: department || null,
      position: position || null,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !returnRecord) throw error ?? new Error("Failed to create return");

  // Update leave end_date
  await supabase
    .from("leaves")
    .update({ end_date: returnDate })
    .eq("id", leaveId);

  // Update case phase
  const newPhase = returnType === "full_duty" ? "closed" : "phase5b_gradual_return";
  await supabase
    .from("cases")
    .update({ current_phase: newPhase })
    .eq("id", caseId);

  // Record events
  const eventDescription =
    returnType === "full_duty"
      ? `通常勤務で復職 (${returnDate})`
      : `段階的復職を開始 (${returnDate})`;

  await supabase.from("case_events").insert([
    {
      case_id: caseId,
      event_type: "return_recorded",
      event_date: new Date().toISOString(),
      description: eventDescription,
      created_by: user.id,
    },
    {
      case_id: caseId,
      event_type: "phase_change",
      event_date: new Date().toISOString(),
      description: `フェーズ変更: ${returnType === "full_duty" ? "完了" : "段階的復職中"}へ`,
      created_by: user.id,
    },
  ]);

  revalidatePath(`/cases/${caseId}`);
  revalidatePath("/dashboard");
  return returnRecord.id;
}
