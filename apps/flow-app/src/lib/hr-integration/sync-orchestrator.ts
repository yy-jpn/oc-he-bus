import { createServiceClient } from "@/lib/supabase/service";
import { decryptCredentialsJson } from "./credentials";
import { getAdapterDefinition } from "./adapters/registry";
import { processImportedRecords } from "./process-records";
import type { HrDataAdapter } from "./adapters/base";
import type { DateRange } from "./types";
import type { Database, Json } from "@/lib/supabase/types";

type HrConnectionRow = Database["public"]["Tables"]["hr_connections"]["Row"];
type HrSyncLogInsert = Database["public"]["Tables"]["hr_sync_logs"]["Insert"];
type HrSyncLogUpdate = Database["public"]["Tables"]["hr_sync_logs"]["Update"];
type HrConnectionUpdate = Database["public"]["Tables"]["hr_connections"]["Update"];
type HrSyncAlertInsert = Database["public"]["Tables"]["hr_sync_alerts"]["Insert"];

export interface SyncResult {
  syncLogId: string;
  status: "completed" | "partial" | "failed";
  recordsFetched: number;
  casesCreated: number;
  casesUpdated: number;
  candidatesCreated: number;
  dataTypesSucceeded: string[];
  dataTypesFailed: string[];
  errorMessage?: string;
}

/**
 * 特定の接続に対してデータ同期を実行する。
 *
 * 処理フロー:
 * 1. 接続情報取得 → 資格情報復号
 * 2. アダプタ生成
 * 3. データ種別ごとにフェッチ（個別try-catchで部分失敗対応）
 * 4. hr_data_imports/records に保存
 * 5. processImportedRecords() で閾値判定・ケース作成
 * 6. hr_sync_logs に結果記録
 * 7. 失敗時は hr_sync_alerts にアラート作成
 */
