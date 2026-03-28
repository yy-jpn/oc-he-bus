"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AttendanceConfig } from "@/lib/hr-integration/types";
import type { Json } from "@/lib/supabase/types";

export interface EmployeeWithConfig {
  id: string;
  employeeCode: string;
  name: string;
  attendanceConfig: AttendanceConfig | null;
}

export async function getEmployeesWithConfig(): Promise<EmployeeWithConfig[]> {
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

  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_code, name, attendance_config")
    .eq("company_id", profile.company_id)
    .order("employee_code");

  if (error) throw error;

  return (data ?? []).map((e) => ({
    id: e.id,
    employeeCode: e.employee_code ?? "",
    name: e.name ?? "",
    attendanceConfig: e.attendance_config as AttendanceConfig | null,
  }));
}

export async function updateEmployeeAttendanceConfig(
  employeeId: string,
  config: AttendanceConfig | null
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("employees")
    .update({
      attendance_config: config as unknown as Json,
    })
    .eq("id", employeeId);

  if (error) throw error;

  revalidatePath("/settings/employee-config");
}
