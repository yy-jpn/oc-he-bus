import { describe, it, expect } from "vitest";
import { checkStressCheckHigh } from "../stress-check";

describe("checkStressCheckHigh", () => {
  it("should detect high stress records", () => {
    const records = [
      { employeeCode: "E001", checkDate: "2026-03-01", highStress: true },
      { employeeCode: "E002", checkDate: "2026-03-01", highStress: false },
      { employeeCode: "E003", checkDate: "2026-03-01", highStress: true },
    ];
    const result = checkStressCheckHigh(records);
    expect(result).toHaveLength(2);
    expect(result[0].employeeCode).toBe("E001");
    expect(result[1].employeeCode).toBe("E003");
    expect(result[0].thresholdRule).toBe("stress_check_high");
  });

  it("should return empty when no high stress", () => {
    const records = [
      { employeeCode: "E001", checkDate: "2026-03-01", highStress: false },
    ];
    const result = checkStressCheckHigh(records);
    expect(result).toHaveLength(0);
  });

  it("should return empty for empty input", () => {
    const result = checkStressCheckHigh([]);
    expect(result).toHaveLength(0);
  });
});
