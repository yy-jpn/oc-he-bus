"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { completeContact, transitionToPreparation, type ContactReminder } from "@/lib/actions/contacts";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle, Clock, Phone, ArrowRight } from "lucide-react";

export function ContactManagement({
  caseId,
  leaveId,
  reminders,
  contactMethod,
  contactFrequency,
}: {
  caseId: string;
  leaveId: string;
  reminders: ContactReminder[];
  contactMethod: string;
  contactFrequency: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const pending = reminders.filter((r) => !r.completed);
  const completed = reminders.filter((r) => r.completed);

  const methodLabel: Record<string, string> = {
    phone: "電話",
    email: "メール",
    in_person: "対面",
  };
  const frequencyLabel: Record<string, string> = {
    weekly: "毎週",
    biweekly: "隔週",
    monthly: "毎月",
  };

  function handleComplete(reminderId: string, formData: FormData) {
    startTransition(async () => {
      await completeContact(reminderId, caseId, leaveId, formData);
      setCompletingId(null);
    });
  }

  function handleTransition() {
    if (!confirm("主治医から「復職可能」の意見があったことを記録し、復職準備フェーズへ移行しますか？")) return;
    startTransition(async () => {
      await transitionToPreparation(caseId);
    });
  }

  return (
    <div className="space-y-6">
      {/* 連絡設定の概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">連絡設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">連絡方法: </span>
              <span className="font-medium">{methodLabel[contactMethod] ?? contactMethod}</span>
            </div>
            <div>
              <span className="text-muted-foreground">頻度: </span>
              <span className="font-medium">{frequencyLabel[contactFrequency] ?? contactFrequency}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 未完了リマインダー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4" />
            予定されている連絡 ({pending.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">予定されている連絡はありません</p>
          ) : (
            <div className="space-y-3">
              {pending.map((reminder) => {
                const isOverdue = new Date(reminder.scheduled_date) < new Date();
                return (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Phone className="size-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(reminder.scheduled_date), "yyyy年M月d日(E)", { locale: ja })}
                        </p>
                        {isOverdue && (
                          <Badge variant="destructive" className="mt-1">期限超過</Badge>
                        )}
                      </div>
                    </div>
                    <Dialog open={completingId === reminder.id} onOpenChange={(open) => setCompletingId(open ? reminder.id : null)}>
                      <DialogTrigger render={<Button size="sm" variant="outline" />}>
                        完了にする
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>連絡完了の記録</DialogTitle>
                        </DialogHeader>
                        <form action={(formData) => handleComplete(reminder.id, formData)}>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">メモ（任意）</label>
                              <Textarea
                                name="notes"
                                placeholder="連絡内容や本人の状況など"
                                className="mt-1"
                              />
                            </div>
                            <Button type="submit" disabled={isPending} className="w-full">
                              {isPending ? "記録中..." : "完了を記録する"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 完了済みリマインダー */}
      {completed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="size-4" />
              完了した連絡 ({completed.length}件)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completed.map((reminder) => (
                <div
                  key={reminder.id}
                  className="rounded-lg border border-dashed p-3 opacity-70"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="size-4 text-green-600" />
                    <p className="text-sm">
                      {format(new Date(reminder.scheduled_date), "yyyy年M月d日", { locale: ja })}
                    </p>
                    {reminder.completed_at && (
                      <span className="text-xs text-muted-foreground">
                        (実施: {format(new Date(reminder.completed_at), "M/d")})
                      </span>
                    )}
                  </div>
                  {reminder.notes && (
                    <p className="mt-1 text-sm text-muted-foreground">{reminder.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Phase 2 → 3 遷移 */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRight className="size-4" />
            復職準備への移行
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            主治医から「復職可能」の意見が出された場合、復職準備フェーズへ移行します。
          </p>
          <Button onClick={handleTransition} disabled={isPending}>
            {isPending ? "移行中..." : "主治医「復職可能」→ 復職準備へ"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
