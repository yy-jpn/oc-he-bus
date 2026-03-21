import type { CaseEvent } from "@/types/case";

export function CaseTimeline({ events }: { events: CaseEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
  );

  if (sorted.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        イベントはまだありません。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {sorted.map((event) => (
        <div key={event.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5" />
            <div className="w-px flex-1 bg-border" />
          </div>
          <div className="pb-4">
            <time className="text-xs text-muted-foreground">
              {new Date(event.event_date).toLocaleDateString("ja-JP")}
            </time>
            <p className="text-sm">{event.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
