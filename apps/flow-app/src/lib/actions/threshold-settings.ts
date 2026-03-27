"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { Database, Json } from "@/lib/supabase/types";

type ThresholdSettingRow = Database["public"]["Tables"]["threshold_settings"]["Row"];

export async function getThresholdSettings(): Promise<ThresholdSettingRow[]> {
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
    .from("threshold_settings")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("trigger_type");

  if (error) throw error;
  return (data ?? []) as unknown as ThresholdSettingRow[];
}

export async function updateThresholdSetting(
  id: string,
  params: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("threshold_settings")
    .update({
      parameters: params as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/settings/thresholds");
}

export async function toggleThresholdRule(
  id: string,
  enabled: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("threshold_settings")
    .update({
      enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/settings/thresholds");
}

export async function toggleAutoApprove(
  id: string,
  autoApprove: boolean
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("threshold_settings")
    .update({
      auto_approve: autoApprove,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw error;

  revalidatePath("/settings/thresholds");
}
