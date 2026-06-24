"use client";
import { useState, useEffect } from "react";

const TYPE_COLORS: Record<string, string> = {
  easy_run:   "bg-green-900/50 text-green-300 border-green-700",
  tempo:      "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  intervals:  "bg-red-900/50 text-red-300 border-red-700",
  long_run:   "bg-blue-900/50 text-blue-300 border-blue-700",
  cross_train:"bg-purple-900/50 text-purple-300 border-purple-700",
  swim:       "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  bike:       "bg-orange-900/50 text-orange-300 border-orange-700",
  brick:      "bg-pink-900/50 text-pink-300 border-pink-700",
  rest:       "bg-border/60 text-foreground-dim border-border",
  race:       "bg-signal/20 text-signal border-signal/50",
};

const TYPE_LABELS: Record<string, string> = {
  easy_run: "Easy Run", tempo: "Tempo", intervals: "Intervals", long_run: "Long Run",
  cross_train: "Cross Train", swim: "Swim", bike: "Bike", brick: "Brick", rest: "Rest", race: "Race",
};

function distLabel(m: number) {
  if (m >= 200000) return "140.6 Ironman";
  if (m >= 100000) return "70.3";
  if (m >= 40000)  return "Marathon";
  if (m >= 20000)  return "Half Marathon";
  if (m >= 9000)   return "10K";
  if (m >= 4500)   return "5K";
  return (m / 1609.34).toFixed(1) + " mi";
}

function kmToMiles(km: number) {
  return (km / 1.60934).toFixed(1);
}

function daysUntil(date: string) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}

function currentWeekNum(plan: any): number {
  if (!plan.startDate) return 1;
  const start = new Date(plan.startDate);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 86400000)) + 1);
}

