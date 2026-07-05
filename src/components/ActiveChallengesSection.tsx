"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export function ActiveChallengesSection() {
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/active-challenges")
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function accept(challengeId: string, teamId: string) {
    setAccepting(challengeId);
    const res = await fetch(`/api/teams/${teamId}/challenges/${challengeId}/accept`, { method: "POST" });
    if (res.ok) {
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, userAccepted: true } : c));
    }
    setAccepting(null);
  }

  const visible = challenges.filter((c: any) => c.type?.toLowerCase() !== "steps");
  if (!loaded || visible.length === 0) return null;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const unaccepted = visible.filter((c: any) => !c.userAccepted);
  const accepted = visible.filter((c: any) => c.userAccepted);

  return (
    <section className="mb-6">
      {/* Pending-acceptance banners */}
      {unaccepted.map((c: any) => {
        const daysLeft = Math.ceil((new Date(c.endDate).getTime() - today.getTime()) / 86400000);
        return (
          <div key={c.id} className="mb-3 rounded-2xl border border-signal/30 bg-signal/5 px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">🏆 New challenge: {c.title}</p>
              <p className="text-xs text-foreground-dim mt-0.5">{c.team.name} · {daysLeft}d left · {c.goal} {c.unit}{c.goalPerDay ? "/day" : ""}</p>
            </div>
            <button
              onClick={() => accept(c.id, c.team.id)}
              disabled={accepting === c.id}
              className="shrink-0 px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-50"
            >
              {accepting === c.id ? "..." : "Accept"}
            </button>
          </div>
        );
      })}

      {/* Accepted challenges */}
      {accepted.length > 0 && (
        <details open className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden mb-3 py-0.5 border-b border-border">
            <h2 className="text-sm font-medium text-foreground-dim select-none">Active challenges ({accepted.length})</h2>
            <span className="text-foreground-dim text-xs select-none transition-transform group-open:rotate-180 inline-block mr-0.5">▾</span>
          </summary>
          <div className="pt-1 space-y-3">
            {accepted.map((c: any) => {
              const myTotal = c.entries.reduce((s: number, e: any) => s + e.value, 0);
              const cpct = c.goal ? Math.min(100, Math.round((myTotal / c.goal) * 100)) : null;
              const daysLeft = Math.ceil((new Date(c.endDate).getTime() - today.getTime()) / 86400000);
              const isOpen = expanded === c.id;
              const isSteps = c.unit === "steps";

              return (
                <div key={c.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
                  <div className="px-4 py-3">
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
                          <span>{myTotal} / {c.goal} {c.unit}{c.goalPerDay ? " today" : ""}</span>
                          <span>{cpct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-border rounded-full">
                          <div className="h-1.5 rounded-full bg-signal transition-all" style={{ width: `${cpct}%` }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-foreground-dim">{myTotal} {c.unit} logged</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      <Link href="/dashboard/log-workout"
                        className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium hover:opacity-90 transition-opacity">
                        + Log Workout
                      </Link>
                      <button onClick={() => setExpanded(isOpen ? null : c.id)}
                        className="text-xs text-foreground-dim hover:text-foreground transition-colors">
                        {isOpen ? "Hide details ↑" : "How to track →"}
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border px-4 py-3 space-y-3 bg-background/40">
                      {c.description && <p className="text-sm text-foreground-dim">{c.description}</p>}
                      <div className="text-xs text-foreground-dim space-y-0.5">
                        <p><span className="text-foreground font-medium">Goal:</span> {c.goal} {c.unit}{c.goalPerDay ? " per day" : " total"}</p>
                        <p><span className="text-foreground font-medium">Ends:</span> {new Date(c.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
                        <p><span className="text-foreground font-medium">Team:</span> {c.team.name}</p>
                      </div>

                      {isSteps ? (
                        <div className="space-y-2">
                          <p className="text-xs text-foreground-dim">
                            Track your steps with a free app, then log them in Train2Race via the <strong className="text-foreground">+ Log Workout</strong> button — enter your step count in the Steps field.
                          </p>
                          <div className="rounded-xl border border-teal-500/30 bg-teal-900/10 p-3 text-xs space-y-1">
                            <p className="font-medium text-teal-400">📱 Free step tracking apps:</p>
                            <p className="text-foreground-dim font-medium pt-0.5">iPhone:</p>
                            <p className="text-foreground-dim">•{" "}
                              <a href="https://www.apple.com/ios/health/" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Apple Health</a>
                              {" "}(built-in, no download needed)
                            </p>
                            <p className="text-foreground-dim">•{" "}
                              <a href="https://apps.apple.com/us/app/pedometer/id712286167" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Pedometer++</a>
                            </p>
                            <p className="text-foreground-dim font-medium pt-0.5">Android:</p>
                            <p className="text-foreground-dim">•{" "}
                              <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.fitness" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Google Fit</a>
                              {" "}(free)
                            </p>
                            <p className="text-foreground-dim">•{" "}
                              <a href="https://play.google.com/store/apps/details?id=com.sec.android.app.shealth" target="_blank" rel="noopener noreferrer" className="text-signal hover:underline">Samsung Health</a>
                              {" "}(free)
                            </p>
                          </div>
                        </div>
                      ) : c.metric === "distance" ? (
                        <p className="text-xs text-foreground-dim">
                          Log your {c.type} workouts via <strong className="text-foreground">+ Log Workout</strong> or connect a device (Strava, Garmin). Distance is tracked automatically from your logged workouts.
                        </p>
                      ) : c.metric === "duration" ? (
                        <p className="text-xs text-foreground-dim">
                          Log each workout via <strong className="text-foreground">+ Log Workout</strong>. Duration is tracked automatically — just enter your time.
                        </p>
                      ) : (
                        <p className="text-xs text-foreground-dim">
                          Each workout you log via <strong className="text-foreground">+ Log Workout</strong> counts as one session toward your goal.
                        </p>
                      )}

                      <Link href={`/dashboard/teams/${c.team.id}?tab=challenges`}
                        className="inline-block text-xs text-foreground-dim hover:text-foreground transition-colors">
                        View full leaderboard →
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
    </section>
  );
}
