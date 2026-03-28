import type { HrDataAdapter } from "./base";
import type {
  DateRange,
  OvertimeRecord,
  StressCheckRecord,
  HealthCheckRecord,
  AttendanceRecord,
} from "../types";
import { HrApiClient } from "../api-client";

// SmartHR API レスポンス型定義

interface SmartHrHealthCheckup {
  id: string;
  crew_id: string;
  year: number;
  health_checkup_type?: string;
  result?: {
    employment_decision?: string;
    date?: string;
  };
  crew?: {
    emp_code?: string;
    last_name?: string;
    first_name?: string;
  };
}

interface SmartHrHealthCheckupListResponse {
  data: SmartHrHealthCheckup[];
  total_count: number;
}

interface SmartHrStressCheck {
  id: string;
  crew_id: string;
  check_date: string;
  high_stress: boolean;
  crew?: {
    emp_code?: string;
  };
}

interface SmartHrStressCheckListResponse {
  data: SmartHrStressCheck[];
  total_count: number;
}

/**
 * SmartHR APIアダプタ。
 * アクセストークン認証で健診結果・ストレスチェックデータを取得する。
 *
 * SmartHRは勤怠データを持たないため、fetchOvertimeData/fetchAttendanceDataは空配列を返す。
 */
export class SmartHrAdapter implements HrDataAdapter {
  readonly sourceType = "smarthr";
  private client: HrApiClient;

  constructor(accessToken: string, tenantId: string) {
    this.client = new HrApiClient({
      baseUrl: `https://${tenantId}.smarthr.jp`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async fetchHealthCheckData(
    _companyId: string,
    period: DateRange
  ): Promise<HealthCheckRecord[]> {
    const year = period.start.getFullYear();
    const results: HealthCheckRecord[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response =
        await this.client.get<SmartHrHealthCheckupListResponse>(
          "/api/v1/health_checkups",
          {
            params: {
              year: String(year),
              page: String(page),
              per_page: String(perPage),
            },
          }
        );

      for (const item of response.data) {
        const empCode = item.crew?.emp_code;
        if (!empCode) continue;

        const checkDate =
          item.result?.date ??
          `${item.year}-01-01`;
        const decision = item.result?.employment_decision ?? "未判定";

        results.push({
          employeeCode: empCode,
          checkDate,
          employmentDecision: decision,
        });
      }

      if (response.data.length < perPage) break;
      page++;
    }

    return results;
  }

  async fetchStressCheckData(
    _companyId: string,
    period: DateRange
  ): Promise<StressCheckRecord[]> {
    const year = period.start.getFullYear();
    const results: StressCheckRecord[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response =
        await this.client.get<SmartHrStressCheckListResponse>(
          "/api/v1/stress_checks",
          {
            params: {
              year: String(year),
              page: String(page),
              per_page: String(perPage),
            },
          }
        );

      for (const item of response.data) {
        const empCode = item.crew?.emp_code;
        if (!empCode) continue;

        results.push({
          employeeCode: empCode,
          checkDate: item.check_date,
          highStress: item.high_stress,
        });
      }

      if (response.data.length < perPage) break;
      page++;
    }

    return results;
  }

  /**
   * SmartHRは勤怠データを持たないため空配列を返す。
   * 勤怠データはfreee等の別サービスから取得する。
   */
  async fetchOvertimeData(): Promise<OvertimeRecord[]> {
    return [];
  }

  async fetchAttendanceData(): Promise<AttendanceRecord[]> {
    return [];
  }

  /**
   * 接続テスト用: 軽量なAPIコールで認証を確認する。
   */
  async testApiConnection(): Promise<{ ok: boolean; message: string }> {
    return this.client.testConnection("/api/v1/users/me");
  }
}
