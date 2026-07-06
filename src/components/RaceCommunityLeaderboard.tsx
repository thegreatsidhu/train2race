"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function RaceCommunityLeaderboard({
  majorRaceId,
  raceName,
  raceDate,
}: {
  majorRaceId: string | null;
  raceName?: string;
  raceDate?: string;
}) {
  const [entries, setEntries]   = useState<any[]>([]);
  const [count, setCount]       = useState(0);
  const [loaded, setLoaded]     = useState(false);

  useEffect(() => {
    if (!majorRaceId) { setLoaded(true); return; }
    fetch(`/api/major-races/${majorRaceId}/leaderboard`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setCount(d.count || 0); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [majorRaceId]);

  if (!loaded || entries.length === 0 || !majorRaceId) return null;

  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-0.5">Race community</p>
          <h2 className="font-semibold">{raceName}</h2>
          <p className="text-xs text-foreground-dim mt-0.5">
            {count} athletes registered
            {raceDate && " · " + new Date(raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <div className="divide-y divide-border/40">
          {entries.map((athlete: any, i: number) => (
            <div key={athlete.userId} className={"flex items-center gap-3 px-5 py-3 " + (athlete.isMe ? "bg-signal/5" : "")}>
              <span className={"text-xs font-data w-5 shrink-0 tabular-nums " + (i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600/80" : "text-foreground-dim")}>
                {i + 1}
              </span>
              <span className={"text-sm flex-1 min-w-0 truncate " + (athlete.isMe ? "font-semibold text-signal" : "")}>
                {athlete.isMe ? "You" : athlete.name}
              </span>
              {athlete.hasPlan ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-1.5 bg-border rounded-full hidden sm:block">
                    <div className="h-1.5 rounded-full bg-signal" style={{ width: athlete.pct + "%" }} />
                  </div>
                  <span className="text-xs text-foreground-dim w-8 text-right tabular-nums">{athlete.pct}%</span>
                </div>
              ) : (
                <span className="text-xs text-foreground-dim/50 shrink-0">–</span>
              )}
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-border">
          <Link href={`/dashboard/community?race=${majorRaceId}`} className="text-xs text-signal hover:underline">
            View full community →
          </Link>
        </div>
      </div>
    </section>
  );
}
