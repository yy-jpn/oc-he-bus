import type {
  HealthCheckRecord,
  CandidateProposal,
} from "../../types";

export function checkHealthCheckNonNormal(
  records: HealthCheckRecord[]
): CandidateProposal[] {
  const proposals: CandidateProposal[] = [];

  for (const record of records) {
    if (record.employmentDecision !== "通常勤務") {
      proposals.push({
        employeeCode: record.employeeCode,
        triggerType: "health_check",
        triggerDetail: `就業判定: ${record.employmentDecision}（${record.checkDate}）`,
        thresholdRule: "health_check_non_normal",
        sourceRecordIds: [],
      });
    }
  }

  return proposals;
}
