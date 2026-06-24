"use client";
import { useState, useEffect } from "react";
import { NewRaceForm } from "@/components/NewRaceForm";

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

function fmtGoal(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function kmToMiles(km: number) {
  return (km / 1.60934).toFixed(1);
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
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

function toDateInput(dateStr: string) {
  return new Date(dateStr).toISOString().slice(0, 10);
}

export default function PlanPage() {
  const [races, setRaces] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selRaceId, setSelRaceId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/races").then(r => r.json()),
      fetch("/api/plan").then(r => r.json()),
    ]).then(([rd, pd]) => {
      const r = rd.races || [];
      const p = pd.plans || [];
      setRaces(r);
      setPlans(p);
      setLoading(false);
      if (r.length > 0) {
        const firstId = r[0].id;
        setSelRaceId(firstId);
        const firstPlan = p.find((pl: any) => pl.raceId === firstId);
        if (firstPlan) setExpandedWeeks(new Set([currentWeekNum(firstPlan)]));
      }
    });
  }, []);

  function selectRace(raceId: string) {
    setSelRaceId(raceId);
    setEditingId(null);
    const plan = plans.find((p: any) => p.raceId === raceId);
    if (plan) setExpandedWeeks(new Set([currentWeekNum(plan)]));
    else setExpandedWeeks(new Set());
  }

  async function deleteRace(id: string) {
    setDeleting(true);
    const res = await fetch(`/api/races?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const newRaces = races.filter((r: any) => r.id !== id);
      setRaces(newRaces);
      setPlans(prev => prev.filter((p: any) => p.raceId !== id));
      setConfirmDel(null);
      if (selRaceId === id) {
        const next = newRaces[0]?.id || null;
        setSelRaceId(next);
        if (next) {
          const plan = plans.find((p: any) => p.raceId === next);
          if (plan) setExpandedWeeks(new Set([currentWeekNum(plan)]));
        }
      }
    }
    setDeleting(false);
  }

  function toggleWeek(week: number) {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
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
      setPlans(prev => prev.map((plan: any) => ({
        ...plan,
        completedWorkouts: plan.completedWorkouts + (plan.weeks.some((wk: any) => wk.workouts.some((w: any) => w.id === workoutId)) ? (!completed ? 1 : -1) : 0),
        weeks: plan.weeks.map((wk: any) => ({
          ...wk,
          workouts: wk.workouts.map((w: any) => w.id === workoutId ? { ...w, completed: !completed } : w),
        })),
      })));
    }
    setToggling(prev => { const s = new Set(prev); s.delete(workoutId); return s; });
  }

  function startEdit(w: any) {
    setEditingId(w.id);
    setEditForm({
      type: w.type || "easy_run",
      title: w.title || "",
      description: w.description || "",
      distanceMi: w.distanceKm ? kmToMiles(w.distanceKm) : "",
      durationMin: w.durationMin || "",
      date: toDateInput(w.date),
    });
  }

  async function saveEdit(workoutId: string) {
    setSaving(true);
    const body: any = { type: editForm.type, title: editForm.title, description: editForm.description, date: editForm.date };
    body.distanceKm = editForm.distanceMi !== "" ? parseFloat(editForm.distanceMi) : null;
    body.durationMin = editForm.durationMin !== "" ? parseInt(editForm.durationMin) : null;
    const res = await fetch(`/api/races/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { workout } = await res.json();
      setPlans(prev => prev.map((plan: any) => ({
        ...plan,
        weeks: plan.weeks.map((wk: any) => ({
          ...wk,
          workouts: wk.workouts.map((w: any) => w.id === workoutId ? { ...w, ...workout } : w),
        })),
      })));
      setEditingId(null);
    }
    setSaving(false);
  }

  if (loading) return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="h-8 w-40 bg-surface rounded-xl animate-pulse mb-6" />
      <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}</div>
    </div>
  );

  const hasActivePlan = races.some((r: any) => r.trainingPlan && r.trainingPlan._count?.workouts > 0);
  const selRace = races.find((r: any) => r.id === selRaceId);
  const selPlan = plans.find((p: any) => p.raceId === selRaceId);

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">My Plan</h1>
          <p className="text-foreground-dim text-sm">Your races and training schedule.</p>
        </div>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-full border border-signal text-signal text-sm font-medium hover:bg-signal hover:text-background transition-colors shrink-0">
            + Add race
          </button>
        )}
      </header>

      {/* Add race form */}
      {showAddForm && (
        <div className="mb-6">
          {hasActivePlan && (
            <div className="rounded-2xl border border-border bg-surface p-4 mb-4">
              <p className="text-sm font-medium mb-0.5">You have an active training plan</p>
              <p className="text-xs text-foreground-dim">Complete your current plan before adding a new one for best results.</p>
            </div>
          )}
          <NewRaceForm />
          <button onClick={() => setShowAddForm(false)} className="mt-3 text-sm text-foreground-dim hover:text-foreground">Cancel</button>
        </div>
      )}

      {/* Empty state */}
      {races.length === 0 && !showAddForm && (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="font-medium mb-2">No races yet</p>
          <p className="text-sm text-foreground-dim mb-5">Add your first race to build a training plan.</p>
          <button onClick={() => setShowAddForm(true)} className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium">Add a race</button>
        </div>
      )}

      {/* Race list */}
      {races.length > 0 && (
        <div className="space-y-2 mb-6">
          {races.map((r: any) => {
            const due = r.trainingPlan?.workouts ?? [];
            const total = due.length;
            const done = due.filter((w: any) => w.completed).length;
            const totalPlan = r.trainingPlan?._count?.workouts ?? 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const isSel = selRaceId === r.id;
            const daysLeft = daysUntil(r.raceDate);

            return (
              <div key={r.id}
                onClick={() => selectRace(r.id)}
                className={"rounded-2xl border p-4 cursor-pointer transition-colors " + (isSel ? "border-signal/50 bg-signal/5" : "border-border bg-surface hover:border-signal/30")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={"font-medium text-sm " + (isSel ? "text-signal" : "")}>{r.raceName}</h3>
                      <span className="text-xs text-foreground-dim">{distLabel(r.distanceM)}</span>
                      {r.goalTimeSec && <span className="text-xs text-foreground-dim">· Goal {fmtGoal(r.goalTimeSec)}</span>}
                    </div>
                    <p className="text-xs text-foreground-dim mt-0.5">
                      {new Date(r.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {daysLeft > 0 ? ` · ${daysLeft}d away` : daysLeft === 0 ? " · Today!" : " · Complete"}
                    </p>
                    {totalPlan > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-foreground-dim mb-1">
                          <span>{done}/{total} workouts done</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1 bg-border rounded-full">
                          <div className={"h-1 rounded-full " + (isSel ? "bg-signal" : "bg-foreground-dim/50")} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    {totalPlan === 0 && (
                      <a href={`/dashboard/races/${r.id}`} onClick={e => e.stopPropagation()}
                        className="mt-1.5 inline-block text-xs text-signal hover:underline">
                        Build training plan →
                      </a>
                    )}
                  </div>
                  <div className="shrink-0" onClick={e => e.stopPropagation()}>
                    {confirmDel === r.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-foreground-dim">Delete?</span>
                        <button onClick={() => deleteRace(r.id)} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60">Yes</button>
                        <button onClick={() => setConfirmDel(null)} className="text-xs text-foreground-dim hover:text-foreground">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(r.id)} className="text-xs text-foreground-dim hover:text-red-400 transition-colors px-2 py-1">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Training plan for selected race */}
      {selRace && selPlan && (
        <div>
          {/* Summary */}
          <div className="rounded-2xl border border-border bg-surface p-5 mb-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Training Plan</p>
                <h2 className="font-semibold">{selPlan.raceName}</h2>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-bold text-signal">
                  {selPlan.totalWorkouts > 0 ? Math.round((selPlan.completedWorkouts / selPlan.totalWorkouts) * 100) : 0}%
                </p>
                <p className="text-xs text-foreground-dim">{selPlan.completedWorkouts}/{selPlan.totalWorkouts} done</p>
              </div>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full mb-2">
              <div className="h-1.5 rounded-full bg-signal transition-all"
                style={{ width: (selPlan.totalWorkouts > 0 ? Math.round((selPlan.completedWorkouts / selPlan.totalWorkouts) * 100) : 0) + "%" }} />
            </div>
            <div className="flex justify-between text-xs text-foreground-dim">
              <span>Week {currentWeekNum(selPlan)} of {selPlan.weeks.length}</span>
              <span>{(() => { const d = daysUntil(selPlan.raceDate); return d > 0 ? `${d} days to race` : d === 0 ? "Race day!" : "Race complete"; })()}</span>
            </div>
          </div>

          {/* Week accordion */}
          <p className="text-xs text-foreground-dim mb-3 px-1">Tap a workout to edit it.</p>
          <div className="space-y-2">
            {selPlan.weeks.map((wk: any) => {
              const isCurrent = wk.week === currentWeekNum(selPlan);
              const isPast = wk.week < currentWeekNum(selPlan);
              const isExpanded = expandedWeeks.has(wk.week);
              const wkDone = wk.workouts.filter((w: any) => w.completed).length;
              const wkTotal = wk.workouts.length;
              const wkPct = wkTotal > 0 ? Math.round((wkDone / wkTotal) * 100) : 0;

              return (
                <div key={wk.week} className={"rounded-2xl border overflow-hidden " + (isCurrent ? "border-signal/40" : "border-border")}>
                  <button onClick={() => toggleWeek(wk.week)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/60 transition-colors">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">Week {wk.week}</span>
                          {isCurrent && <span className="text-xs px-2 py-0.5 rounded-full bg-signal/20 text-signal font-medium">Current</span>}
                          {isPast && wkDone === wkTotal && wkTotal > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/50 text-green-300 font-medium">Complete</span>}
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

                  {isExpanded && (
                    <div className="border-t border-border/60 divide-y divide-border/40">
                      {wk.workouts.map((w: any) => {
                        const colorClass = TYPE_COLORS[w.type] || "bg-border/60 text-foreground-dim border-border";
                        const isToday = daysUntil(w.date) === 0;
                        const isEditing = editingId === w.id;

                        if (isEditing) {
                          return (
                            <div key={w.id} className="px-5 py-4 bg-surface/60">
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-foreground-dim mb-1 block">Type</label>
                                    <select value={editForm.type} onChange={e => setEditForm((f: any) => ({ ...f, type: e.target.value }))}
                                      className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal">
                                      {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-foreground-dim mb-1 block">Date</label>
                                    <input type="date" value={editForm.date} onChange={e => setEditForm((f: any) => ({ ...f, date: e.target.value }))}
                                      className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal" />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-foreground-dim mb-1 block">Title</label>
                                  <input value={editForm.title} onChange={e => setEditForm((f: any) => ({ ...f, title: e.target.value }))}
                                    className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal" />
                                </div>
                                <div>
                                  <label className="text-xs text-foreground-dim mb-1 block">Description</label>
                                  <textarea value={editForm.description} onChange={e => setEditForm((f: any) => ({ ...f, description: e.target.value }))}
                                    rows={2} className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal resize-none" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-xs text-foreground-dim mb-1 block">Distance (mi)</label>
                                    <input type="number" step="0.1" min="0" value={editForm.distanceMi}
                                      onChange={e => setEditForm((f: any) => ({ ...f, distanceMi: e.target.value }))}
                                      className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-foreground-dim mb-1 block">Duration (min)</label>
                                    <input type="number" min="0" value={editForm.durationMin}
                                      onChange={e => setEditForm((f: any) => ({ ...f, durationMin: e.target.value }))}
                                      className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal" />
                                  </div>
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button onClick={() => saveEdit(w.id)} disabled={saving}
                                    className="px-4 py-1.5 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-60">
                                    {saving ? "Saving…" : "Save"}
                                  </button>
                                  <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-full border border-border text-xs">Cancel</button>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={w.id} className={"flex gap-4 px-5 py-4 group " + (w.completed ? "opacity-60" : "") + (isToday ? " bg-signal/5" : "")}>
                            <button onClick={() => toggleWorkout(w.id, w.completed)} disabled={toggling.has(w.id)}
                              className={"mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors " + (w.completed ? "bg-signal border-signal" : "border-border hover:border-signal")}>
                              {w.completed && <span className="text-background text-xs font-bold">✓</span>}
                              {toggling.has(w.id) && <span className="w-2 h-2 rounded-full bg-signal/50 animate-pulse" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={"text-xs px-2 py-0.5 rounded-full border font-medium " + colorClass}>{TYPE_LABELS[w.type] || w.type}</span>
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
                            <button onClick={() => startEdit(w)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-foreground-dim hover:text-foreground shrink-0 mt-0.5 px-2 py-1 rounded-lg hover:bg-surface">
                              Edit
                            </button>
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
      )}

      {/* Selected race has no plan yet */}
      {selRace && !selPlan && (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="font-medium mb-1">No training plan yet</p>
          <p className="text-sm text-foreground-dim mb-4">Build your plan for {selRace.raceName}.</p>
          <a href={`/dashboard/races/${selRace.id}`}
            className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium">
            Build training plan →
          </a>
        </div>
      )}
    </div>
  );
}
