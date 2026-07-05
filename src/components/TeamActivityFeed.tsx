"use client";
import { useState, useEffect } from "react";

function formatDistance(distanceM: number | null) {
  if (!distanceM) return null;
  return `${(distanceM / 1609.34).toFixed(1)} mi`;
}

const TYPE_ICON: Record<string, string> = {
  run: "🏃", ride: "🚴", swim: "🏊", strength: "💪", walk: "🚶", other: "⚡",
};

function typeIcon(type: string) {
  return TYPE_ICON[type?.toLowerCase()] ?? "⚡";
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
  const [visibleCount, setVisibleCount] = useState(14);
  const [lightbox, setLightbox] = useState<string | null>(null);

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

  const visible = activities.slice(0, visibleCount);

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
        </div>
      )}
      <div className="space-y-3">
        {visible.map((a: any) => (
          <div key={a.id} className="rounded-2xl border border-border bg-surface px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium truncate">{a.isMe ? "You" : a.userName}</p>
                  <span className="text-xs text-foreground-dim shrink-0">{timeAgo(a.startTime)}</span>
                </div>
                <p className="text-sm capitalize">{typeIcon(a.type)} {a.title || a.type}</p>
                <p className="text-xs text-foreground-dim mt-0.5">
                  {[
                    a.durationSec > 0 ? Math.round(a.durationSec / 60) + " min" : null,
                    formatDistance(a.distanceM),
                    a.raw?.steps ? Number(a.raw.steps).toLocaleString() + " steps" : null,
                  ].filter(Boolean).join(" · ")}
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
            </div>
            {a.photos && a.photos.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {a.photos.map((url: string, i: number) => (
                  <button key={i} onClick={() => setLightbox(url)} className="focus:outline-none">
                    <img
                      src={url}
                      alt=""
                      className="w-16 h-16 object-cover rounded-lg border border-border hover:opacity-90 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {activities.length > visibleCount && (
          <button
            onClick={() => setVisibleCount(c => c + 14)}
            className="w-full py-2 text-sm text-foreground-dim hover:text-foreground border border-border rounded-xl hover:bg-surface transition-colors">
            Load more
          </button>
        )}
      </div>
    </>
  );
}
