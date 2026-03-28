import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/types";
import type { ThresholdSetting } from "@/lib/hr-integration/types";
import { matchEmployees } from "@/lib/hr-integration/matching";
import { runThresholdEngine } from "@/lib/hr-integration/engine/threshold-engine";

export interface ProcessResult {
  matched: number;
  unmatched: string[];
  casesCreated: number;
  casesUpdated: number;
  candidatesCreated: number;
}

/**
 * hr_data_records に挿入済みのレコードに対して、
 * 従業員マッチング → 閾値エンジン → ケース/候補作成を行う共通処理。
 *
 * CSV取込・API同期の両方からこの関数を呼び出す。
 */
export async function processImportedRecords(
  supabase: SupabaseClient<Database>,
  companyId: string,
  importId: string,
  userId: string,
  dataType: string,
  employeeNames?: Map<string, string>
): Promise<ProcessResult> {
  // Auto-create employees from names if provided (CSV import)
  if (employeeNames && employeeNames.size > 0) {
    const { data: existingEmps } = await supabase
      .from("employees")
      .select("employee_code")
      .eq("company_id", companyId)
      .not("employee_code", "is", null);

    const existingCodes = new Set(
      (existingEmps ?? []).map((e) => e.employee_code)
    );
    for (const [code, name] of employeeNames) {
      if (!existingCodes.has(code)) {
        await supabase.from("employees").insert({
          company_id: companyId,
          employee_code: code,
          name,
        });
      }
    }
  }

  // Match employees
  const matchResult = await matchEmployees(supabase, companyId, importId);

  // Get threshold settings
  const { data: settingsData } = await supabase
    .from("threshold_settings")
    .select("*")
    .eq("company_id", companyId);

  type ThresholdSettingRow =
    Database["public"]["Tables"]["threshold_settings"]["Row"];
  const settingsRows =
    (settingsData ?? []) as unknown as ThresholdSettingRow[];

  const settings: ThresholdSetting[] = settingsRows.map((s) => ({
    ruleKey: s.rule_key,
    triggerType: s.trigger_type,
    enabled: s.enabled,
    autoApprove: s.auto_approve,
    parameters: s.parameters as ThresholdSetting["parameters"],
  }));

  // Build dedup keys from pending candidates only
  const { data: employees } = await supabase
    .from("employees")
    .select("id, employee_code")
    .eq("company_id", companyId)
    .not("employee_code", "is", null);

  const existingKeys = new Set<string>();

  // Get matched records for engine
  type HrDataRecordRow =
    Database["public"]["Tables"]["hr_data_records"]["Row"];
  const { data: matchedRecordsRaw } = await supabase
    .from("hr_data_records")
    .select("*")
    .eq("import_id", importId)
    .not("employee_id", "is", null);
  const matchedRecords =
    (matchedRecordsRaw ?? []) as unknown as HrDataRecordRow[];

  // Build engine input based on data type
  const overtimeRecords =
    dataType === "overtime"
      ? matchedRecords.map((r) => {
          const d = r.data as Record<string, unknown>;
          return {
            employeeCode: r.employee_code,
            yearMonth: d.year_month as string,
            totalHours: d.total_hours as number,
          };
        })
      : [];

  const stressCheckRecords =
    dataType === "stress_check"
      ? matchedRecords.map((r) => {
          const d = r.data as Record<string, unknown>;
          return {
            employeeCode: r.employee_code,
            checkDate: d.check_date as string,
            highStress: d.high_stress as boolean,
          };
        })
      : [];

  const healthCheckRecords =
    dataType === "health_check"
      ? matchedRecords.map((r) => {
          const d = r.data as Record<string, unknown>;
          return {
            employeeCode: r.employee_code,
            checkDate: d.check_date as string,
            employmentDecision: d.employment_decision as string,
          };
        })
      : [];

  const attendanceRecords =
    dataType === "attendance"
      ? matchedRecords.map((r) => {
          const d = r.data as Record<string, unknown>;
          return {
            employeeCode: r.employee_code,
            eventDate: d.event_date as string,
            eventType: d.event_type as
              | "tardiness"
              | "early_leave"
              | "non_pto_absence"
              | "same_day_pto",
          };
        })
      : [];

  const proposals = runThresholdEngine({
    overtimeRecords,
    stressCheckRecords,
    healthCheckRecords,
    attendanceRecords,
    settings,
    existingKeys,
  });

  // Map employee_code to employee_id for case creation
  const codeToId = new Map<string, string>();
  for (const emp of employees ?? []) {
    if (emp.employee_code) codeToId.set(emp.employee_code, emp.id);
  }

  // Get existing active cases by employee_id for upsert logic
  const { data: activeCases } = await supabase
    .from("cases")
    .select("id, employee_id, trigger_type, trigger_detail")
    .eq("company_id", companyId)
    .not(
      "current_phase",
      "in",
      '("closed","resolved_without_leave","follow_up_completed")'
    );

  const activeCaseByEmployee = new Map<
    string,
    { id: string; trigger_type: string | null; trigger_detail: string | null }
  >();
  for (const c of activeCases ?? []) {
    if (c.employee_id) activeCaseByEmployee.set(c.employee_id, c);
  }

  // Process proposals: update existing cases, or create candidates/cases based on auto-approve
  let casesCreated = 0;
  let casesUpdated = 0;
  let candidatesCreated = 0;
  for (const proposal of proposals) {
    const employeeId = codeToId.get(proposal.employeeCode);
    if (!employeeId) continue;

    const { data: employee } = await supabase
      .from("employees")
      .select("name")
      .eq("id", employeeId)
      .single();

    const existingCase = activeCaseByEmployee.get(employeeId);

    if (existingCase) {
      // Update existing case with new trigger info
      await supabase
        .from("cases")
        .update({
          trigger_type: proposal.triggerType,
          trigger_detail: proposal.triggerDetail,
          detected_at: new Date().toISOString(),
        })
        .eq("id", existingCase.id);

      await supabase.from("case_events").insert({
        case_id: existingCase.id,
        event_type: "case_updated",
        event_date: new Date().toISOString(),
        description: `データ取込による更新: ${employee?.name ?? "不明"}（${proposal.triggerDetail}）`,
        created_by: userId,
      });

      casesUpdated++;
    } else {
      // No existing case — check auto-approve setting
      const ruleSetting = settings.find(
        (s) => s.ruleKey === proposal.thresholdRule
      );
      const isAutoApprove = ruleSetting?.autoApprove ?? false;

      if (isAutoApprove) {
        // Auto-approve: create case directly
        const { data: caseData } = await supabase
          .from("cases")
          .insert({
            company_id: companyId,
            employee_id: employeeId,
            current_phase: "phase0_detection",
            trigger_type: proposal.triggerType,
            trigger_detail: proposal.triggerDetail,
            detected_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (caseData) {
          await supabase.from("case_events").insert({
            case_id: caseData.id,
            event_type: "case_created",
            event_date: new Date().toISOString(),
            description: `自動検知: ${employee?.name ?? "不明"}のケースを自動作成（${proposal.triggerDetail}）`,
            created_by: userId,
          });

          activeCaseByEmployee.set(employeeId, {
            id: caseData.id,
            trigger_type: proposal.triggerType,
            trigger_detail: proposal.triggerDetail,
          });

          casesCreated++;
        }
      } else {
        // Not auto-approve: create candidate for manual review
        await supabase.from("case_candidates").insert({
          company_id: companyId,
          employee_id: employeeId,
          trigger_type: proposal.triggerType,
          trigger_detail: proposal.triggerDetail,
          threshold_rule: proposal.thresholdRule,
          source_record_ids: proposal.sourceRecordIds,
          status: "pending",
          detected_at: new Date().toISOString(),
        });

        candidatesCreated++;
      }
    }
  }

  // Update import metadata
  await supabase
    .from("hr_data_imports")
    .update({
      status: "completed",
      metadata: {
        matched: matchResult.matched,
        unmatched: matchResult.unmatched,
        cases_created: casesCreated,
        cases_updated: casesUpdated,
        candidates_created: candidatesCreated,
      } as unknown as Json,
    })
    .eq("id", importId);

  return {
    matched: matchResult.matched,
    unmatched: matchResult.unmatched,
    casesCreated,
    casesUpdated,
    candidatesCreated,
  };
}
