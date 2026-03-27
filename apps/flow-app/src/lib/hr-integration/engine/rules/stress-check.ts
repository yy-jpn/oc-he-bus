import type {
  StressCheckRecord,
  CandidateProposal,
} from "../../types";

export function checkStressCheckHigh(
  records: StressCheckRecord[]
): CandidateProposal[] {
  const proposals: CandidateProposal[] = [];

  for (const record of records) {
    if (record.highStress) {
      proposals.push({
        employeeCode: record.employeeCode,
        triggerType: "stress_check",
        triggerDetail: `高ストレス判定（${record.checkDate}）`,
        thresholdRule: "stress_check_high",
        sourceRecordIds: [],
      });
    }
  }

  return proposals;
}
