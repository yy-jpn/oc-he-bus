import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export interface MatchResult {
  matched: number;
  unmatched: string[];
}

export async function matchEmployees(
  supabase: SupabaseClient<Database>,
  companyId: string,
  importId: string
): Promise<MatchResult> {
  // Get all unique employee_codes from this import
  const { data: records } = await supabase
    .from("hr_data_records")
    .select("id, employee_code")
    .eq("import_id", importId);

  if (!records || records.length === 0) {
    return { matched: 0, unmatched: [] };
  }

  const uniqueCodes = [...new Set(records.map((r) => r.employee_code))];

  // Fetch employees with matching codes in this company
  const { data: employees } = await supabase
    .from("employees")
    .select("id, employee_code")
    .eq("company_id", companyId)
    .in("employee_code", uniqueCodes);

  const codeToEmployeeId = new Map<string, string>();
  for (const emp of employees ?? []) {
    if (emp.employee_code) {
      codeToEmployeeId.set(emp.employee_code, emp.id);
    }
  }

  let matched = 0;
  const unmatchedCodes = new Set<string>();

  // Update hr_data_records with matched employee_id
  for (const record of records) {
    const employeeId = codeToEmployeeId.get(record.employee_code);
    if (employeeId) {
      await supabase
        .from("hr_data_records")
        .update({ employee_id: employeeId })
        .eq("id", record.id);
      matched++;
    } else {
      unmatchedCodes.add(record.employee_code);
    }
  }

  return {
    matched,
    unmatched: [...unmatchedCodes],
  };
}
