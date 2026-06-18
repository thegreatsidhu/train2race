"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Activity {
  id: string;
  title: string | null;
  type: string;
  startTime: Date;
  durationSec: number;
  distanceM: number | null;
  source: string;
}

export function ActivityList({ activities }: { activities: Activity[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this workout?")) return;
    setDeleting(id);
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  if (activities.length === 0) {
    return <p className="text-sm text-foreground-dim">No activities synced yet.</p>;
  }

  return (
    <div className="space-y-2">
      {activities.map((a) => (
        <div key={a.id}
          className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
          <div>
            <p className="text-sm font-medium capitalize">{a.title ?? a.type}</p>
            <p className="text-xs text-foreground-dim">
              {new Date(a.startTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {a.source.toLowerCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-data text-sm text-foreground-dim">
              {Math.round(a.durationSec / 60)} min
              {a.distanceM ? ` · ${(a.distanceM / 1000).toFixed(1)} km` : ""}
            </span>
            <button
              onClick={() => handleDelete(a.id)}
              disabled={deleting === a.id}
              className="text-xs text-foreground-dim hover:text-alert transition-colors disabled:opacity-40"
              title="Delete workout"
            >
              {deleting === a.id ? "…" : "✕"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}