export async function executeSyncForConnection(
  connectionId: string
): Promise<SyncResult> {
  const supabase = createServiceClient();

  // 1. 接続情報取得
  const { data: rawConnection, error: connError } = await supabase
    .from("hr_connections")
    .select("*")
    .eq("id", connectionId)
    .single();

  if (connError || !rawConnection) {
    throw new Error(`Connection not found: ${connectionId}`);
  }
  const connection = rawConnection as unknown as HrConnectionRow;

  // 同期ログ作成
  const { data: rawSyncLog } = await supabase
    .from("hr_sync_logs")
    .insert({
      connection_id: connectionId,
      company_id: connection.company_id,
      status: "running",
      data_types_requested: connection.sync_data_types,
    } satisfies HrSyncLogInsert)
    .select("id")
    .single();

  const syncLog = rawSyncLog as unknown as { id: string } | null;
  if (!syncLog) throw new Error("Failed to create sync log");

  try {
    // 2. 資格情報復号
    let credentials: Record<string, string> = {};
    if (connection.credentials_encrypted) {
      credentials = decryptCredentialsJson(
        Buffer.from(connection.credentials_encrypted)
      );
    }

    // OAuth2の場合: oauth_stateからaccess_tokenを取得
    if (connection.auth_type === "oauth2" && connection.oauth_state) {
      const oauthState = connection.oauth_state as Record<string, unknown>;
      if (oauthState.access_token) {
        credentials.access_token = oauthState.access_token as string;
      }

      // トークン期限チェック
      if (oauthState.expires_at) {
        const expiresAt = new Date(oauthState.expires_at as string);
        if (expiresAt <= new Date()) {
          await createAlert(
            supabase,
            connectionId,
            connection.company_id,
            syncLog.id,
            "auth_expired",
            "OAuth2トークンの有効期限が切れています。再認証してください。"
          );

          await finalizeSyncLog(supabase, syncLog.id, {
            status: "failed",
            errorMessage: "OAuth2トークンの有効期限切れ",
          });

          await updateConnectionStatus(supabase, connectionId, "failed");

          return {
            syncLogId: syncLog.id,
            status: "failed",
            recordsFetched: 0,
            casesCreated: 0,
            casesUpdated: 0,
            candidatesCreated: 0,
            dataTypesSucceeded: [],
            dataTypesFailed: connection.sync_data_types ?? [],
            errorMessage: "OAuth2トークンの有効期限切れ",
          };
        }
      }
    }

    // 3. アダプタ生成
    const adapterDef = getAdapterDefinition(connection.adapter_type);
    if (!adapterDef) {
      throw new Error(
        `Unknown adapter type: ${connection.adapter_type}`
      );
    }

    const config = (connection.config as Record<string, string>) ?? {};
    const adapter = adapterDef.createAdapter(credentials, config);

    // 4. データ種別ごとにフェッチ
    const period = getDefaultSyncPeriod();
    const dataTypes = connection.sync_data_types ?? [];
    const dataTypesSucceeded: string[] = [];
    const dataTypesFailed: string[] = [];
    let totalRecordsFetched = 0;
    let totalCasesCreated = 0;
    let totalCasesUpdated = 0;
    let totalCandidatesCreated = 0;
    const errors: string[] = [];

    for (const dataType of dataTypes) {
      try {
        const records = await fetchDataByType(
          adapter,
          connection.company_id,
          period,
          dataType
        );

        if (records.length === 0) {
          dataTypesSucceeded.push(dataType);
          continue;
        }

        // hr_data_imports レコード作成
        const { data: rawImportRecord } = await supabase
          .from("hr_data_imports")
          .insert({
            company_id: connection.company_id,
            connection_id: connectionId,
            source_type: connection.adapter_type,
            data_type: dataType,
            record_count: records.length,
            status: "processing",
          } as Database["public"]["Tables"]["hr_data_imports"]["Insert"])
          .select("id")
          .single();

        const importRecord = rawImportRecord as unknown as { id: string } | null;
        if (!importRecord) {
          dataTypesFailed.push(dataType);
          errors.push(`${dataType}: インポートレコード作成失敗`);
          continue;
        }

        // hr_data_records にINSERT
        const dataRecords = records.map((r) => ({
          import_id: importRecord.id,
          company_id: connection.company_id,
          employee_code: r.employeeCode,
          data_type: dataType,
          period_start: r.periodStart,
          period_end: r.periodEnd,
          data: r.data as Json,
        }));

        const { error: insertError } = await supabase
          .from("hr_data_records")
          .insert(dataRecords as unknown as Database["public"]["Tables"]["hr_data_records"]["Insert"][]);

        if (insertError) {
          dataTypesFailed.push(dataType);
          errors.push(`${dataType}: データ保存失敗 - ${insertError.message}`);
          continue;
        }

        // processImportedRecords で閾値判定
        // Cron実行時はユーザーコンテキストがないため、systemユーザーIDを使用
        const result = await processImportedRecords(
          supabase,
          connection.company_id,
          importRecord.id,
          "system",
          dataType
        );

        totalRecordsFetched += records.length;
        totalCasesCreated += result.casesCreated;
        totalCasesUpdated += result.casesUpdated;
        totalCandidatesCreated += result.candidatesCreated;
        dataTypesSucceeded.push(dataType);
      } catch (error) {
        dataTypesFailed.push(dataType);
        errors.push(
          `${dataType}: ${(error as Error).message}`
        );
      }
    }

    // 5. 結果判定
    const status: SyncResult["status"] =
      dataTypesFailed.length === 0
        ? "completed"
        : dataTypesSucceeded.length === 0
          ? "failed"
          : "partial";

    const errorMessage =
      errors.length > 0 ? errors.join("; ") : undefined;

    // 6. 同期ログ更新
    await finalizeSyncLog(supabase, syncLog.id, {
      status,
      recordsFetched: totalRecordsFetched,
      casesCreated: totalCasesCreated,
      casesUpdated: totalCasesUpdated,
      candidatesCreated: totalCandidatesCreated,
      dataTypesSucceeded,
      dataTypesFailed,
      errorMessage,
    });

    // 7. 接続ステータス更新
    await updateConnectionStatus(supabase, connectionId, status);

    // 8. 失敗時アラート作成
    if (status === "failed") {
      await createAlert(
        supabase,
        connectionId,
        connection.company_id,
        syncLog.id,
        "sync_failed",
        `同期に失敗しました: ${errorMessage}`
      );
    } else if (status === "partial") {
      await createAlert(
        supabase,
        connectionId,
        connection.company_id,
        syncLog.id,
        "partial_failure",
        `一部のデータ種別で同期に失敗しました: ${dataTypesFailed.join(", ")}`
      );
    }

    return {
      syncLogId: syncLog.id,
      status,
      recordsFetched: totalRecordsFetched,
      casesCreated: totalCasesCreated,
      casesUpdated: totalCasesUpdated,
      candidatesCreated: totalCandidatesCreated,
      dataTypesSucceeded,
      dataTypesFailed,
      errorMessage,
    };
  } catch (error) {
    const message = (error as Error).message;

    await finalizeSyncLog(supabase, syncLog.id, {
      status: "failed",
      errorMessage: message,
    });

    await updateConnectionStatus(supabase, connectionId, "failed");

    await createAlert(
      supabase,
      connectionId,
      connection.company_id,
      syncLog.id,
      "sync_failed",
      `同期エラー: ${message}`
    );

    return {
      syncLogId: syncLog.id,
      status: "failed",
      recordsFetched: 0,
      casesCreated: 0,
      casesUpdated: 0,
      candidatesCreated: 0,
      dataTypesSucceeded: [],
      dataTypesFailed: connection.sync_data_types ?? [],
      errorMessage: message,
    };
  }
}

