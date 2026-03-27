import type { HrDataAdapter } from "./base";
import type {
  DateRange,
  OvertimeRecord,
  StressCheckRecord,
  HealthCheckRecord,
  AttendanceRecord,
} from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export class CsvAdapter implements HrDataAdapter {
  readonly sourceType = "csv";

  constructor(private supabase: SupabaseClient<Database>) {}

  async fetchOvertimeData(
    companyId: string,
    period: DateRange
  ): Promise<OvertimeRecord[]> {
    const { data } = await this.supabase
      .from("hr_data_records")
      .select("employee_code, data")
      .eq("company_id", companyId)
      .eq("data_type", "overtime")
      .gte("period_start", period.start.toISOString().split("T")[0])
      .lte("period_end", period.end.toISOString().split("T")[0]);

    return (data ?? []).map((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        employeeCode: r.employee_code,
        yearMonth: d.year_month as string,
        totalHours: d.total_hours as number,
      };
    });
  }

  async fetchStressCheckData(
    companyId: string,
    period: DateRange
  ): Promise<StressCheckRecord[]> {
    const { data } = await this.supabase
      .from("hr_data_records")
      .select("employee_code, data")
      .eq("company_id", companyId)
      .eq("data_type", "stress_check")
      .gte("period_start", period.start.toISOString().split("T")[0])
      .lte("period_end", period.end.toISOString().split("T")[0]);

    return (data ?? []).map((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        employeeCode: r.employee_code,
        checkDate: d.check_date as string,
        highStress: d.high_stress as boolean,
      };
    });
  }

  async fetchHealthCheckData(
    companyId: string,
    period: DateRange
  ): Promise<HealthCheckRecord[]> {
    const { data } = await this.supabase
      .from("hr_data_records")
      .select("employee_code, data")
      .eq("company_id", companyId)
      .eq("data_type", "health_check")
      .gte("period_start", period.start.toISOString().split("T")[0])
      .lte("period_end", period.end.toISOString().split("T")[0]);

    return (data ?? []).map((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        employeeCode: r.employee_code,
        checkDate: d.check_date as string,
        employmentDecision: d.employment_decision as string,
      };
    });
  }

  async fetchAttendanceData(
    companyId: string,
    period: DateRange
  ): Promise<AttendanceRecord[]> {
    const { data } = await this.supabase
      .from("hr_data_records")
      .select("employee_code, data")
      .eq("company_id", companyId)
      .eq("data_type", "attendance")
      .gte("period_start", period.start.toISOString().split("T")[0])
      .lte("period_end", period.end.toISOString().split("T")[0]);

    return (data ?? []).map((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        employeeCode: r.employee_code,
        checkDate: d.event_date as string,
        eventDate: d.event_date as string,
        eventType: d.event_type as AttendanceRecord["eventType"],
      };
    });
  }
}
