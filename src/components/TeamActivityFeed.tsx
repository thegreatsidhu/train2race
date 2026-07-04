"use client";
import { useState, useEffect } from "react";

function formatDistance(distanceM: number | null, type: string) {
  if (!distanceM) return null;
  if (type === "swim") return distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${Math.round(distanceM)} m`;
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
  const [kudoing, setKudoing] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/teams/${teamId}/activity`)
      .then(r => r.json())
      .then(d => { setActivities(d.activities || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [teamId]);

  async function toggleKudo(activityId: string, iKudoed: boolean) {
    if (kudoing.has(activityId)) return;
    setKudoing(prev => new Set(prev).add(activityId));
    const method = iKudoed ? "DELETE" : "POST";
    try {
      const res = await fetch(`/api/activities/${activityId}/kudos`, { method });
      const data = await res.json();
      if (res.ok) {
        setActivities(prev => prev.map(a =>
          a.id === activityId ? { ...a, kudoCount: data.count, iKudoed: !iKudoed } : a
        ));
      }
    } finally {
      setKudoing(prev => { const next = new Set(prev); next.delete(activityId); return next; });
    }
  }

  if (!loaded) return <p className="text-sm text-foreground-dim py-4">Loading...</p>;
  if (activities.length === 0) return <p className="text-sm text-foreground-dim py-4">No activity in the last 7 days.</p>;

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
                {formatDistance(a.distanceM, a.type) ? (a.durationSec > 0 ? " · " : "") + formatDistance(a.distanceM, a.type) : ""}
              </p>
            </div>
            {!a.isMe && (
              <button
                onClick={() => toggleKudo(a.id, a.iKudoed)}
                disabled={kudoing.has(a.id)}
                className={"flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 " +
                  (a.iKudoed
                    ? "bg-signal/15 border-signal/40 text-signal"
                    : "border-border bg-surface hover:bg-surface-raised text-foreground-dim")}
              >
                <span>👋</span>
                <span>{a.kudoCount > 0 ? a.kudoCount : ""} {a.iKudoed ? "Kudos!" : "Kudos"}</span>
              </button>
            )}
            {a.isMe && a.kudoCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border border-signal/30 bg-signal/10 text-signal shrink-0">
                <span>👋</span>
                <span>{a.kudoCount}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
