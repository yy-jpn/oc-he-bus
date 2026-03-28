import { describe, it, expect, vi, beforeEach } from "vitest";
import { FreeeHrAdapter } from "../freee";
import type { AttendanceConfig } from "../../types";

// HrApiClient をモックして、実際のHTTPリクエストを送らないようにする。
// vitestでは class 構文を使わないと new で呼べない。
const mockGet = vi.fn();
vi.mock("../../api-client", () => {
  return {
    HrApiClient: class {
      get = mockGet;
      testConnection = vi.fn();
    },
  };
});

function createAdapter(
  config?: Record<string, string>
): FreeeHrAdapter {
  return new FreeeHrAdapter("test-token", "12345", config);
}

// --- extractAttendanceEvents テスト（fetchAttendanceData経由） ---

describe("FreeeHrAdapter.fetchAttendanceData", () => {
  let adapter: ReturnType<typeof createAdapter>;

  beforeEach(() => {
    mockGet.mockReset();
  });

  it("should detect tardiness with default config (09:30+)", async () => {
    adapter = createAdapter();
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      // 勤怠データ: 10:00出勤 → 遅刻
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            clock_in_at: "2026-03-01T10:00:00+09:00",
            clock_out_at: "2026-03-01T19:00:00+09:00",
            total_normal_work_mins: 480,
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe("tardiness");
    expect(result[0].employeeCode).toBe("E001");
  });

  it("should detect tardiness with custom start time (10:00 → 10:30+)", async () => {
    adapter = createAdapter({ scheduled_start_time: "10:00" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            // 10:15出勤 → 10:00始業なら遅刻基準は10:30なので遅刻ではない
            clock_in_at: "2026-03-01T10:15:00+09:00",
            clock_out_at: "2026-03-01T19:15:00+09:00",
            total_normal_work_mins: 480,
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    // 10:15は10:30より前なので遅刻ではない
    expect(result).toHaveLength(0);
  });

  it("should not detect tardiness/early_leave when flex time is enabled", async () => {
    adapter = createAdapter({ flex_time_enabled: "true" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            clock_in_at: "2026-03-01T11:00:00+09:00",
            clock_out_at: "2026-03-01T15:00:00+09:00",
            total_normal_work_mins: 240, // 4時間
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    // フレックスなので遅刻も早退もなし
    expect(result).toHaveLength(0);
  });

  it("should use personal config over global config", async () => {
    // 全体設定: 09:00始業
    adapter = createAdapter({ scheduled_start_time: "09:00" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            // 10:00出勤: 全体設定なら遅刻(09:30基準)、個人設定(10:00始業)なら遅刻ではない
            clock_in_at: "2026-03-01T10:00:00+09:00",
            clock_out_at: "2026-03-01T19:00:00+09:00",
            total_normal_work_mins: 480,
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    // 個人設定: 10:00始業
    const personalConfigs = new Map<string, AttendanceConfig>();
    personalConfigs.set("E001", {
      scheduledStartTime: "10:00",
      scheduledWorkMinutes: 480,
      flexTimeEnabled: false,
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData(
      "company1",
      period,
      personalConfigs
    );

    // 個人設定の10:00始業 → 10:30基準なので10:00出勤は遅刻ではない
    expect(result).toHaveLength(0);
  });

  it("should fall back to global config when no personal config", async () => {
    adapter = createAdapter({ scheduled_start_time: "09:00" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            clock_in_at: "2026-03-01T10:00:00+09:00",
            clock_out_at: "2026-03-01T19:00:00+09:00",
            total_normal_work_mins: 480,
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    // 個人設定なし → 全体設定(09:00)にフォールバック → 09:30基準で遅刻
    const result = await adapter.fetchAttendanceData("company1", period);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe("tardiness");
  });

  it("should detect early leave based on 75% of scheduled work minutes", async () => {
    adapter = createAdapter({ scheduled_work_minutes: "480" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            clock_in_at: "2026-03-01T09:00:00+09:00",
            clock_out_at: "2026-03-01T14:00:00+09:00",
            total_normal_work_mins: 300, // 5時間 = 480*0.75=360未満 → 早退
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    expect(result.some((r) => r.eventType === "early_leave")).toBe(true);
  });

  it("should return pto_absence (not same_day_pto) for paid holidays", async () => {
    adapter = createAdapter();
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            is_paid_holiday: true,
            is_absence: false,
            day_pattern: "normal_day",
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe("pto_absence");
  });

  it("should return non_pto_absence for unpaid absence", async () => {
    adapter = createAdapter();
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            is_absence: true,
            is_paid_holiday: false,
            day_pattern: "normal_day",
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    expect(result).toHaveLength(1);
    expect(result[0].eventType).toBe("non_pto_absence");
  });

  it("should detect multiple events on a single day (tardiness + early_leave)", async () => {
    adapter = createAdapter({ scheduled_work_minutes: "480" });
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      return Promise.resolve({
        employee_work_records: [
          {
            employee_id: 1,
            date: "2026-03-01",
            // 遅刻(10:00 > 09:30) + 早退(180分 < 360分)
            clock_in_at: "2026-03-01T10:00:00+09:00",
            clock_out_at: "2026-03-01T13:00:00+09:00",
            total_normal_work_mins: 180,
            day_pattern: "normal_day",
            is_absence: false,
            is_paid_holiday: false,
          },
        ],
        total_count: 1,
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchAttendanceData("company1", period);

    expect(result).toHaveLength(2);
    const types = result.map((r) => r.eventType);
    expect(types).toContain("tardiness");
    expect(types).toContain("early_leave");
  });
});

// --- fetchOvertimeData テスト ---

describe("FreeeHrAdapter.fetchOvertimeData", () => {
  let adapter: ReturnType<typeof createAdapter>;

  beforeEach(() => {
    mockGet.mockReset();
  });

  it("should correctly convert minutes to hours with rounding", async () => {
    adapter = createAdapter();
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [{ id: 1, num: "E001", display_name: "テスト" }],
        });
      }
      // 月次サマリー: overtime=150min + holiday=30min + midnight=20min = 200min
      return Promise.resolve({
        employee_work_record_summaries: [
          {
            employee_id: 1,
            year: 2026,
            month: 3,
            total_overtime_work_mins: 150,
            total_holiday_work_mins: 30,
            total_midnight_work_mins: 20,
          },
        ],
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchOvertimeData("company1", period);

    expect(result).toHaveLength(1);
    // 200 / 60 = 3.333... → 四捨五入で3.3
    expect(result[0].totalHours).toBe(3.3);
    expect(result[0].yearMonth).toBe("2026-03");
  });

  it("should skip employees without employee number", async () => {
    adapter = createAdapter();
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        return Promise.resolve({
          employees: [
            { id: 1, num: "E001", display_name: "有番号" },
            { id: 2, display_name: "番号なし" }, // num がない
          ],
        });
      }
      return Promise.resolve({
        employee_work_record_summaries: [
          {
            employee_id: 1,
            year: 2026,
            month: 3,
            total_overtime_work_mins: 60,
          },
          {
            employee_id: 2,
            year: 2026,
            month: 3,
            total_overtime_work_mins: 120,
          },
        ],
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    const result = await adapter.fetchOvertimeData("company1", period);

    expect(result).toHaveLength(1);
    expect(result[0].employeeCode).toBe("E001");
  });

  it("should handle pagination for employees (100+ employees)", async () => {
    adapter = createAdapter();
    let callCount = 0;
    mockGet.mockImplementation((path: string) => {
      if (path === "/api/v1/employees") {
        callCount++;
        if (callCount === 1) {
          // 最初の100件
          const employees = Array.from({ length: 100 }, (_, i) => ({
            id: i + 1,
            num: `E${String(i + 1).padStart(3, "0")}`,
            display_name: `Employee ${i + 1}`,
          }));
          return Promise.resolve({ employees });
        }
        // 次のページ: 5件
        const employees = Array.from({ length: 5 }, (_, i) => ({
          id: 101 + i,
          num: `E${String(101 + i).padStart(3, "0")}`,
          display_name: `Employee ${101 + i}`,
        }));
        return Promise.resolve({ employees });
      }
      return Promise.resolve({
        employee_work_record_summaries: [],
      });
    });

    const period = {
      start: new Date("2026-03-01"),
      end: new Date("2026-03-31"),
    };
    await adapter.fetchOvertimeData("company1", period);

    // getEmployeeCodeMap が2回呼ばれる（100件 → 5件でページネーション終了）
    expect(callCount).toBe(2);
  });
});
