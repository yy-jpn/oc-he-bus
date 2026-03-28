"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  createConnection,
  updateConnection,
  testConnection,
} from "@/lib/actions/connections";
import { getDataTypeLabel } from "@/lib/hr-integration/adapters/registry";

// --- 型定義 ---

interface AdapterDef {
  type: string;
  displayName: string;
  description: string;
  icon: string;
  authType: string;
  supportedDataTypes: string[];
  credentialFields: {
    key: string;
    label: string;
    type: string;
    placeholder?: string;
    helpText?: string;
    required: boolean;
  }[];
  configFields: {
    key: string;
    label: string;
    type: string;
    placeholder?: string;
    helpText?: string;
    required: boolean;
  }[];
}

interface ExistingConnection {
  id: string;
  adapterType: string;
  displayName: string;
  syncDataTypes: string[];
  schedule: string;
  scheduleTime: string | null;
  scheduleDayOfWeek: number | null;
  isActive: boolean;
  config: Record<string, string>;
}

interface ConnectionFormProps {
  adapters: AdapterDef[];
  existingConnection?: ExistingConnection;
}

// --- ステッパーヘッダー ---

const STEPS = [
  { number: 1, title: "サービス選択" },
  { number: 2, title: "認証情報" },
  { number: 3, title: "データ種別" },
  { number: 4, title: "テスト & 保存" },
];

