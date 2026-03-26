"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCase, updateCasePhase } from "@/lib/actions/cases";

export function CaseActions({
  caseId,
  currentPhase,
}: {
  caseId: string;
  currentPhase: string;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("このケースを完全に削除しますか？この操作は取り消せません。")) return;
    setLoading(true);
    try {
      await deleteCase(caseId);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  async function handleFollowUpComplete() {
    if (!confirm("このケースのフォローを終了しますか？一覧から非表示になりますが、履歴は保持されます。")) return;
    setLoading(true);
    try {
      await updateCasePhase(caseId, "follow_up_completed", "フォロー終了");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {currentPhase === "phase0_monitoring" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleFollowUpComplete}
          disabled={loading}
        >
          {loading ? "処理中..." : "フォロー終了"}
        </Button>
      )}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? "削除中..." : "削除"}
      </Button>
    </div>
  );
}
