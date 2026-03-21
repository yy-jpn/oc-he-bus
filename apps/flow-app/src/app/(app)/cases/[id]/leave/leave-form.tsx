"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { CONTACT_FREQUENCIES, CONTACT_METHODS } from "@/types/phase";
import { createLeave } from "@/lib/actions/leaves";

export function LeaveForm({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactFrequency, setContactFrequency] = useState("biweekly");
  const [contactMethod, setContactMethod] = useState("email");
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await createLeave(caseId, formData);
      router.push(`/cases/${caseId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">休職情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="start_date">休職開始日</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="diagnosis_received" name="diagnosis_received" />
            <Label htmlFor="diagnosis_received" className="font-normal">
              主治医の診断書を受領済み
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            労働者への情報提供チェックリスト
          </CardTitle>
          <CardDescription>
            休職開始時に労働者に提供すべき情報を確認してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <Checkbox id="info_contact_method" name="info_contact_method" />
            <div>
              <Label htmlFor="info_contact_method" className="font-normal">
                休職中の連絡方法・頻度の取り決め
              </Label>
              <p className="text-xs text-muted-foreground">
                連絡手段（電話・メール等）と頻度を本人と合意してください
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="info_social_insurance" name="info_social_insurance" />
            <div>
              <Label htmlFor="info_social_insurance" className="font-normal">
                傷病手当金等の社会保障制度の案内
              </Label>
              <p className="text-xs text-muted-foreground">
                傷病手当金、自立支援医療制度等について案内してください
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="info_rest_guidance" name="info_rest_guidance" />
            <div>
              <Label htmlFor="info_rest_guidance" className="font-normal">
                休職中の過ごし方に関するガイダンス
              </Label>
              <p className="text-xs text-muted-foreground">
                十分な休養を取ること、通院を継続することなどを伝えてください
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">連絡スケジュール設定</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact_frequency">連絡頻度</Label>
            <Select name="contact_frequency" value={contactFrequency} onValueChange={(v) => setContactFrequency(v ?? "biweekly")}>
              <SelectTrigger id="contact_frequency">
                <SelectValue placeholder="頻度を選択">
                  {CONTACT_FREQUENCIES[contactFrequency as keyof typeof CONTACT_FREQUENCIES]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTACT_FREQUENCIES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_method">連絡方法</Label>
            <Select name="contact_method" value={contactMethod} onValueChange={(v) => setContactMethod(v ?? "email")}>
              <SelectTrigger id="contact_method">
                <SelectValue placeholder="方法を選択">
                  {CONTACT_METHODS[contactMethod as keyof typeof CONTACT_METHODS]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTACT_METHODS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "登録中..." : "休職開始を記録"}
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
  );
}
