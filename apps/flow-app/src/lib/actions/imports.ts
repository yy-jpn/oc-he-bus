"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  parseOvertimeCSV,
  parseStressCheckCSV,
  parseHealthCheckCSV,
  parseAttendanceCSV,
  extractEmployeeNames,
} from "@/lib/hr-integration/adapters/csv-parsers";
import { matchEmployees } from "@/lib/hr-integration/matching";
import { runThresholdEngine } from "@/lib/hr-integration/engine/threshold-engine";
import type { ThresholdSetting } from "@/lib/hr-integration/types";
import type { Database, Json } from "@/lib/supabase/types";

export async function uploadCsvAndProcess(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("Company not found");

  const companyId = profile.company_id;
  const dataType = formData.get("data_type") as string;
  const file = formData.get("file") as File;

  if (!file || !dataType) throw new Error("ファイルとデータ種別を指定してください");

  const csvText = await file.text();

  // Parse CSV based on data type
  let parsedRecords: Array<{
    employee_code: string;
    data: Json;
    period_start: string | null;
    period_end: string | null;
  }> = [];

  if (dataType === "overtime") {
    const records = parseOvertimeCSV(csvText);
    parsedRecords = records.map((r) => ({
      employee_code: r.employeeCode,
      data: { year_month: r.yearMonth, total_hours: r.totalHours },
      period_start: `${r.yearMonth}-01`,
      period_end: getLastDayOfMonth(r.yearMonth),
    }));
  } else if (dataType === "stress_check") {
    const records = parseStressCheckCSV(csvText);
    parsedRecords = records.map((r) => ({
      employee_code: r.employeeCode,
      data: { check_date: r.checkDate, high_stress: r.highStress },
      period_start: r.checkDate,
      period_end: r.checkDate,
    }));
  } else if (dataType === "health_check") {
    const records = parseHealthCheckCSV(csvText);
    parsedRecords = records.map((r) => ({
      employee_code: r.employeeCode,
      data: {
        check_date: r.checkDate,
        employment_decision: r.employmentDecision,
      },
      period_start: r.checkDate,
      period_end: r.checkDate,
    }));
  } else if (dataType === "attendance") {
    const records = parseAttendanceCSV(csvText);
    parsedRecords = records.map((r) => ({
      employee_code: r.employeeCode,
      data: { event_date: r.eventDate, event_type: r.eventType },
      period_start: r.eventDate,
      period_end: r.eventDate,
    }));
  } else {
    throw new Error("不正なデータ種別です");
  }

  if (parsedRecords.length === 0) {
    throw new Error("CSVからレコードを読み取れませんでした");
  }

  // Create import record
  const { data: importRecord, error: importError } = await supabase
    .from("hr_data_imports")
    .insert({
      company_id: companyId,
      source_type: "csv",
      data_type: dataType,
      record_count: parsedRecords.length,
      status: "processing",
    })
    .select("id")
    .single();

  if (importError || !importRecord) throw importError ?? new Error("インポートレコードの作成に失敗しました");

  // Insert data records
  const dataRecords = parsedRecords.map((r) => ({
    import_id: importRecord.id,
    company_id: companyId,
    employee_code: r.employee_code,
    data_type: dataType,
    period_start: r.period_start,
    period_end: r.period_end,
    data: r.data as Json,
  }));

  const { error: recordsError } = await supabase
    .from("hr_data_records")
    .insert(dataRecords);

  if (recordsError) throw recordsError;

  // Auto-create employees from CSV names if not found
  const employeeNames = dataType === "overtime" ? extractEmployeeNames(csvText) : new Map<string, string>();
  if (employeeNames.size > 0) {
    const { data: existingEmps } = await supabase
      .from("employees")
      .select("employee_code")
      .eq("company_id", companyId)
      .not("employee_code", "is", null);

    const existingCodes = new Set((existingEmps ?? []).map((e) => e.employee_code));
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
  const matchResult = await matchEmployees(supabase, companyId, importRecord.id);

  // Get threshold settings
  const { data: settingsData } = await supabase
    .from("threshold_settings")
    .select("*")
    .eq("company_id", companyId);

  type ThresholdSettingRow = Database["public"]["Tables"]["threshold_settings"]["Row"];
  const settingsRows = (settingsData ?? []) as unknown as ThresholdSettingRow[];

  const settings: ThresholdSetting[] = settingsRows.map((s) => ({
    ruleKey: s.rule_key,
    triggerType: s.trigger_type,
    enabled: s.enabled,
    autoApprove: s.auto_approve,
    parameters: s.parameters as ThresholdSetting["parameters"],
  }));

  // Build dedup keys from pending candidates only (not cases — cases will be updated)
  const { data: employees } = await supabase
    .from("employees")
    .select("id, employee_code")
    .eq("company_id", companyId)
    .not("employee_code", "is", null);

  const idToCode = new Map<string, string>();
  for (const emp of employees ?? []) {
    if (emp.employee_code) idToCode.set(emp.id, emp.employee_code);
  }

  const existingKeys = new Set<string>();

  // Get matched records for engine
  type HrDataRecordRow = Database["public"]["Tables"]["hr_data_records"]["Row"];
  const { data: matchedRecordsRaw } = await supabase
    .from("hr_data_records")
    .select("*")
    .eq("import_id", importRecord.id)
    .not("employee_id", "is", null);
  const matchedRecords = (matchedRecordsRaw ?? []) as unknown as HrDataRecordRow[];

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
            eventType: d.event_type as "tardiness" | "early_leave" | "non_pto_absence" | "same_day_pto",
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
    .not("current_phase", "in", '("closed","resolved_without_leave","follow_up_completed")');

  const activeCaseByEmployee = new Map<string, { id: string; trigger_type: string | null; trigger_detail: string | null }>();
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
        description: `CSV取込による更新: ${employee?.name ?? "不明"}（${proposal.triggerDetail}）`,
        created_by: user.id,
      });

      casesUpdated++;
    } else {
      // No existing case — check auto-approve setting
      const ruleSetting = settings.find((s) => s.ruleKey === proposal.thresholdRule);
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
            description: `CSV自動検知: ${employee?.name ?? "不明"}のケースを自動作成（${proposal.triggerDetail}）`,
            created_by: user.id,
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
        await supabase
          .from("case_candidates")
          .insert({
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

  // Update import status
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
      },
    })
    .eq("id", importRecord.id);

  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/settings/import");

  return {
    importId: importRecord.id,
    recordCount: parsedRecords.length,
    matched: matchResult.matched,
    unmatched: matchResult.unmatched,
    casesCreated,
    casesUpdated,
    candidatesCreated,
  };
}

export async function getImportHistory(): Promise<
  Database["public"]["Tables"]["hr_data_imports"]["Row"][]
> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("Company not found");

  const { data, error } = await supabase
    .from("hr_data_imports")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("imported_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as unknown as Database["public"]["Tables"]["hr_data_imports"]["Row"][];
}

function getLastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
}
