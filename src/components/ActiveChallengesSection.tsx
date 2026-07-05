"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function ActiveChallengesSection() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/me/active-challenges")
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  const visible = challenges.filter((c: any) => c.type?.toLowerCase() !== "steps");

  if (!loaded || visible.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <details open className="mb-6 group">
      <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
        <h2 className="text-sm font-medium text-foreground-dim select-none">Active challenges ({visible.length})</h2>
        <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
      </summary>
      <div className="pt-1 space-y-3">
        {visible.map((c: any) => {
          const myTotal  = c.entries.reduce((s: number, e: any) => s + e.value, 0);
          const cpct     = c.goal ? Math.min(100, Math.round((myTotal / c.goal) * 100)) : null;
          const daysLeft = Math.ceil((new Date(c.endDate).getTime() - today.getTime()) / 86400000);
          return (
            <Link key={c.id} href={`/dashboard/teams/${c.team.id}?tab=challenges&challenge=${c.id}`}
              className="block rounded-2xl border border-border bg-surface px-4 py-3 hover:bg-surface-raised transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.team.name} · {c.type} · {c.unit}</p>
                </div>
                <span className="text-xs text-foreground-dim shrink-0 ml-3">{daysLeft}d left</span>
              </div>
              {cpct !== null ? (
                <div>
                  <div className="flex justify-between text-xs text-foreground-dim mb-1">
                    <span>{myTotal} / {c.goal} {c.unit}</span>
                    <span>{cpct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-border rounded-full">
                    <div className="h-1.5 rounded-full bg-signal transition-all" style={{ width: `${cpct}%` }} />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-foreground-dim">{myTotal} {c.unit} logged</p>
              )}
            </Link>
          );
        })}
      </div>
    </details>
  );
}
