import type {
  DateRange,
  OvertimeRecord,
  StressCheckRecord,
  HealthCheckRecord,
  AttendanceRecord,
} from "../types";

export interface HrDataAdapter {
  readonly sourceType: string;
  fetchOvertimeData(
    companyId: string,
    period: DateRange
  ): Promise<OvertimeRecord[]>;
  fetchStressCheckData(
    companyId: string,
    period: DateRange
  ): Promise<StressCheckRecord[]>;
  fetchHealthCheckData(
    companyId: string,
    period: DateRange
  ): Promise<HealthCheckRecord[]>;
  fetchAttendanceData(
    companyId: string,
    period: DateRange
  ): Promise<AttendanceRecord[]>;
}