// --- ヘルパー関数 ---

interface NormalizedRecord {
  employeeCode: string;
  periodStart: string | null;
  periodEnd: string | null;
  data: Record<string, unknown>;
}

async function fetchDataByType(
  adapter: HrDataAdapter,
  companyId: string,
  period: DateRange,
  dataType: string
): Promise<NormalizedRecord[]> {
  switch (dataType) {
    case "overtime": {
      const records = await adapter.fetchOvertimeData(companyId, period);
      return records.map((r) => ({
        employeeCode: r.employeeCode,
        periodStart: `${r.yearMonth}-01`,
        periodEnd: getLastDayOfMonth(r.yearMonth),
        data: { year_month: r.yearMonth, total_hours: r.totalHours },
      }));
    }
    case "stress_check": {
      const records = await adapter.fetchStressCheckData(companyId, period);
      return records.map((r) => ({
        employeeCode: r.employeeCode,
        periodStart: r.checkDate,
        periodEnd: r.checkDate,
        data: { check_date: r.checkDate, high_stress: r.highStress },
      }));
    }
    case "health_check": {
      const records = await adapter.fetchHealthCheckData(companyId, period);
      return records.map((r) => ({
        employeeCode: r.employeeCode,
        periodStart: r.checkDate,
        periodEnd: r.checkDate,
        data: {
          check_date: r.checkDate,
          employment_decision: r.employmentDecision,
        },
      }));
    }
    case "attendance": {
      const records = await adapter.fetchAttendanceData(companyId, period);
      return records.map((r) => ({
        employeeCode: r.employeeCode,
        periodStart: r.eventDate,
        periodEnd: r.eventDate,
        data: {
          event_date: r.eventDate,
          event_type: r.eventType,
          same_day_confirmed: r.eventType === "pto_absence" ? false : undefined,
          confirmation_source: undefined,
        },
      }));
    }
    default:
      return [];
  }
}

function getDefaultSyncPeriod(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 1);
  return { start, end };
}

function getLastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, "0")}`;
}

async function finalizeSyncLog(
  supabase: ReturnType<typeof createServiceClient>,
  syncLogId: string,
  data: {
    status: string;
    recordsFetched?: number;
    casesCreated?: number;
    casesUpdated?: number;
    candidatesCreated?: number;
    dataTypesSucceeded?: string[];
    dataTypesFailed?: string[];
    errorMessage?: string;
  }
) {
  await supabase
    .from("hr_sync_logs")
    .update({
      status: data.status,
      completed_at: new Date().toISOString(),
      records_fetched: data.recordsFetched ?? 0,
      cases_created: data.casesCreated ?? 0,
      cases_updated: data.casesUpdated ?? 0,
      candidates_created: data.candidatesCreated ?? 0,
      data_types_succeeded: data.dataTypesSucceeded ?? [],
      data_types_failed: data.dataTypesFailed ?? [],
      error_message: data.errorMessage ?? null,
    } as HrSyncLogUpdate)
    .eq("id", syncLogId);
}

async function updateConnectionStatus(
  supabase: ReturnType<typeof createServiceClient>,
  connectionId: string,
  status: string
) {
  await supabase
    .from("hr_connections")
    .update({
      last_synced_at: new Date().toISOString(),
      last_sync_status: status,
      updated_at: new Date().toISOString(),
    } as HrConnectionUpdate)
    .eq("id", connectionId);
}

async function createAlert(
  supabase: ReturnType<typeof createServiceClient>,
  connectionId: string,
  companyId: string,
  syncLogId: string,
  alertType: string,
  message: string
) {
  await supabase.from("hr_sync_alerts").insert({
    connection_id: connectionId,
    company_id: companyId,
    sync_log_id: syncLogId,
    alert_type: alertType,
    message,
  } satisfies HrSyncAlertInsert);
}