function StepIndicator({
  steps,
  currentStep,
}: {
  steps: typeof STEPS;
  currentStep: number;
}) {
  return (
    <nav className="mb-8">
      <ol className="flex items-center gap-2">
        {steps.map((step, index) => {
          const isActive = step.number === currentStep;
          const isCompleted = step.number < currentStep;
          return (
            <li key={step.number} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? "✓" : step.number}
              </div>
              <span
                className={`text-sm font-medium ${
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-px w-8 ${
                    isCompleted ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// --- メインフォーム ---

export function ConnectionForm({
  adapters,
  existingConnection,
}: ConnectionFormProps) {
  const router = useRouter();
  const isEdit = !!existingConnection;
  const [isPending, startTransition] = useTransition();

  // フォーム状態
  const [currentStep, setCurrentStep] = useState(isEdit ? 4 : 1);
  const [selectedAdapter, setSelectedAdapter] = useState<string>(
    existingConnection?.adapterType ?? ""
  );
  const [displayName, setDisplayName] = useState(
    existingConnection?.displayName ?? ""
  );
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, string>>(
    existingConnection?.config ?? {}
  );
  const [syncDataTypes, setSyncDataTypes] = useState<string[]>(
    existingConnection?.syncDataTypes ?? []
  );
  const [schedule, setSchedule] = useState(
    existingConnection?.schedule ?? "manual"
  );
  const [scheduleTime, setScheduleTime] = useState(
    existingConnection?.scheduleTime?.substring(0, 5) ?? "03:00"
  );
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<number>(
    existingConnection?.scheduleDayOfWeek ?? 1
  );

  // テスト・保存結果
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const adapter = adapters.find((a) => a.type === selectedAdapter);

  // Step 1: サービス選択
  function handleSelectAdapter(type: string) {
    setSelectedAdapter(type);
    const adpt = adapters.find((a) => a.type === type);
    if (adpt) {
      setDisplayName(adpt.displayName);
      setSyncDataTypes(adpt.supportedDataTypes);
    }
  }

  // Step 2: 認証フィールド値変更
  function handleCredentialChange(key: string, value: string) {
    setCredentials((prev) => ({ ...prev, [key]: value }));
  }

  function handleConfigChange(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  // Step 3: データ種別トグル
  function handleDataTypeToggle(dataType: string) {
    setSyncDataTypes((prev) =>
      prev.includes(dataType)
        ? prev.filter((dt) => dt !== dataType)
        : [...prev, dataType]
    );
  }

  // Step 4: テスト接続
  function handleTestConnection() {
    setTestResult(null);
    startTransition(async () => {
      try {
        const result = await testConnection({
          adapterType: selectedAdapter,
          credentials,
          config,
        });
        setTestResult(result);
      } catch (e) {
        setTestResult({
          success: false,
          message: (e as Error).message,
        });
      }
    });
  }

  // 保存
  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        if (isEdit && existingConnection) {
          await updateConnection(existingConnection.id, {
            displayName,
            credentials:
              Object.keys(credentials).length > 0 ? credentials : undefined,
            config,
            syncDataTypes,
            schedule,
            scheduleTime,
            scheduleDayOfWeek: schedule === "weekly" ? scheduleDayOfWeek : null,
            isActive: existingConnection.isActive,
          });
        } else {
          await createConnection({
            adapterType: selectedAdapter,
            displayName,
            credentials,
            config,
            syncDataTypes,
            schedule,
            scheduleTime,
            scheduleDayOfWeek: schedule === "weekly" ? scheduleDayOfWeek : undefined,
          });
        }
        setSaved(true);
        router.push("/settings/connections");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  // バリデーション
  function canGoNext(): boolean {
    switch (currentStep) {
      case 1:
        return selectedAdapter !== "";
      case 2: {
        if (!adapter) return false;
        // 必須の認証フィールドが入力済み
        const credOk = adapter.credentialFields
          .filter((f) => f.required)
          .every((f) => credentials[f.key]?.trim());
        // 必須のconfigフィールドが入力済み
        const configOk = adapter.configFields
          .filter((f) => f.required)
          .every((f) => config[f.key]?.trim());
        // OAuth2の場合はcredential不要
        if (adapter.authType === "oauth2") return configOk;
        return credOk && configOk;
      }
      case 3:
        return syncDataTypes.length > 0;
      default:
        return true;
    }
  }

  return (
    <div>
      {!isEdit && (
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      )}

      {/* Step 1: サービス選択 */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>連携するサービスを選択</CardTitle>
            <CardDescription>
              データを取り込む外部HRサービスを選んでください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              {adapters.map((adpt) => (
                <button
                  key={adpt.type}
                  type="button"
                  onClick={() => handleSelectAdapter(adpt.type)}
                  className={`flex flex-col items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                    selectedAdapter === adpt.type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{adpt.icon}</span>
                    <div>
                      <div className="font-semibold">{adpt.displayName}</div>
                      <div className="text-sm text-muted-foreground">
                        {adpt.authType === "oauth2"
                          ? "OAuth2認証"
                          : "APIキー認証"}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {adpt.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {adpt.supportedDataTypes.map((dt) => (
                      <span
                        key={dt}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
                      >
                        {getDataTypeLabel(dt)}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!canGoNext()}
              >
                次へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 認証情報 */}
      {currentStep === 2 && adapter && (
        <Card>
          <CardHeader>
            <CardTitle>
              {adapter.icon} {adapter.displayName} の認証情報
            </CardTitle>
            <CardDescription>
              {adapter.authType === "oauth2"
                ? "OAuth2で認証します。まず設定情報を入力してください。"
                : "APIアクセストークンを入力してください。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 表示名 */}
            <div className="space-y-2">
              <Label htmlFor="displayName">接続名</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="例: 本番SmartHR連携"
              />
              <p className="text-xs text-muted-foreground">
                この接続を識別するための名前です
              </p>
            </div>

            {/* Config フィールド（tenant_id等） */}
            {adapter.configFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={`config-${field.key}`}>{field.label}</Label>
                <Input
                  id={`config-${field.key}`}
                  type={field.type === "password" ? "password" : "text"}
                  value={config[field.key] ?? ""}
                  onChange={(e) =>
                    handleConfigChange(field.key, e.target.value)
                  }
                  placeholder={field.placeholder}
                />
                {field.helpText && (
                  <p className="text-xs text-muted-foreground">
                    {field.helpText}
                  </p>
                )}
              </div>
            ))}

            {/* 認証フィールド */}
            {selectedAdapter === "freee" && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  ℹ freee人事労務からは時間外労働データと勤怠データを取得できます。
                  健康診断の就業判定結果・ストレスチェック結果はfreeeでは管理されていないため、
                  SmartHR連携またはCSVインポートをご利用ください。
                </p>
              </div>
            )}

            {adapter.authType === "oauth2" ? (
              <div className="rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  OAuth2認証は接続保存後に「認証を開始」ボタンから行います。
                </p>
              </div>
            ) : (
              adapter.credentialFields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`cred-${field.key}`}>
                    {field.label}
                    {field.required && (
                      <span className="text-destructive"> *</span>
                    )}
                  </Label>
                  <Input
                    id={`cred-${field.key}`}
                    type={field.type === "password" ? "password" : "text"}
                    value={credentials[field.key] ?? ""}
                    onChange={(e) =>
                      handleCredentialChange(field.key, e.target.value)
                    }
                    placeholder={
                      isEdit
                        ? "変更する場合のみ入力"
                        : field.placeholder
                    }
                  />
                  {field.helpText && (
                    <p className="text-xs text-muted-foreground">
                      {field.helpText}
                    </p>
                  )}
                </div>
              ))
            )}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                戻る
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canGoNext()}
              >
                次へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: データ種別選択 */}
      {currentStep === 3 && adapter && (
        <Card>
          <CardHeader>
            <CardTitle>取り込むデータを選択</CardTitle>
            <CardDescription>
              {adapter.displayName}
              から取得するデータの種類を選んでください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {adapter.supportedDataTypes.map((dt) => {
              const descriptions: Record<string, string> = {
                health_check:
                  "健康診断結果（就業判定）を取得し、異常があれば自動でケース候補を作成します",
                stress_check:
                  "ストレスチェック結果を取得し、高ストレス者を自動で検知します",
                overtime:
                  "時間外労働時間を取得し、閾値超過者を自動で検知します",
                attendance:
                  "勤怠データ（遅刻・早退・欠勤等）を取得し、異常パターンを検知します",
              };

              return (
                <label
                  key={dt}
                  className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-colors ${
                    syncDataTypes.includes(dt)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={syncDataTypes.includes(dt)}
                    onCheckedChange={() => handleDataTypeToggle(dt)}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium">{getDataTypeLabel(dt)}</div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {descriptions[dt] ?? ""}
                    </p>
                  </div>
                </label>
              );
            })}

            <div className="flex justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
              >
                戻る
              </Button>
              <Button
                onClick={() => setCurrentStep(4)}
                disabled={!canGoNext()}
              >
                次へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: スケジュール + テスト + 保存 */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>
              {isEdit ? "設定を更新" : "接続テスト & 保存"}
            </CardTitle>
            <CardDescription>
              {isEdit
                ? "設定を変更して保存します"
                : "スケジュールを設定し、接続テストを実行してから保存します"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* スケジュール設定 */}
            <div className="space-y-4">
              <h3 className="font-medium">同期スケジュール</h3>
              <div className="space-y-2">
                <Label>実行頻度</Label>
                <Select
                  value={schedule}
                  onValueChange={(v) => setSchedule(v ?? "manual")}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue>
                      {schedule === "manual"
                        ? "手動のみ"
                        : schedule === "daily"
                          ? "毎日自動実行"
                          : "毎週自動実行"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手動のみ</SelectItem>
                    <SelectItem value="daily">毎日自動実行</SelectItem>
                    <SelectItem value="weekly">毎週自動実行</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {schedule !== "manual" && (
                <div className="flex gap-4">
                  <div className="space-y-2">
                    <Label>実行時刻</Label>
                    <Input
                      type="time"
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="w-32"
                    />
                  </div>

                  {schedule === "weekly" && (
                    <div className="space-y-2">
                      <Label>曜日</Label>
                      <Select
                        value={String(scheduleDayOfWeek)}
                        onValueChange={(v) =>
                          setScheduleDayOfWeek(parseInt(v ?? "1", 10))
                        }
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue>
                            {
                              ["日", "月", "火", "水", "木", "金", "土"][
                                scheduleDayOfWeek
                              ]
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {["日", "月", "火", "水", "木", "金", "土"].map(
                            (day, i) => (
                              <SelectItem key={i} value={String(i)}>
                                {day}曜日
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 編集モードの場合、表示名・データ種別も変更可能 */}
            {isEdit && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>接続名</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* テスト接続 */}
            {!isEdit && (
              <div className="space-y-3">
                <h3 className="font-medium">接続テスト</h3>
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isPending}
                >
                  {isPending ? "テスト中..." : "テスト接続を実行"}
                </Button>

                {testResult && (
                  <div
                    className={`rounded-md border px-4 py-3 text-sm ${
                      testResult.success
                        ? "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/20 dark:text-green-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-400"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{testResult.success ? "✓" : "✗"}</span>
                      <span>{testResult.message}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {/* 操作ボタン */}
            <div className="flex justify-between pt-2">
              {!isEdit ? (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                >
                  戻る
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => router.push("/settings/connections")}
                >
                  キャンセル
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={isPending || saved}
              >
                {isPending
                  ? "保存中..."
                  : saved
                    ? "保存しました"
                    : isEdit
                      ? "更新する"
                      : "保存する"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
