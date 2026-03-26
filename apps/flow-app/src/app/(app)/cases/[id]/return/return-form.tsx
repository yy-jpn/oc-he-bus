"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReturn } from "@/lib/actions/returns";

export function ReturnForm({
  caseId,
  leaveId,
  returnType,
  employeeDepartment,
  employeePosition,
}: {
  caseId: string;
  leaveId: string;
  returnType: "full_duty" | "gradual";
  employeeDepartment: string | null;
  employeePosition: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (!confirm("復職を記録しますか？")) return;
    startTransition(async () => {
      await createReturn(caseId, leaveId, returnType, formData);
    });
  }

  return (
    <form action={handleSubmit}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">復職情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="return_date">復職日 *</Label>
            <Input type="date" id="return_date" name="return_date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">復職先部署</Label>
            <Input
              id="department"
              name="department"
              defaultValue={employeeDepartment ?? ""}
              placeholder="部署名"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="position">復職先ポジション</Label>
            <Input
              id="position"
              name="position"
              defaultValue={employeePosition ?? ""}
              placeholder="役職・ポジション"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">メモ</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="復職に関するメモ"
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending
          ? "記録中..."
          : returnType === "full_duty"
            ? "通常勤務で復職を記録する"
            : "段階的復職を記録する"}
      </Button>
    </form>
  );
}
