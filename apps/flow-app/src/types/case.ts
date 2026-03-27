import type { Database } from "@/lib/supabase/types";

export type Case = Database["public"]["Tables"]["cases"]["Row"];
export type Employee = Database["public"]["Tables"]["employees"]["Row"];
export type Interview = Database["public"]["Tables"]["interviews"]["Row"];
export type Leave = Database["public"]["Tables"]["leaves"]["Row"];
export type CaseEvent = Database["public"]["Tables"]["case_events"]["Row"];
export type User = Database["public"]["Tables"]["users"]["Row"];

export type CaseWithEmployee = Case & {
  employees: Pick<Employee, "name" | "department"> | null;
};

export type CaseDetail = Case & {
  employees: Pick<Employee, "name" | "department" | "position"> | null;
  case_events: CaseEvent[];
  interviews: Interview[];
  leaves: Leave[];
};

export type CaseCandidate =
  Database["public"]["Tables"]["case_candidates"]["Row"];

export type CaseCandidateWithEmployee = CaseCandidate & {
  employees: Pick<Employee, "name" | "department"> | null;
};
