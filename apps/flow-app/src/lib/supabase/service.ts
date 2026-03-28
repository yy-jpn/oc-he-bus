import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * service-roleキーを使用するSupabaseクライアント。
 * RLSをバイパスするため、Cronジョブや同期処理など
 * ユーザーコンテキストがない場面で使用する。
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set"
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}
