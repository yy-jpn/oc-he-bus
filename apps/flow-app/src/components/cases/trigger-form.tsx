"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TRIGGER_TYPES } from "@/types/phase";
import { createCase } from "@/lib/actions/cases";

type Employee = { id: string; name: string; department: string | null; employee_code: string | null };
type Mode = "existing" | "new";

function getEmployeeLabel(employees: Employee[], id: string): string {
  const emp = employees.find((e) => e.id === id);
  if (!emp) return "";
  const code = emp.employee_code ? `[${emp.employee_code}] ` : "";
  return code + emp.name + (emp.department ? ` (${emp.department})` : "");
}

export function TriggerForm({ employees }: { employees: Employee[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("existing");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [employeeCode, setEmployeeCode] = useState<string>("");
  const [triggerType, setTriggerType] = useState<string>("");
  const router = useRouter();

  function handleEmployeeChange(id: string) {
    setEmployeeId(id);
    const emp = employees.find((e) => e.id === id);
    setEmployeeCode(emp?.employee_code ?? "");
  }

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      const caseId = await createCase(formData);
      router.push(`/cases/${caseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新規ケース作成</CardTitle>
        <CardDescription>
          予兆トリガーを登録してケースを作成します
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="mode" value={mode} />

          <div className="space-y-2">
            <Label>対象従業員</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
              >
                既存から選択
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
              >
                新規入力
              </Button>
            </div>
          </div>

          {mode === "existing" ? (
            <div className="space-y-2">
              <Select name="employee_id" value={employeeId} onValueChange={(v) => handleEmployeeChange(v ?? "")}>
                <SelectTrigger id="employee_id">
                  <SelectValue placeholder="従業員を選択">
                    {employeeId ? getEmployeeLabel(employees, employeeId) : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.employee_code ? `[${emp.employee_code}] ` : ""}
                      {emp.name}
                      {emp.department ? ` (${emp.department})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="employee_name">氏名</Label>
                <Input
                  id="employee_name"
                  name="employee_name"
                  placeholder="例: 山田 太郎"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="employee_department">部署（任意）</Label>
                <Input
                  id="employee_department"
                  name="employee_department"
                  placeholder="例: 営業部"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="employee_code">社員番号</Label>
            <Input
              id="employee_code"
              name="employee_code"
              placeholder="例: E001"
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger_type">トリガー種別</Label>
            <Select name="trigger_type" value={triggerType} onValueChange={(v) => setTriggerType(v ?? "")}>
              <SelectTrigger id="trigger_type">
                <SelectValue placeholder="種別を選択">
                  {triggerType ? TRIGGER_TYPES[triggerType as keyof typeof TRIGGER_TYPES] : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trigger_detail">詳細</Label>
            <Textarea
              id="trigger_detail"
              name="trigger_detail"
              placeholder="トリガーの詳細を入力してください"
              rows={3}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={loading}>
              {loading ? "作成中..." : "ケースを作成"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              キャンセル
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
