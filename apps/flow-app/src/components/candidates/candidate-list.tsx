"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { approveCandidate, rejectCandidate } from "@/lib/actions/candidates";
import { TRIGGER_TYPES } from "@/types/phase";
import type { CaseCandidateWithEmployee } from "@/types/case";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  approved: "承認済み",
  rejected: "却下",
  auto_approved: "自動承認",
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  auto_approved: "secondary",
};

export function CandidateList({
  candidates: initialCandidates,
}: {
  candidates: CaseCandidateWithEmployee[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState("pending");
  const [error, setError] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? initialCandidates
      : initialCandidates.filter((c) => c.status === filter);

  function handleApprove(candidate: CaseCandidateWithEmployee) {
    const confirmed = confirm(
      `${candidate.employees?.name ?? "不明"}のケースを作成しますか？\nトリガー: ${candidate.trigger_detail ?? ""}`
    );
    if (!confirmed) return;

    setError(null);
    startTransition(async () => {
      try {
        const caseId = await approveCandidate(candidate.id);
        router.push(`/cases/${caseId}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "承認に失敗しました");
      }
    });
  }

  function handleReject(id: string) {
    if (!confirm("この候補を却下しますか？")) return;

    setError(null);
    startTransition(async () => {
      try {
        await rejectCandidate(id);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "却下に失敗しました");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "pending")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="ステータス">
              {filter === "all" ? "すべて" : STATUS_LABELS[filter]}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            <SelectItem value="pending">承認待ち</SelectItem>
            <SelectItem value="approved">承認済み</SelectItem>
            <SelectItem value="rejected">却下</SelectItem>
            <SelectItem value="auto_approved">自動承認</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          該当する候補はありません
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>従業員</TableHead>
              <TableHead>部署</TableHead>
              <TableHead>トリガー種別</TableHead>
              <TableHead>詳細</TableHead>
              <TableHead>検知日時</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((candidate) => (
              <TableRow key={candidate.id}>
                <TableCell className="font-medium">
                  {candidate.employees?.name ?? "不明"}
                </TableCell>
                <TableCell>
                  {candidate.employees?.department ?? "-"}
                </TableCell>
                <TableCell>
                  {TRIGGER_TYPES[candidate.trigger_type as keyof typeof TRIGGER_TYPES] ??
                    candidate.trigger_type}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {candidate.trigger_detail ?? "-"}
                </TableCell>
                <TableCell>
                  {format(new Date(candidate.detected_at), "M/d HH:mm", {
                    locale: ja,
                  })}
                </TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[candidate.status] ?? "outline"}>
                    {STATUS_LABELS[candidate.status] ?? candidate.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {candidate.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(candidate)}
                        disabled={isPending}
                      >
                        {isPending ? "処理中..." : "承認"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(candidate.id)}
                        disabled={isPending}
                      >
                        却下
                      </Button>
                    </div>
                  )}
                  {candidate.status === "approved" &&
                    candidate.created_case_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(`/cases/${candidate.created_case_id}`)
                        }
                      >
                        ケース表示
                      </Button>
                    )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
