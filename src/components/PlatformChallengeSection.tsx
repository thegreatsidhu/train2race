"use client";
import { useState, useEffect } from "react";

const TYPE_LABELS: Record<string, string> = {
  most_workouts: "Most Workouts",
  most_miles: "Most Miles",
  most_active_days: "Most Active Days",
  most_steps: "Most Steps",
};

const FILTER_LABELS: Record<string, string> = {
  run: "Running only",
  walk: "Walking only",
  swim: "Swimming only",
  ride: "Cycling only",
  strength: "Strength only",
};

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

interface Challenge {
  id: string;
  title: string;
  description?: string;
  type: string;
  activityFilter?: string;
  badgeName?: string;
  startDate: string;
  endDate: string;
  status: string;
  participantCount: number;
  isJoined: boolean;
  dailyAwards?: { date: string; awards: { rank: number; userId: string; name: string; stat: string; text: string }[] } | null;
  finalAnnouncement?: { intro: string; top5: { rank: number; userId: string; name: string; stat: string; tribute: string }[] } | null;
  finalAnnouncedAt?: string | null;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  stat: string;
  isMe: boolean;
  dateOfBirth?: string | null;
}

function ageGroup(dob: string | null): string {
  if (!dob) return "Unknown";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600000));
  if (age < 30) return "Under 30";
  if (age < 40) return "30–39";
  if (age < 50) return "40–49";
  if (age < 60) return "50–59";
  return "60+";
}

