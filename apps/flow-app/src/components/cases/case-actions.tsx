"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { deleteCase } from "@/lib/actions/cases";

export function CaseActions({ caseId }: { caseId: string }) {
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

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      {loading ? "削除中..." : "削除"}
    </Button>
  );
}
