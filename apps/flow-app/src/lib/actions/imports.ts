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
import { processImportedRecords } from "@/lib/hr-integration/process-records";
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

  // Extract employee names for auto-creation (CSV overtime only)
  const employeeNames = dataType === "overtime" ? extractEmployeeNames(csvText) : new Map<string, string>();

  // Run shared processing pipeline: matching → threshold engine → case/candidate creation
  const result = await processImportedRecords(
    supabase,
    companyId,
    importRecord.id,
    user.id,
    dataType,
    employeeNames
  );

  revalidatePath("/candidates");
  revalidatePath("/dashboard");
  revalidatePath("/settings/import");

  return {
    importId: importRecord.id,
    recordCount: parsedRecords.length,
    ...result,
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
