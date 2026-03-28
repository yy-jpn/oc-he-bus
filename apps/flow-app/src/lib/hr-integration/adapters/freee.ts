import type { HrDataAdapter } from "./base";
import type {
  DateRange,
  OvertimeRecord,
  StressCheckRecord,
  HealthCheckRecord,
  AttendanceRecord,
  AttendanceConfig,
} from "../types";
import { DEFAULT_ATTENDANCE_CONFIG } from "../types";
import { HrApiClient } from "../api-client";

// freee人事労務 API レスポンス型定義

interface FreeeWorkRecord {
  employee_id: number;
  date: string; // "2026-03-01"
  clock_in_at?: string;
  clock_out_at?: string;
  total_overtime_work_mins?: number;
  total_normal_work_mins?: number;
  is_absence?: boolean;
  is_paid_holiday?: boolean;
  day_pattern?: string; // "normal_day" | "prescribed_holiday" | "legal_holiday"
  note?: string;
}

interface FreeeWorkRecordsResponse {
  employee_work_records: FreeeWorkRecord[];
  total_count: number;
}

interface FreeeEmployee {
  id: number;
  num?: string; // 従業員番号
  display_name?: string;
}

interface FreeeEmployeesResponse {
  employees: FreeeEmployee[];
}

interface FreeeWorkRecordSummary {
  employee_id: number;
  year: number;
  month: number;
  total_overtime_work_mins?: number;
  total_holiday_work_mins?: number;
  total_midnight_work_mins?: number;
}

interface FreeeWorkRecordSummariesResponse {
  employee_work_record_summaries: FreeeWorkRecordSummary[];
}

/**
 * freee人事労務 APIアダプタ。
 * OAuth2認証で勤怠データ・時間外労働データを取得する。
 *
 * freeeは健診・ストレスチェックデータを持たないため、
 * fetchHealthCheckData/fetchStressCheckDataは空配列を返す。
 */
export class FreeeHrAdapter implements HrDataAdapter {
  readonly sourceType = "freee";
  private client: HrApiClient;
  private companyId: string;
  private globalConfig: AttendanceConfig;

