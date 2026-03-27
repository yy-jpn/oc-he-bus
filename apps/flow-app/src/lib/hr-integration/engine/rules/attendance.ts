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
  const periodMs = periodWeeks * 7 * 24 * 60 * 60 * 1000;
  const proposals: CandidateProposal[] = [];

  // Group by employee
  const byEmployee = new Map<string, AttendanceRecord[]>();
  for (const record of records) {
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
