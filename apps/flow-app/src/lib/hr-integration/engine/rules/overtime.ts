import type {
  OvertimeRecord,
  CandidateProposal,
  ThresholdParameters,
} from "../../types";

export function checkOvertimeSingleMonth(
  records: OvertimeRecord[],
  params: ThresholdParameters
): CandidateProposal[] {
  const threshold = params.threshold ?? 80;
  const proposals: CandidateProposal[] = [];

  for (const record of records) {
    if (record.totalHours >= threshold) {
      proposals.push({
        employeeCode: record.employeeCode,
        triggerType: "overtime",
        triggerDetail: `単月${record.totalHours}h（${record.yearMonth}）`,
        thresholdRule: "overtime_single_month",
        sourceRecordIds: [],
      });
    }
  }

  return proposals;
}

export function checkOvertimeConsecutive(
  records: OvertimeRecord[],
  params: ThresholdParameters
): CandidateProposal[] {
  const threshold = params.threshold ?? 45;
  const consecutiveMonths = params.consecutive_months ?? 2;
  const proposals: CandidateProposal[] = [];

  // Group by employee
  const byEmployee = new Map<string, OvertimeRecord[]>();
  for (const record of records) {
    const existing = byEmployee.get(record.employeeCode) ?? [];
    existing.push(record);
    byEmployee.set(record.employeeCode, existing);
  }

  for (const [employeeCode, empRecords] of byEmployee) {
    // Sort by yearMonth ascending
    const sorted = [...empRecords].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth)
    );

    let consecutiveCount = 0;
    let consecutiveMonthsList: string[] = [];

    for (const record of sorted) {
      if (record.totalHours >= threshold) {
        // Check if this month is consecutive to the previous
        if (consecutiveCount > 0) {
          const prevMonth = consecutiveMonthsList[consecutiveMonthsList.length - 1];
          if (isConsecutiveMonth(prevMonth, record.yearMonth)) {
            consecutiveCount++;
            consecutiveMonthsList.push(record.yearMonth);
          } else {
            consecutiveCount = 1;
            consecutiveMonthsList = [record.yearMonth];
          }
        } else {
          consecutiveCount = 1;
          consecutiveMonthsList = [record.yearMonth];
        }

        if (consecutiveCount >= consecutiveMonths) {
          proposals.push({
            employeeCode,
            triggerType: "overtime",
            triggerDetail: `${consecutiveMonths}ヶ月連続${threshold}h超（${consecutiveMonthsList.join(", ")}）`,
            thresholdRule: "overtime_consecutive",
            sourceRecordIds: [],
          });
          // Reset to avoid duplicate proposals for overlapping windows
          consecutiveCount = 0;
          consecutiveMonthsList = [];
        }
      } else {
        consecutiveCount = 0;
        consecutiveMonthsList = [];
      }
    }
  }

  return proposals;
}

function isConsecutiveMonth(prev: string, current: string): boolean {
  const [prevYear, prevMonth] = prev.split("-").map(Number);
  const [curYear, curMonth] = current.split("-").map(Number);

  if (prevMonth === 12) {
    return curYear === prevYear + 1 && curMonth === 1;
  }
  return curYear === prevYear && curMonth === prevMonth + 1;
}