  constructor(
    accessToken: string,
    companyId: string,
    config?: Record<string, string>
  ) {
    this.companyId = companyId;
    this.client = new HrApiClient({
      baseUrl: "https://api.freee.co.jp",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    this.globalConfig = {
      scheduledStartTime:
        config?.scheduled_start_time || DEFAULT_ATTENDANCE_CONFIG.scheduledStartTime,
      scheduledWorkMinutes:
        Number(config?.scheduled_work_minutes) || DEFAULT_ATTENDANCE_CONFIG.scheduledWorkMinutes,
      flexTimeEnabled:
        config?.flex_time_enabled === "true",
    };
  }

  /**
   * 従業員番号マップを取得する（employee_id → 従業員コード）。
   */
  private async getEmployeeCodeMap(): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    let offset = 0;
    const limit = 100;

    while (true) {
      const response = await this.client.get<FreeeEmployeesResponse>(
        "/api/v1/employees",
        {
          params: {
            company_id: this.companyId,
            limit: String(limit),
            offset: String(offset),
          },
        }
      );

      for (const emp of response.employees) {
        if (emp.num) {
          map.set(emp.id, emp.num);
        }
      }

      if (response.employees.length < limit) break;
      offset += limit;
    }

    return map;
  }

  async fetchOvertimeData(
    _companyId: string,
    period: DateRange
  ): Promise<OvertimeRecord[]> {
    const empCodeMap = await this.getEmployeeCodeMap();
    const results: OvertimeRecord[] = [];

    // 対象月を列挙
    const months = this.getMonthRange(period);

    for (const { year, month } of months) {
      const response =
        await this.client.get<FreeeWorkRecordSummariesResponse>(
          "/api/v1/employee_work_record_summaries",
          {
            params: {
              company_id: this.companyId,
              year: String(year),
              month: String(month),
            },
          }
        );

      for (const summary of response.employee_work_record_summaries) {
        const empCode = empCodeMap.get(summary.employee_id);
        if (!empCode) continue;

        const totalOvertimeMins =
          (summary.total_overtime_work_mins ?? 0) +
          (summary.total_holiday_work_mins ?? 0) +
          (summary.total_midnight_work_mins ?? 0);

        const totalHours = Math.round((totalOvertimeMins / 60) * 10) / 10;

        results.push({
          employeeCode: empCode,
          yearMonth: `${year}-${String(month).padStart(2, "0")}`,
          totalHours,
        });
      }
    }

    return results;
  }

  async fetchAttendanceData(
    _companyId: string,
    period: DateRange,
    employeeConfigs?: Map<string, AttendanceConfig>
  ): Promise<AttendanceRecord[]> {
    const empCodeMap = await this.getEmployeeCodeMap();
    const results: AttendanceRecord[] = [];

    // 対象月を列挙して勤怠レコードを取得
    const months = this.getMonthRange(period);

    for (const { year, month } of months) {
      // 全従業員の勤怠データを月ごとに取得
      for (const [employeeId, empCode] of empCodeMap) {
        const response = await this.client.get<FreeeWorkRecordsResponse>(
          `/api/v1/employees/${employeeId}/work_records`,
          {
            params: {
              company_id: this.companyId,
              year: String(year),
              month: String(month),
            },
          }
        );

        const personalConfig = employeeConfigs?.get(empCode);
        for (const record of response.employee_work_records) {
          const events = this.extractAttendanceEvents(record, personalConfig);
          for (const eventType of events) {
            results.push({
              employeeCode: empCode,
              eventDate: record.date,
              eventType,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * freeeは健診データを持たないため空配列を返す。
   */
  async fetchHealthCheckData(): Promise<HealthCheckRecord[]> {
    return [];
  }

  /**
   * freeeはストレスチェックデータを持たないため空配列を返す。
   */
  async fetchStressCheckData(): Promise<StressCheckRecord[]> {
    return [];
  }

  /**
   * 接続テスト用: 軽量なAPIコールで認証を確認する。
   */
  async testApiConnection(): Promise<{ ok: boolean; message: string }> {
    return this.client.testConnection(
      `/api/v1/companies/${this.companyId}`
    );
  }

  /**
   * 勤怠レコードから勤怠イベントを抽出する。
   * 個人設定 > 全体設定 > デフォルト値 の優先順位で判定基準を決定。
   */
  private extractAttendanceEvents(
    record: FreeeWorkRecord,
    personalConfig?: AttendanceConfig
  ): AttendanceRecord["eventType"][] {
    const config = personalConfig ?? this.globalConfig;
    const events: AttendanceRecord["eventType"][] = [];

    // 欠勤（有給以外）
    if (record.is_absence && !record.is_paid_holiday) {
      events.push("non_pto_absence");
    }

    // 有給欠勤（当日申請かは未確認 → pto_absence として保存）
    if (record.is_paid_holiday) {
      events.push("pto_absence");
    }

    // フレックスタイム制 → 遅刻・早退を判定しない
    if (config.flexTimeEnabled) {
      return events;
    }

    // 遅刻判定: 設定された始業時刻 + 30分 を基準
    if (record.clock_in_at && record.day_pattern === "normal_day") {
      const [startH, startM] = config.scheduledStartTime.split(":").map(Number);
      const totalLateMinutes = startH * 60 + startM + 30;
      const lateHour = Math.floor(totalLateMinutes / 60);
      const lateMin = totalLateMinutes % 60;

      const clockIn = new Date(record.clock_in_at);
      const clockInH = clockIn.getHours();
      const clockInM = clockIn.getMinutes();
      if (clockInH > lateHour || (clockInH === lateHour && clockInM >= lateMin)) {
        events.push("tardiness");
      }
    }

    // 早退判定: 所定労働時間の75%未満
    const earlyThreshold = config.scheduledWorkMinutes * 0.75;
    if (
      record.clock_in_at &&
      record.clock_out_at &&
      !record.is_absence &&
      record.day_pattern === "normal_day" &&
      (record.total_normal_work_mins ?? 0) < earlyThreshold
    ) {
      events.push("early_leave");
    }

    return events;
  }

  /**
   * DateRange から対象月リストを生成する。
   */
  private getMonthRange(
    period: DateRange
  ): { year: number; month: number }[] {
    const months: { year: number; month: number }[] = [];
    const current = new Date(period.start);
    current.setDate(1);

    while (current <= period.end) {
      months.push({
        year: current.getFullYear(),
        month: current.getMonth() + 1,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}
