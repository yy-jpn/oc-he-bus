"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  encryptCredentialsJson,
  maskCredential,
} from "@/lib/hr-integration/credentials";
import {
  getAdapterDefinition,
  getAllAdapterDefinitions,
} from "@/lib/hr-integration/adapters/registry";
import { executeSyncForConnection } from "@/lib/hr-integration/sync-orchestrator";
import { HrApiClient } from "@/lib/hr-integration/api-client";
import type { Database } from "@/lib/supabase/types";

// --- DB型エイリアス ---
type HrConnectionRow = Database["public"]["Tables"]["hr_connections"]["Row"];
type HrSyncLogRow = Database["public"]["Tables"]["hr_sync_logs"]["Row"];
type HrSyncAlertRow = Database["public"]["Tables"]["hr_sync_alerts"]["Row"];

// --- 型定義 ---

export interface ConnectionListItem {
  id: string;
  adapterType: string;
  displayName: string;
  authType: string;
  syncDataTypes: string[];
  schedule: string;
  scheduleTime: string | null;
  scheduleDayOfWeek: number | null;
  isActive: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  createdAt: string;
  unresolvedAlerts: number;
}

export interface SyncLogItem {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  dataTypesRequested: string[] | null;
  dataTypesSucceeded: string[] | null;
  dataTypesFailed: string[] | null;
  recordsFetched: number;
  candidatesCreated: number;
  casesCreated: number;
  casesUpdated: number;
  errorMessage: string | null;
}

// --- ヘルパー ---

async function requireHrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("Company not found");
  if (profile.role !== "hr_admin") throw new Error("Forbidden");

  return { supabase, userId: user.id, companyId: profile.company_id };
}

// --- 接続CRUD ---

export async function getConnections(): Promise<ConnectionListItem[]> {
  const { supabase, companyId } = await requireHrAdmin();

  const { data: rawConnections, error } = await supabase
    .from("hr_connections")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const connections = (rawConnections ?? []) as unknown as HrConnectionRow[];

  // 各接続の未解決アラート数を取得
  const { data: rawAlerts } = await supabase
    .from("hr_sync_alerts")
    .select("connection_id")
    .eq("company_id", companyId)
    .eq("resolved", false);
  const alerts = (rawAlerts ?? []) as unknown as Pick<HrSyncAlertRow, "connection_id">[];

  const alertCounts = new Map<string, number>();
  for (const a of alerts) {
    alertCounts.set(
      a.connection_id,
      (alertCounts.get(a.connection_id) ?? 0) + 1
    );
  }

  return connections.map((c) => ({
    id: c.id,
    adapterType: c.adapter_type,
    displayName: c.display_name,
    authType: c.auth_type,
    syncDataTypes: c.sync_data_types ?? [],
    schedule: c.schedule,
    scheduleTime: c.schedule_time,
    scheduleDayOfWeek: c.schedule_day_of_week,
    isActive: c.is_active,
    lastSyncedAt: c.last_synced_at,
    lastSyncStatus: c.last_sync_status,
    createdAt: c.created_at,
    unresolvedAlerts: alertCounts.get(c.id) ?? 0,
  }));
}

export async function createConnection(data: {
  adapterType: string;
  displayName: string;
  credentials: Record<string, string>;
  config?: Record<string, string>;
  syncDataTypes: string[];
  schedule: string;
  scheduleTime?: string;
  scheduleDayOfWeek?: number;
}): Promise<{ id: string }> {
  const { supabase, companyId } = await requireHrAdmin();

  const adapterDef = getAdapterDefinition(data.adapterType);
  if (!adapterDef) throw new Error("不明なアダプタ種別です");

  const encrypted = encryptCredentialsJson(data.credentials);

  const { data: connection, error } = await supabase
    .from("hr_connections")
    .insert({
      company_id: companyId,
      adapter_type: data.adapterType,
      display_name: data.displayName,
      auth_type: adapterDef.authType,
      credentials_encrypted: encrypted.toString("base64"),
      config: data.config ?? {},
      sync_data_types: data.syncDataTypes,
      schedule: data.schedule,
      schedule_time: data.scheduleTime ?? "03:00",
      schedule_day_of_week: data.scheduleDayOfWeek ?? null,
    })
    .select("id")
    .single();

  if (error || !connection) throw error ?? new Error("接続の作成に失敗しました");

  revalidatePath("/settings/connections");
  return { id: connection.id };
}

export async function updateConnection(
  id: string,
  data: {
    displayName?: string;
    credentials?: Record<string, string>;
    config?: Record<string, string>;
    syncDataTypes?: string[];
    schedule?: string;
    scheduleTime?: string;
    scheduleDayOfWeek?: number | null;
    isActive?: boolean;
  }
): Promise<void> {
  const { supabase, companyId } = await requireHrAdmin();

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.displayName !== undefined)
    updateData.display_name = data.displayName;
  if (data.syncDataTypes !== undefined)
    updateData.sync_data_types = data.syncDataTypes;
  if (data.schedule !== undefined) updateData.schedule = data.schedule;
  if (data.scheduleTime !== undefined)
    updateData.schedule_time = data.scheduleTime;
  if (data.scheduleDayOfWeek !== undefined)
    updateData.schedule_day_of_week = data.scheduleDayOfWeek;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.config !== undefined) updateData.config = data.config;

  // credentials は「変更がある場合のみ」暗号化して更新
  if (data.credentials && Object.keys(data.credentials).length > 0) {
    updateData.credentials_encrypted = encryptCredentialsJson(
      data.credentials
    ).toString("base64");
  }

  const { error } = await supabase
    .from("hr_connections")
    .update(updateData as Database["public"]["Tables"]["hr_connections"]["Update"])
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  revalidatePath("/settings/connections");
}

