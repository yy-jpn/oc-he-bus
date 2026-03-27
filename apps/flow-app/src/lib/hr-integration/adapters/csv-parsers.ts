import type {
  OvertimeRecord,
  StressCheckRecord,
  HealthCheckRecord,
  AttendanceRecord,
} from "../types";

function parseCSVLines(csv: string): string[][] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return []; // header + at least 1 row
  return lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));
}

function getCSVHeader(csv: string): string[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length === 0) return [];
  return lines[0].split(",").map((cell) => cell.trim());
}

const MONTH_ABBREV: Record<string, string> = {
  Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
  Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
};

/**
 * Parse a column header like "26-Mar" into "2026-03".
 * Returns null if the header doesn't match the expected pattern.
 */
function parseMonthHeader(header: string): string | null {
  // Match patterns like "26-Mar", "2026-Mar", "26-03"
  const abbrevMatch = header.match(/^(\d{2,4})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i);
  if (abbrevMatch) {
    let year = abbrevMatch[1];
    if (year.length === 2) year = "20" + year;
    const month = MONTH_ABBREV[abbrevMatch[2].charAt(0).toUpperCase() + abbrevMatch[2].slice(1).toLowerCase()];
    if (month) return `${year}-${month}`;
  }
  // Match patterns like "2026-03"
  const numericMatch = header.match(/^(\d{4})-(\d{2})$/);
  if (numericMatch) return header;
  return null;
}

export type OvertimeCSVRow = {
  employeeCode: string;
  employeeName: string | null;
  records: OvertimeRecord[];
};

export function parseOvertimeCSV(csv: string): OvertimeRecord[] {
  const header = getCSVHeader(csv);
  const rows = parseCSVLines(csv);
  if (header.length === 0 || rows.length === 0) return [];

  // Detect format: new columnar format has month headers from column index 2+
  const monthColumns: { index: number; yearMonth: string }[] = [];
  for (let i = 2; i < header.length; i++) {
    const ym = parseMonthHeader(header[i]);
    if (ym) monthColumns.push({ index: i, yearMonth: ym });
  }

  if (monthColumns.length > 0) {
    // New columnar format: employee_code, name, month1, month2, ...
    const records: OvertimeRecord[] = [];
    for (const cols of rows) {
      if (!cols[0]) continue;
      for (const mc of monthColumns) {
        const hours = parseFloat(cols[mc.index]) || 0;
        records.push({
          employeeCode: cols[0],
          yearMonth: mc.yearMonth,
          totalHours: hours,
        });
      }
    }
    return records;
  }

  // Legacy format: employee_code, year_month, total_hours
  return rows
    .filter((cols) => cols.length >= 3 && cols[0] && cols[1])
    .map((cols) => ({
      employeeCode: cols[0],
      yearMonth: cols[1],
      totalHours: parseFloat(cols[2]) || 0,
    }));
}

/**
 * Extract employee name mapping from columnar overtime CSV.
 * Returns a map of employee_code → name.
 */
export function extractEmployeeNames(csv: string): Map<string, string> {
  const header = getCSVHeader(csv);
  const rows = parseCSVLines(csv);
  const names = new Map<string, string>();

  // Check if this is columnar format (has month headers from col 2+)
  const hasMonthCols = header.length > 2 && parseMonthHeader(header[2]) !== null;
  if (!hasMonthCols) return names;

  for (const cols of rows) {
    if (cols[0] && cols[1]) {
      names.set(cols[0], cols[1]);
    }
  }
  return names;
}

export function parseStressCheckCSV(csv: string): StressCheckRecord[] {
  // Format: employee_code, check_date, high_stress (true/false)
  return parseCSVLines(csv)
    .filter((cols) => cols.length >= 3 && cols[0] && cols[1])
    .map((cols) => ({
      employeeCode: cols[0],
      checkDate: cols[1],
      highStress: cols[2].toLowerCase() === "true",
    }));
}

export function parseHealthCheckCSV(csv: string): HealthCheckRecord[] {
  // Format: employee_code, check_date, employment_decision
  return parseCSVLines(csv)
    .filter((cols) => cols.length >= 3 && cols[0] && cols[1])
    .map((cols) => ({
      employeeCode: cols[0],
      checkDate: cols[1],
      employmentDecision: cols[2],
    }));
}

export function parseAttendanceCSV(csv: string): AttendanceRecord[] {
  // Format: employee_code, event_date, event_type
  const validTypes = new Set([
    "tardiness",
    "early_leave",
    "non_pto_absence",
    "same_day_pto",
  ]);
  return parseCSVLines(csv)
    .filter(
      (cols) => cols.length >= 3 && cols[0] && cols[1] && validTypes.has(cols[2])
    )
    .map((cols) => ({
      employeeCode: cols[0],
      eventDate: cols[1],
      eventType: cols[2] as AttendanceRecord["eventType"],
    }));
}
