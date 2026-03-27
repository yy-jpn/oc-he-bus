"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { uploadCsvAndProcess } from "@/lib/actions/imports";
import type { Database } from "@/lib/supabase/types";

type ImportRow = Database["public"]["Tables"]["hr_data_imports"]["Row"];

const DATA_TYPES: Record<string, string> = {
  overtime: "時間外労働",
  stress_check: "ストレスチェック",
  health_check: "健診結果",
  attendance: "勤怠",
};

const CSV_TEMPLATES: Record<string, string> = {
  overtime: "employee_code,name,26-Apr,26-Mar\nE001,山田太郎,45,85",
  stress_check: "employee_code,check_date,high_stress\nE001,2026-03-01,true",
  health_check:
    "employee_code,check_date,employment_decision\nE001,2026-03-01,就業制限",
  attendance:
    "employee_code,event_date,event_type\nE001,2026-03-01,tardiness",
};

export function CsvImportForm({ history }: { history: ImportRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dataType, setDataType] = useState("overtime");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    recordCount: number;
    matched: number;
    unmatched: string[];
    casesCreated: number;
    casesUpdated: number;
    candidatesCreated: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    if (!file) {
      setError("CSVファイルを選択してください");
      return;
    }

    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("data_type", dataType);
        formData.set("file", file);
        const res = await uploadCsvAndProcess(formData);
        setResult(res);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "インポートに失敗しました");
      }
    });
  }

  function handleDownloadTemplate() {
    const csv = CSV_TEMPLATES[dataType];
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dataType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>CSVデータ取込</CardTitle>
          <CardDescription>
            HR/労務データのCSVファイルをアップロードして、閾値判定を実行します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>データ種別</Label>
            <Select value={dataType} onValueChange={(v) => setDataType(v ?? "overtime")}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="データ種別を選択">
                  {DATA_TYPES[dataType]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DATA_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>CSVファイル</Label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={handleSubmit}
              disabled={isPending || !file}
            >
              {isPending ? "処理中..." : "インポート実行"}
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              テンプレートDL
            </Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {result && (
            <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
              <CardContent className="pt-4">
                <div className="space-y-1 text-sm">
                  <p>取込レコード数: {result.recordCount}件</p>
                  <p>従業員マッチ: {result.matched}件</p>
                  {result.unmatched.length > 0 && (
                    <p className="text-amber-600">
                      未マッチ: {result.unmatched.join(", ")}
                    </p>
                  )}
                  {result.candidatesCreated > 0 && (
                    <p>承認待ち: {result.candidatesCreated}件</p>
                  )}
                  {result.casesCreated > 0 && (
                    <p>ケース自動作成: {result.casesCreated}件</p>
                  )}
                  {result.casesUpdated > 0 && (
                    <p>ケース更新: {result.casesUpdated}件</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>インポート履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h) => {
                const meta = h.metadata as Record<string, unknown> | null;
                return (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {DATA_TYPES[h.data_type] ?? h.data_type}
                      </span>
                      <span className="ml-2 text-muted-foreground">
                        {h.record_count}件
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(h.imported_at).toLocaleString("ja-JP")}
                      {(meta?.candidates_created as number) > 0 && (
                        <span className="ml-2">
                          承認待ち: {meta?.candidates_created as number}件
                        </span>
                      )}
                      {(meta?.cases_created as number) > 0 && (
                        <span className="ml-2">
                          自動作成: {meta?.cases_created as number}件
                        </span>
                      )}
                      {(meta?.cases_updated as number) > 0 && (
                        <span className="ml-2">
                          更新: {meta?.cases_updated as number}件
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