export async function deleteConnection(id: string): Promise<void> {
  const { supabase, companyId } = await requireHrAdmin();

  const { error } = await supabase
    .from("hr_connections")
    .delete()
    .eq("id", id)
    .eq("company_id", companyId);

  if (error) throw error;
  revalidatePath("/settings/connections");
}

// --- テスト接続 ---

export async function testConnection(data: {
  adapterType: string;
  credentials: Record<string, string>;
  config?: Record<string, string>;
}): Promise<{ success: boolean; message: string }> {
  await requireHrAdmin();

  const adapterDef = getAdapterDefinition(data.adapterType);
  if (!adapterDef) return { success: false, message: "不明なアダプタ種別です" };

  try {
    // アダプタ固有のテスト接続を試みる
    if (data.adapterType === "smarthr") {
      const tenantId = data.config?.tenant_id ?? "";
      if (!tenantId)
        return { success: false, message: "テナントIDを入力してください" };

      const client = new HrApiClient({
        baseUrl: `https://${tenantId}.smarthr.jp`,
        headers: {
          Authorization: `Bearer ${data.credentials.access_token}`,
        },
      });
      const result = await client.testConnection("/api/v1/users/me");
      return { success: result.ok, message: result.message };
    }

    // OAuth2アダプタの場合は認証フロー完了後にテスト可能
    if (adapterDef.authType === "oauth2") {
      return {
        success: true,
        message: "OAuth2認証後にテスト接続が実行されます",
      };
    }

    return { success: false, message: "テスト接続未対応のアダプタです" };
  } catch (error) {
    return {
      success: false,
      message: `接続テスト失敗: ${(error as Error).message}`,
    };
  }
}

// --- 同期操作 ---

export async function triggerManualSync(
  connectionId: string
): Promise<{ syncLogId: string; status: string; message: string }> {
  const { companyId } = await requireHrAdmin();

  // 接続が自社のものか確認
  const supabase = await createClient();
  const { data: rawConnection } = await supabase
    .from("hr_connections")
    .select("id, company_id")
    .eq("id", connectionId)
    .eq("company_id", companyId)
    .single();

  if (!rawConnection) throw new Error("接続が見つかりません");

  const result = await executeSyncForConnection(connectionId);

  revalidatePath("/settings/connections");
  revalidatePath("/candidates");
  revalidatePath("/dashboard");

  const statusMessages: Record<string, string> = {
    completed: "同期が完了しました",
    partial: "一部のデータ種別で同期に失敗しました",
    failed: `同期に失敗しました: ${result.errorMessage ?? ""}`,
  };

  return {
    syncLogId: result.syncLogId,
    status: result.status,
    message: statusMessages[result.status] ?? "同期完了",
  };
}

// --- 同期ログ ---

export async function getSyncLogs(
  connectionId: string
): Promise<SyncLogItem[]> {
  const { supabase, companyId } = await requireHrAdmin();

  const { data: rawData, error } = await supabase
    .from("hr_sync_logs")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  const data = (rawData ?? []) as unknown as HrSyncLogRow[];

  return data.map((log) => ({
    id: log.id,
    status: log.status,
    startedAt: log.started_at,
    completedAt: log.completed_at,
    dataTypesRequested: log.data_types_requested,
    dataTypesSucceeded: log.data_types_succeeded,
    dataTypesFailed: log.data_types_failed,
    recordsFetched: log.records_fetched ?? 0,
    candidatesCreated: log.candidates_created ?? 0,
    casesCreated: log.cases_created ?? 0,
    casesUpdated: log.cases_updated ?? 0,
    errorMessage: log.error_message,
  }));
}

// --- アラート ---

export async function getUnresolvedAlertCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id || profile.role !== "hr_admin") return 0;

  const { count } = await supabase
    .from("hr_sync_alerts")
    .select("*", { count: "exact", head: true })
    .eq("company_id", profile.company_id)
    .eq("resolved", false);

  return count ?? 0;
}

export async function resolveAlert(alertId: string): Promise<void> {
  const { supabase, companyId } = await requireHrAdmin();

  const { error } = await supabase
    .from("hr_sync_alerts")
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    } as Database["public"]["Tables"]["hr_sync_alerts"]["Update"])
    .eq("id", alertId)
    .eq("company_id", companyId);

  if (error) throw error;
  revalidatePath("/settings/connections");
}

// --- アダプタ定義一覧（UI用） ---

export async function getAdapterDefinitions() {
  return getAllAdapterDefinitions().map((def) => ({
    type: def.type,
    displayName: def.displayName,
    description: def.description,
    icon: def.icon,
    authType: def.authType,
    supportedDataTypes: def.supportedDataTypes,
    credentialFields: def.credentialFields,
    configFields: def.configFields ?? [],
  }));
}
