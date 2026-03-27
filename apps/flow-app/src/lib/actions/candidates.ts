"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CaseCandidateWithEmployee } from "@/types/case";
import type { Database } from "@/lib/supabase/types";

type CaseCandidateRow = Database["public"]["Tables"]["case_candidates"]["Row"];

export async function getCandidates(
  statusFilter?: string
): Promise<CaseCandidateWithEmployee[]> {
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

  let query = supabase
    .from("case_candidates")
    .select("*, employees(name, department)")
    .eq("company_id", profile.company_id)
    .order("detected_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CaseCandidateWithEmployee[];
}

export async function getPendingCandidateCount(): Promise<number> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return 0;

  const { count } = await supabase
    .from("case_candidates")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("status", "pending");

  return count ?? 0;
}

export async function approveCandidate(candidateId: string): Promise<string> {
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

  // Get candidate
  const { data: candidateRaw, error: candError } = await supabase
    .from("case_candidates")
    .select("*")
    .eq("id", candidateId)
    .eq("company_id", profile.company_id)
    .single();

  if (candError || !candidateRaw) throw new Error("候補が見つかりません");
  const candidate = candidateRaw as unknown as CaseCandidateRow;
  if (candidate.status !== "pending") throw new Error("この候補は既に処理済みです");

  // Create case (reusing pattern from cases.ts createCase)
  const { data: caseData, error: caseError } = await supabase
    .from("cases")
    .insert({
      company_id: profile.company_id,
      employee_id: candidate.employee_id,
      current_phase: "phase0_detection",
      trigger_type: candidate.trigger_type,
      trigger_detail: candidate.trigger_detail,
      detected_at: candidate.detected_at,
    })
    .select("id")
    .single();

  if (caseError || !caseData) throw caseError ?? new Error("ケースの作成に失敗しました");

  // Update candidate
  await supabase
    .from("case_candidates")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      created_case_id: caseData.id,
    })
    .eq("id", candidateId);

  // Create case event
  const { data: employee } = await supabase
    .from("employees")
    .select("name")
    .eq("id", candidate.employee_id)
    .single();

  await supabase.from("case_events").insert({
    case_id: caseData.id,
    event_type: "case_created",
    event_date: new Date().toISOString(),
    description: `自動検知承認: ${employee?.name ?? "不明"}のケースを作成（${candidate.trigger_detail ?? ""}）`,
    created_by: user.id,
  });

  revalidatePath("/candidates");
  revalidatePath("/dashboard");

  return caseData.id;
}

export async function rejectCandidate(candidateId: string): Promise<void> {
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

  const { error } = await supabase
    .from("case_candidates")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", candidateId)
    .eq("company_id", profile.company_id)
    .eq("status", "pending");

  if (error) throw error;

  revalidatePath("/candidates");
}
