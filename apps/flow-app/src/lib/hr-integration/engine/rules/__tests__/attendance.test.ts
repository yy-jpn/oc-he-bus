import { describe, it, expect } from "vitest";
import { checkAttendanceMultipleEvents } from "../attendance";

describe("checkAttendanceMultipleEvents", () => {
  it("should detect 2+ events within 4 weeks", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "tardiness" as const },
      { employeeCode: "E001", eventDate: "2026-03-15", eventType: "early_leave" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {
      event_count: 2,
      period_weeks: 4,
    });
    expect(result).toHaveLength(1);
    expect(result[0].thresholdRule).toBe("attendance_multiple_events");
  });

  it("should not detect events spread beyond period", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-01-01", eventType: "tardiness" as const },
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "early_leave" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {
      event_count: 2,
      period_weeks: 4,
    });
    expect(result).toHaveLength(0);
  });

  it("should handle mixed event types", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "tardiness" as const },
      { employeeCode: "E001", eventDate: "2026-03-10", eventType: "non_pto_absence" as const },
      { employeeCode: "E001", eventDate: "2026-03-20", eventType: "same_day_pto" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {
      event_count: 2,
      period_weeks: 4,
    });
    expect(result).toHaveLength(1);
  });

  it("should separate different employees", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "tardiness" as const },
      { employeeCode: "E002", eventDate: "2026-03-01", eventType: "tardiness" as const },
      { employeeCode: "E001", eventDate: "2026-03-15", eventType: "early_leave" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {
      event_count: 2,
      period_weeks: 4,
    });
    expect(result).toHaveLength(1);
    expect(result[0].employeeCode).toBe("E001");
  });

  it("should use defaults when params not specified", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "tardiness" as const },
      { employeeCode: "E001", eventDate: "2026-03-15", eventType: "early_leave" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {});
    expect(result).toHaveLength(1);
  });

  it("should handle single event (below threshold)", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "tardiness" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {
      event_count: 2,
      period_weeks: 4,
    });
    expect(result).toHaveLength(0);
  });

  it("should require 3 events when configured", () => {
    const records = [
      { employeeCode: "E001", eventDate: "2026-03-01", eventType: "tardiness" as const },
      { employeeCode: "E001", eventDate: "2026-03-15", eventType: "early_leave" as const },
    ];
    const result = checkAttendanceMultipleEvents(records, {
      event_count: 3,
      period_weeks: 4,
    });
    expect(result).toHaveLength(0);
  });
});