export default function PlanPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selIdx, setSelIdx] = useState(0);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/plan").then(r => r.json()).then(d => {
      const p = d.plans || [];
      setPlans(p);
      setLoading(false);
      if (p.length > 0) {
        const cur = currentWeekNum(p[0]);
        setExpandedWeeks(new Set([cur]));
      }
    });
  }, []);

  function toggleWeek(week: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week);
      else next.add(week);
      return next;
    });
  }

  async function toggleWorkout(workoutId: string, completed: boolean) {
    setToggling(prev => new Set(prev).add(workoutId));
    const res = await fetch(`/api/races/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    if (res.ok) {
      setPlans(prev => prev.map(plan => ({
        ...plan,
        completedWorkouts: plan.completedWorkouts + (!completed ? 1 : -1),
        weeks: plan.weeks.map((wk: any) => ({
          ...wk,
          workouts: wk.workouts.map((w: any) =>
            w.id === workoutId ? { ...w, completed: !completed } : w
          ),
        })),
      })));
    }
    setToggling(prev => { const s = new Set(prev); s.delete(workoutId); return s; });
  }

  if (loading) return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="h-8 w-40 bg-surface rounded-xl animate-pulse mb-8" />
      <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}</div>
    </div>
  );

  if (plans.length === 0) return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">My Plan</h1>
      <div className="rounded-2xl border border-border bg-surface p-10 text-center mt-6">
        <p className="font-medium mb-2">No training plan yet</p>
        <p className="text-sm text-foreground-dim mb-5">Add a race and generate a training plan to see your schedule here.</p>
        <a href="/dashboard/races" className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium">Go to Races →</a>
      </div>
    </div>
  );

  const plan = plans[selIdx] || plans[0];
  const curWeek = currentWeekNum(plan);
  const pct = plan.totalWorkouts > 0 ? Math.round((plan.completedWorkouts / plan.totalWorkouts) * 100) : 0;
  const daysLeft = daysUntil(plan.raceDate);

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">My Plan</h1>
        <p className="text-foreground-dim text-sm">Your weekly training schedule.</p>
      </header>

      {/* Race selector */}
      {plans.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-5">
          {plans.map((p, i) => (
            <button key={p.id} onClick={() => { setSelIdx(i); setExpandedWeeks(new Set([currentWeekNum(p)])); }}
              className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (selIdx === i ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
              {p.raceName}
            </button>
          ))}
        </div>
      )}

      {/* Race summary card */}
      <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="font-semibold text-lg leading-tight">{plan.raceName}</h2>
            <p className="text-sm text-foreground-dim mt-0.5">
              {distLabel(plan.distanceM)} · {new Date(plan.raceDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-signal">{pct}%</p>
            <p className="text-xs text-foreground-dim">{plan.completedWorkouts}/{plan.totalWorkouts} done</p>
          </div>
        </div>
        <div className="w-full h-2 bg-border rounded-full mb-3">
          <div className="h-2 rounded-full bg-signal transition-all" style={{ width: pct + "%" }} />
        </div>
        <div className="flex justify-between text-xs text-foreground-dim">
          <span>Week {curWeek} of {plan.weeks.length}</span>
          <span>{daysLeft > 0 ? `${daysLeft} days to race` : daysLeft === 0 ? "Race day!" : "Race complete"}</span>
        </div>
        <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
          <a href={`/dashboard/races/${plan.raceId}`} className="text-xs px-3 py-1.5 rounded-full border border-signal text-signal hover:bg-signal hover:text-background transition-colors">View training plan →</a>
        </div>
      </div>

      {/* Weeks */}
      <div className="space-y-2">
        {plan.weeks.map((wk: any) => {
          const isCurrent = wk.week === curWeek;
          const isPast = wk.week < curWeek;
          const isExpanded = expandedWeeks.has(wk.week);
          const wkDone = wk.workouts.filter((w: any) => w.completed).length;
          const wkTotal = wk.workouts.length;
          const wkPct = wkTotal > 0 ? Math.round((wkDone / wkTotal) * 100) : 0;

          return (
            <div key={wk.week} className={"rounded-2xl border overflow-hidden " + (isCurrent ? "border-signal/40" : "border-border")}>
              {/* Week header */}
              <button onClick={() => toggleWeek(wk.week)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Week {wk.week}</span>
                      {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-signal/20 text-signal font-medium">Current</span>}
                      {isPast && wkDone === wkTotal && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 font-medium">Complete</span>}
                    </div>
                    <p className="text-xs text-foreground-dim mt-0.5">{wkDone}/{wkTotal} workouts</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-1.5 bg-border rounded-full hidden sm:block">
                    <div className="h-1.5 rounded-full bg-signal transition-all" style={{ width: wkPct + "%" }} />
                  </div>
                  <span className="text-foreground-dim text-sm">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Workouts */}
              {isExpanded && (
                <div className="border-t border-border/60 divide-y divide-border/40">
                  {wk.workouts.map((w: any) => {
                    const colorClass = TYPE_COLORS[w.type] || "bg-border/60 text-foreground-dim border-border";
                    const isToday = daysUntil(w.date) === 0;
                    const isFuture = daysUntil(w.date) > 0;
                    return (
                      <div key={w.id} className={"flex gap-4 px-5 py-4 " + (w.completed ? "opacity-60" : "") + (isToday ? " bg-signal/5" : "")}>
                        {/* Checkbox */}
                        <button onClick={() => toggleWorkout(w.id, w.completed)} disabled={toggling.has(w.id)}
                          className={"mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors " + (w.completed ? "bg-signal border-signal" : "border-border hover:border-signal")}>
                          {w.completed && <span className="text-background text-xs font-bold">✓</span>}
                          {toggling.has(w.id) && <span className="w-2 h-2 rounded-full bg-signal/50 animate-pulse" />}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={"text-xs px-2 py-0.5 rounded-full border font-medium " + colorClass}>
                              {TYPE_LABELS[w.type] || w.type}
                            </span>
                            {isToday && !w.completed && <span className="text-xs px-2 py-0.5 rounded-full bg-signal/20 text-signal font-medium">Today</span>}
                            <span className="text-xs text-foreground-dim">
                              {new Date(w.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className={"text-sm font-medium " + (w.completed ? "line-through text-foreground-dim" : "")}>{w.title}</p>
                          {w.description && <p className="text-xs text-foreground-dim mt-0.5 leading-relaxed">{w.description}</p>}
                          {(w.distanceKm || w.durationMin) && (
                            <div className="flex gap-3 mt-1.5 text-xs text-foreground-dim">
                              {w.distanceKm && <span>{kmToMiles(w.distanceKm)} mi</span>}
                              {w.durationMin && <span>{w.durationMin} min</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
