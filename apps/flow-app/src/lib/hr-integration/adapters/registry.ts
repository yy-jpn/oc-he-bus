import type { HrDataAdapter } from "./base";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder?: string;
  helpText?: string;
  required: boolean;
}

export interface AdapterDefinition {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  authType: "access_token" | "oauth2";
  supportedDataTypes: string[];
  credentialFields: CredentialField[];
  configFields?: CredentialField[];
  createAdapter: (
    credentials: Record<string, string>,
    config?: Record<string, string>
  ) => HrDataAdapter;
}

const DATA_TYPE_LABELS: Record<string, string> = {
  overtime: "時間外労働",
  stress_check: "ストレスチェック",
  health_check: "健診結果",
  attendance: "勤怠",
};

export function getDataTypeLabel(dataType: string): string {
  return DATA_TYPE_LABELS[dataType] ?? dataType;
}

// --- レジストリ本体 ---

const registry = new Map<string, AdapterDefinition>();

export function registerAdapter(definition: AdapterDefinition): void {
  registry.set(definition.type, definition);
}

export function getAdapterDefinition(
  type: string
): AdapterDefinition | undefined {
  return registry.get(type);
}

export function getAllAdapterDefinitions(): AdapterDefinition[] {
  return Array.from(registry.values());
}

// --- アダプタ登録 ---

// SmartHR: アクセストークン認証、健診+ストレスチェック
registerAdapter({
  type: "smarthr",
  displayName: "SmartHR",
  description:
    "SmartHRから健診結果・ストレスチェックデータを自動取得します。APIアクセストークンが必要です。",
  icon: "🏢",
  authType: "access_token",
  supportedDataTypes: ["health_check", "stress_check"],
  credentialFields: [
    {
      key: "access_token",
      label: "アクセストークン",
      type: "password",
      placeholder: "SmartHRのAPIアクセストークンを入力",
      helpText:
        "SmartHR管理画面 → アプリケーション連携 → APIキー から取得できます",
      required: true,
    },
  ],
  configFields: [
    {
      key: "tenant_id",
      label: "テナントID",
      type: "text",
      placeholder: "例: your-company",
      helpText:
        "SmartHRのURL（https://your-company.smarthr.jp）の「your-company」部分",
      required: true,
    },
  ],
  createAdapter: (credentials, config) => {
    // 遅延importでバンドルサイズ最適化
    const { SmartHrAdapter } = require("./smarthr");
    return new SmartHrAdapter(
      credentials.access_token,
      config?.tenant_id ?? ""
    );
  },
});

// freee人事労務: OAuth2認証、残業+勤怠
registerAdapter({
  type: "freee",
  displayName: "freee人事労務",
  description:
    "freee人事労務から勤怠データ・時間外労働データを自動取得します。OAuth2認証で連携します。",
  icon: "📊",
  authType: "oauth2",
  supportedDataTypes: ["overtime", "attendance"],
  credentialFields: [],
  configFields: [
    {
      key: "company_id",
      label: "事業所ID",
      type: "text",
      placeholder: "freeeの事業所IDを入力",
      helpText:
        "freee人事労務にログイン後、URLに表示される事業所IDを入力してください",
      required: true,
    },
  ],
  createAdapter: (credentials, config) => {
    const { FreeeHrAdapter } = require("./freee");
    return new FreeeHrAdapter(
      credentials.access_token,
      config?.company_id ?? ""
    );
  },
});
