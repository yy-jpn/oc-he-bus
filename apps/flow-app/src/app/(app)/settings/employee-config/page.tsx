import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEmployeesWithConfig } from "@/lib/actions/employee-config";
import { EmployeeAttendanceConfig } from "@/components/settings/employee-attendance-config";
import { getConnections } from "@/lib/actions/connections";
import type { AttendanceConfig } from "@/lib/hr-integration/types";
import { DEFAULT_ATTENDANCE_CONFIG } from "@/lib/hr-integration/types";

export default async function EmployeeConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "hr_admin") {
    redirect("/dashboard");
  }

  const employees = await getEmployeesWithConfig();
  const connections = await getConnections();

  // freee接続の全体設定から globalConfig を構築
  const freeeConn = connections.find((c) => c.adapterType === "freee");
  const freeeConfig = (freeeConn as { config?: Record<string, string> } | undefined)?.config;
  const globalConfig: AttendanceConfig = {
    scheduledStartTime:
      freeeConfig?.scheduled_start_time || DEFAULT_ATTENDANCE_CONFIG.scheduledStartTime,
    scheduledWorkMinutes:
      Number(freeeConfig?.scheduled_work_minutes) || DEFAULT_ATTENDANCE_CONFIG.scheduledWorkMinutes,
    flexTimeEnabled:
      freeeConfig?.flex_time_enabled === "true",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">従業員別 勤怠判定設定</h1>
        <p className="text-muted-foreground">
          従業員ごとに遅刻・早退の判定基準を個別設定できます。
          個人設定がない場合はfreee接続の全体設定が適用されます。
        </p>
      </div>
      <EmployeeAttendanceConfig
        employees={employees}
        globalConfig={globalConfig}
      />
    </div>
  );
}
