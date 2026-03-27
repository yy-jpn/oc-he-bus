import { describe, it, expect } from "vitest";
import {
  checkOvertimeSingleMonth,
  checkOvertimeConsecutive,
} from "../overtime";

describe("checkOvertimeSingleMonth", () => {
  it("should detect records at or above threshold", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 80 },
      { employeeCode: "E002", yearMonth: "2026-01", totalHours: 79.9 },
      { employeeCode: "E003", yearMonth: "2026-01", totalHours: 100 },
    ];
    const result = checkOvertimeSingleMonth(records, { threshold: 80 });
    expect(result).toHaveLength(2);
    expect(result[0].employeeCode).toBe("E001");
    expect(result[1].employeeCode).toBe("E003");
    expect(result[0].thresholdRule).toBe("overtime_single_month");
  });

  it("should use default threshold of 80 when not specified", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 80 },
    ];
    const result = checkOvertimeSingleMonth(records, {});
    expect(result).toHaveLength(1);
  });

  it("should return empty for records below threshold", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 44 },
    ];
    const result = checkOvertimeSingleMonth(records, { threshold: 45 });
    expect(result).toHaveLength(0);
  });

  it("should handle custom threshold", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 60 },
    ];
    const result = checkOvertimeSingleMonth(records, { threshold: 60 });
    expect(result).toHaveLength(1);
  });
});

describe("checkOvertimeConsecutive", () => {
  it("should detect 2 consecutive months at 45h+", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-02", totalHours: 46 },
    ];
    const result = checkOvertimeConsecutive(records, {
      threshold: 45,
      consecutive_months: 2,
    });
    expect(result).toHaveLength(1);
    expect(result[0].thresholdRule).toBe("overtime_consecutive");
  });

  it("should not detect non-consecutive months", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-03", totalHours: 50 },
    ];
    const result = checkOvertimeConsecutive(records, {
      threshold: 45,
      consecutive_months: 2,
    });
    expect(result).toHaveLength(0);
  });

  it("should handle year boundary (Dec to Jan)", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2025-12", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 50 },
    ];
    const result = checkOvertimeConsecutive(records, {
      threshold: 45,
      consecutive_months: 2,
    });
    expect(result).toHaveLength(1);
  });

  it("should not trigger when one month is below threshold", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-02", totalHours: 44 },
    ];
    const result = checkOvertimeConsecutive(records, {
      threshold: 45,
      consecutive_months: 2,
    });
    expect(result).toHaveLength(0);
  });

  it("should handle 3 consecutive months requirement", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-02", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-03", totalHours: 50 },
    ];
    const result = checkOvertimeConsecutive(records, {
      threshold: 45,
      consecutive_months: 3,
    });
    expect(result).toHaveLength(1);
  });

  it("should separate different employees", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 50 },
      { employeeCode: "E002", yearMonth: "2026-01", totalHours: 50 },
      { employeeCode: "E001", yearMonth: "2026-02", totalHours: 50 },
    ];
    const result = checkOvertimeConsecutive(records, {
      threshold: 45,
      consecutive_months: 2,
    });
    expect(result).toHaveLength(1);
    expect(result[0].employeeCode).toBe("E001");
  });

  it("should use defaults when params not specified", () => {
    const records = [
      { employeeCode: "E001", yearMonth: "2026-01", totalHours: 45 },
      { employeeCode: "E001", yearMonth: "2026-02", totalHours: 45 },
    ];
    const result = checkOvertimeConsecutive(records, {});
    expect(result).toHaveLength(1);
  });
});
