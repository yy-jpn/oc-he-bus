import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PhaseBadge } from "@/components/cases/phase-badge";
import { getNextActions } from "@/lib/utils/next-action";
import type { CaseWithEmployee } from "@/types/case";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function CaseTable({ cases }: { cases: CaseWithEmployee[] }) {
  if (cases.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        ケースはまだありません。「新規ケース作成」から始めてください。
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>名前</TableHead>
          <TableHead>部署</TableHead>
          <TableHead>ステータス</TableHead>
          <TableHead>経過日数</TableHead>
          <TableHead>次のアクション</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map((c) => {
          const actions = getNextActions(c);
          const nextAction = actions[0];
          return (
            <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <Link
                  href={`/cases/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.employees?.name ?? "不明"}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/cases/${c.id}`} className="block text-muted-foreground">
                  {c.employees?.department ?? "-"}
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/cases/${c.id}`} className="block">
                  <PhaseBadge phase={c.current_phase} />
                </Link>
              </TableCell>
              <TableCell>
                <Link href={`/cases/${c.id}`} className="block text-muted-foreground">
                  {daysSince(c.created_at)}日
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {nextAction ? (
                  <Link href={nextAction.href} className="hover:underline">
                    {nextAction.title}
                  </Link>
                ) : (
                  <Link href={`/cases/${c.id}`} className="block">-</Link>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
