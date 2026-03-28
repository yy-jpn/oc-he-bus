import type {
  AttendanceRecord,
  CandidateProposal,
  ThresholdParameters,
} from "../../types";

export function checkAttendanceMultipleEvents(
  records: AttendanceRecord[],
  params: ThresholdParameters
): CandidateProposal[] {
  const eventCount = params.event_count ?? 2;
  const periodWeeks = params.period_weeks ?? 4;
  const enabledTypes = params.enabled_event_types ?? [
    "tardiness",
    "early_leave",
    "non_pto_absence",
    "same_day_pto",
  ];
  const periodMs = periodWeeks * 7 * 24 * 60 * 60 * 1000;
  const proposals: CandidateProposal[] = [];

  // pto_absence のうち confirmed なものだけ same_day_pto に変換し、
  // 未確認の pto_absence は閾値判定から除外
  const processedRecords = records
    .map((r) => {
      if (r.eventType === "pto_absence" && r.sameDayConfirmed) {
        return { ...r, eventType: "same_day_pto" as const };
      }
      return r;
    })
    .filter((r) => r.eventType !== "pto_absence")
    .filter((r) => enabledTypes.includes(r.eventType));

  // Group by employee
  const byEmployee = new Map<string, AttendanceRecord[]>();
  for (const record of processedRecords) {
    const existing = byEmployee.get(record.employeeCode) ?? [];
    existing.push(record);
    byEmployee.set(record.employeeCode, existing);
  }

  for (const [employeeCode, empRecords] of byEmployee) {
    // Sort by date ascending
    const sorted = [...empRecords].sort(
      (a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );

    // Sliding window: check if any window of periodWeeks contains >= eventCount events
    for (let i = 0; i < sorted.length; i++) {
      const windowStart = new Date(sorted[i].eventDate).getTime();
      const windowEnd = windowStart + periodMs;

      const eventsInWindow = sorted.filter((r) => {
        const t = new Date(r.eventDate).getTime();
        return t >= windowStart && t <= windowEnd;
      });

      if (eventsInWindow.length >= eventCount) {
        const EVENT_TYPE_LABELS: Record<string, string> = {
          tardiness: "遅刻",
          early_leave: "早退",
          non_pto_absence: "無届欠勤",
          same_day_pto: "当日有休",
          pto_absence: "有給欠勤",
        };

        const details = eventsInWindow
          .map((e) => `${EVENT_TYPE_LABELS[e.eventType] ?? e.eventType}(${e.eventDate})`)
          .join(", ");

        proposals.push({
          employeeCode,
          triggerType: "attendance",
          triggerDetail: `${periodWeeks}週間以内に${eventsInWindow.length}件: ${details}`,
          thresholdRule: "attendance_multiple_events",
          sourceRecordIds: [],
        });
        break; // One proposal per employee
      }
    }
  }

  return proposals;
}
