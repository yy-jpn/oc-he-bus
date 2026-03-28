"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Json } from "@/lib/supabase/types";

export interface PtoAbsenceRecord {
  id: string;
  employeeId: string | null;
  employeeCode: string;
  employeeName: string;
  eventDate: string;
  sameDayConfirmed: boolean | null;
}

/**
 * 未確認の pto_absence レコードを取得する。
 * sameDayConfirmed が null/false のものを返す。
 */
export async function getPendingPtoAbsences(): Promise<PtoAbsenceRecord[]> {
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

  // pto_absence のレコードを取得
  const { data: records, error } = await supabase
    .from("hr_data_records")
    .select("id, employee_id, employee_code, data")
    .eq("company_id", profile.company_id)
    .eq("data_type", "attendance")
    .not("employee_id", "is", null);

  if (error) throw error;

  // 従業員名マップ
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .eq("company_id", profile.company_id);

  const empNameMap = new Map<string, string>();
  for (const emp of employees ?? []) {
    empNameMap.set(emp.id, emp.name ?? "");
  }

  // pto_absence かつ未確認のレコードをフィルタ
  const ptoRecords: PtoAbsenceRecord[] = [];
  for (const r of records ?? []) {
    const d = r.data as Record<string, unknown>;
    if (d.event_type !== "pto_absence") continue;
    // 既に明示的にfalse（非当日申請と確認済み）のものは除外
    if (d.same_day_confirmed === true || d.same_day_confirmed === false) continue;

    ptoRecords.push({
      id: r.id,
      employeeId: r.employee_id,
      employeeCode: r.employee_code,
      employeeName: empNameMap.get(r.employee_id ?? "") ?? "",
      eventDate: d.event_date as string,
      sameDayConfirmed: d.same_day_confirmed as boolean | null,
    });
  }

  // 日付順でソート
  ptoRecords.sort((a, b) => a.eventDate.localeCompare(b.eventDate));

  return ptoRecords;
}

/**
 * 当日申請と確認されたレコードを same_day_confirmed = true に更新する。
 */
export async function confirmSameDayPto(recordIds: string[]): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  for (const id of recordIds) {
    const { data: record } = await supabase
      .from("hr_data_records")
      .select("data")
      .eq("id", id)
      .single();

    if (!record) continue;
    const existingData = record.data as Record<string, unknown>;

    await supabase
      .from("hr_data_records")
      .update({
        data: {
          ...existingData,
          same_day_confirmed: true,
          confirmation_source: "manual",
        } as unknown as Json,
      })
      .eq("id", id);
  }

  revalidatePath("/candidates");
}

/**
 * 当日申請ではないと確認されたレコードを same_day_confirmed = false に更新する。
 */
export async function dismissPtoAbsence(recordIds: string[]): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  for (const id of recordIds) {
    const { data: record } = await supabase
      .from("hr_data_records")
      .select("data")
      .eq("id", id)
      .single();

    if (!record) continue;
    const existingData = record.data as Record<string, unknown>;

    await supabase
      .from("hr_data_records")
      .update({
        data: {
          ...existingData,
          same_day_confirmed: false,
          confirmation_source: "manual",
        } as unknown as Json,
      })
      .eq("id", id);
  }

  revalidatePath("/candidates");
}
