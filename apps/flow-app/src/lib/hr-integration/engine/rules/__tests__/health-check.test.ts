import { describe, it, expect } from "vitest";
import { checkHealthCheckNonNormal } from "../health-check";

describe("checkHealthCheckNonNormal", () => {
  it("should detect non-normal employment decisions", () => {
    const records = [
      { employeeCode: "E001", checkDate: "2026-03-01", employmentDecision: "就業制限" },
      { employeeCode: "E002", checkDate: "2026-03-01", employmentDecision: "通常勤務" },
      { employeeCode: "E003", checkDate: "2026-03-01", employmentDecision: "要休業" },
    ];
    const result = checkHealthCheckNonNormal(records);
    expect(result).toHaveLength(2);
    expect(result[0].employeeCode).toBe("E001");
    expect(result[1].employeeCode).toBe("E003");
    expect(result[0].thresholdRule).toBe("health_check_non_normal");
  });

  it("should pass normal employment decision", () => {
    const records = [
      { employeeCode: "E001", checkDate: "2026-03-01", employmentDecision: "通常勤務" },
    ];
    const result = checkHealthCheckNonNormal(records);
    expect(result).toHaveLength(0);
  });

  it("should include decision detail in trigger detail", () => {
    const records = [
      { employeeCode: "E001", checkDate: "2026-03-01", employmentDecision: "就業制限" },
    ];
    const result = checkHealthCheckNonNormal(records);
    expect(result[0].triggerDetail).toContain("就業制限");
  });
});