function Leaderboard({ challengeId, onClose }: { challengeId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ageFilter, setAgeFilter] = useState("All");

  useEffect(() => {
    fetch(`/api/platform-challenges/${challengeId}/leaderboard`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [challengeId]);

  const ageGroups = ["All", "Under 30", "30–39", "40–49", "50–59", "60+"];
  const filtered = ageFilter === "All"
    ? entries
    : entries.filter(e => ageGroup(e.dateOfBirth ?? null) === ageFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-medium text-sm">Leaderboard</h3>
          <button onClick={onClose} className="text-foreground-dim hover:text-foreground text-xs">✕</button>
        </div>
        <div className="px-4 py-2 border-b border-border flex gap-1.5 flex-wrap shrink-0">
          {ageGroups.map(g => (
            <button key={g} onClick={() => setAgeFilter(g)}
              className={"text-xs px-2.5 py-1 rounded-full border transition-colors " + (ageFilter === g ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
              {g}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {!loaded ? (
            <p className="text-sm text-foreground-dim animate-pulse">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-foreground-dim">No entries in this age group yet.</p>
          ) : filtered.map((e, i) => (
            <div key={e.userId} className={"flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border " + (e.isMe ? "border-signal/40 bg-signal/10" : "border-border bg-surface")}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{RANK_MEDAL[i + 1] || `#${i + 1}`}</span>
                <span className={"text-sm font-medium truncate " + (e.isMe ? "text-signal" : "")}>{e.isMe ? "You" : e.name}</span>
              </div>
              <span className="text-xs text-foreground-dim shrink-0">{e.stat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlatformChallengeSection() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [joining, setJoining] = useState<Set<string>>(new Set());
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/platform-challenges")
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function toggleJoin(challenge: Challenge) {
    if (joining.has(challenge.id)) return;
    setJoining(prev => new Set(prev).add(challenge.id));
    const action = challenge.isJoined ? "leave" : "join";
    try {
      const res = await fetch("/api/platform-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, action }),
      });
      if (res.ok) {
        setChallenges(prev => prev.map(c =>
          c.id === challenge.id
            ? { ...c, isJoined: !challenge.isJoined, participantCount: challenge.participantCount + (challenge.isJoined ? -1 : 1) }
            : c
        ));
      }
    } finally {
      setJoining(prev => { const next = new Set(prev); next.delete(challenge.id); return next; });
    }
  }

  if (!loaded || challenges.length === 0) return null;

  return (
    <>
      {leaderboardId && (
        <Leaderboard challengeId={leaderboardId} onClose={() => setLeaderboardId(null)} />
      )}

      <section className="mb-6">
        <h2 className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-3">Platform Challenge 🌍</h2>
        <div className="space-y-3">
          {challenges.map(ch => {
            const isActive = ch.status === "active" && new Date(ch.endDate) > new Date();
            const isEnded = ch.status === "ended" || new Date(ch.endDate) <= new Date();
            const remaining = daysLeft(ch.endDate);
            const endedDaysAgo = isEnded && ch.finalAnnouncedAt ? daysAgo(ch.finalAnnouncedAt) : null;

            return (
              <div key={ch.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
                {/* Header */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{ch.title}</h3>
                        {isEnded && <span className="text-xs px-2 py-0.5 rounded-full bg-surface-raised border border-border text-foreground-dim">Ended</span>}
                        {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 border border-green-700/40 text-green-300">{remaining}d left</span>}
                      </div>
                      <p className="text-xs text-foreground-dim">
                        {TYPE_LABELS[ch.type] ?? ch.type}
                        {ch.activityFilter && ch.activityFilter !== "all" ? ` · ${FILTER_LABELS[ch.activityFilter] ?? ch.activityFilter}` : ""}
                        {" · "}{ch.participantCount} athlete{ch.participantCount !== 1 ? "s" : ""}
                      </p>
                      {ch.description && <p className="text-xs text-foreground-dim mt-1">{ch.description}</p>}
                      {ch.badgeName && <p className="text-xs text-foreground-dim mt-0.5">Badge: {ch.badgeName}</p>}
                    </div>
                    {isActive && (
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <button
                          onClick={() => toggleJoin(ch)}
                          disabled={joining.has(ch.id)}
                          className={"text-xs px-3 py-1.5 rounded-full font-medium border transition-colors disabled:opacity-50 " + (ch.isJoined ? "bg-signal/10 border-signal/40 text-signal" : "bg-signal text-background border-signal hover:bg-signal/90")}
                        >
                          {joining.has(ch.id) ? "…" : ch.isJoined ? "✓ Joined" : "Join"}
                        </button>
                        <button onClick={() => setLeaderboardId(ch.id)} className="text-xs text-foreground-dim hover:text-signal transition-colors">
                          Leaderboard →
                        </button>
                      </div>
                    )}
                    {isEnded && (
                      <button onClick={() => setLeaderboardId(ch.id)} className="text-xs text-foreground-dim hover:text-signal transition-colors shrink-0">
                        Final standings →
                      </button>
                    )}
                  </div>
                </div>

                {/* Daily awards */}
                {ch.dailyAwards?.awards?.length > 0 && isActive && (
                  <div className="border-t border-border px-4 py-3 bg-surface-raised/50">
                    <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-2">Today's leaders</p>
                    <div className="space-y-1.5">
                      {ch.dailyAwards.awards.map(award => (
                        <div key={award.rank} className="flex items-baseline gap-2">
                          <span className="text-sm shrink-0">{RANK_MEDAL[award.rank] ?? `#${award.rank}`}</span>
                          <p className="text-xs text-foreground-dim flex-1">
                            <span className="text-foreground font-medium">{award.name}</span>
                            {" — "}{award.text}
                            <span className="text-foreground-dim/60 ml-1">({award.stat})</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final announcement */}
                {ch.finalAnnouncement && isEnded && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs font-medium mb-2">🏆 Final Results</p>
                    <p className="text-xs text-foreground-dim mb-3">{ch.finalAnnouncement.intro}</p>
                    <div className="space-y-2">
                      {ch.finalAnnouncement.top5.map(e => (
                        <div key={e.rank} className="flex items-start gap-2">
                          <span className="text-sm shrink-0 mt-0.5">{RANK_MEDAL[e.rank] ?? `#${e.rank}`}</span>
                          <div>
                            <p className="text-xs font-medium">{e.name} <span className="text-foreground-dim font-normal">— {e.stat}</span></p>
                            <p className="text-xs text-foreground-dim mt-0.5">{e.tribute}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
