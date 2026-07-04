"use client";
import { useState, useEffect } from "react";

function formatDistance(distanceM: number | null) {
  if (!distanceM) return null;
  return `${(distanceM / 1609.34).toFixed(1)} mi`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d >= 1) return `${d}d ago`;
  if (h >= 1) return `${h}h ago`;
  return "Just now";
}

export function TeamActivityFeed({ teamId }: { teamId: string }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [highFiving, setHighFiving] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/teams/${teamId}/activity`)
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [teamId]);

  async function toggleHighFive(activityId: string, iHighFived: boolean) {
    if (highFiving.has(activityId)) return;
    setHighFiving(prev => new Set(prev).add(activityId));
    const method = iHighFived ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/activities/${activityId}/kudos`, { method });
      const data = await res.json();
      if (res.ok) {
        setActivities(prev => prev.map(a =>
          a.id === activityId ? { ...a, highFiveCount: data.count, iHighFived: !iHighFived } : a
        ));
      }
    } finally {
      setHighFiving(prev => { const next = new Set(prev); next.delete(activityId); return next; });
    }
  }

  if (!loaded) return <p className="text-sm text-foreground-dim py-4">Loading...</p>;
  if (activities.length === 0) return <p className="text-sm text-foreground-dim py-4">Be the first to log a workout today! Your team is watching 💪</p>;

  return (
    <div className="space-y-3">
      {activities.map((a: any) => (
        <div key={a.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-sm font-medium truncate">{a.isMe ? "You" : a.userName}</p>
                <span className="text-xs text-foreground-dim shrink-0">{timeAgo(a.startTime)}</span>
              </div>
              <p className="text-sm capitalize">{a.title || a.type}</p>
              <p className="text-xs text-foreground-dim mt-0.5">
                {a.durationSec > 0 ? Math.round(a.durationSec / 60) + " min" : ""}
                {formatDistance(a.distanceM) ? (a.durationSec > 0 ? " · " : "") + formatDistance(a.distanceM) : ""}
              </p>
            </div>
            {!a.isMe && (
              <button
                onClick={() => toggleHighFive(a.id, a.iHighFived)}
                disabled={highFiving.has(a.id)}
                className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 " +
                  (a.iHighFived
                    ? "bg-signal/15 border-signal/40 text-signal"
                    : "border-border bg-surface hover:bg-surface-raised text-foreground-dim")}
              >
                <span>🙌</span>
                <span>{a.highFiveCount > 0 ? a.highFiveCount : ""} {a.iHighFived ? "High Five!" : "High Five"}</span>
              </button>
            )}
            {a.isMe && a.highFiveCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-signal/30 bg-signal/10 text-signal shrink-0">
                <span>🙌</span>
                <span>{a.highFiveCount}</span>
              </div>
            )}
            {a.isMe && a.highFiveCount === 0 && (
              <span className="text-xs text-foreground-dim shrink-0">No high fives yet</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
