"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { NewRaceForm } from "@/components/NewRaceForm";

// ── Race plan constants ───────────────────────────────────────
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

// ── Fitness plan constants ────────────────────────────────────
const FIT_COLORS: Record<string, string> = {
  strength: "bg-blue-900/50 text-blue-300 border-blue-700",
  cardio:   "bg-green-900/50 text-green-300 border-green-700",
  hiit:     "bg-red-900/50 text-red-300 border-red-700",
  stretch:  "bg-purple-900/50 text-purple-300 border-purple-700",
};

const FIT_LABELS: Record<string, string> = {
  strength: "Strength", cardio: "Cardio", hiit: "HIIT", stretch: "Mobility",
};

const Q1 = [
  { v: "Lose weight",      i: "⚖️" },
  { v: "Build strength",   i: "💪" },
  { v: "Get more active",  i: "🏃" },
  { v: "Improve fitness",  i: "📈" },
];
const Q2 = [
  { v: "At home (no equipment)",   i: "🏠" },
  { v: "At home (with equipment)", i: "🏋️" },
  { v: "At a gym",                  i: "🏟️" },
  { v: "Outdoors",                  i: "🌳" },
];
const Q3 = [
  { v: "Not very active",               i: "😴" },
  { v: "A little active (1-2x/week)",   i: "🚶" },
  { v: "Moderately active (3-4x/week)", i: "🏃" },
  { v: "Very active (5+/week)",         i: "⚡" },
];
const Q4 = [2, 3, 4, 5];

// ── Helpers ───────────────────────────────────────────────────
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

function kmToMiles(km: number) { return (km / 1.60934).toFixed(1); }

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

// ── Main component ────────────────────────────────────────────
function PlanPageInner() {
  const searchParams = useSearchParams();
  // Race state
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

  // Fitness state
  const [fitnessPlan, setFitnessPlan] = useState<any>(null);
  const [fitnessStep, setFitnessStep] = useState(0); // 0=off, 1-5=questionnaire
  const [fitnessAns, setFitnessAns] = useState({ goal: "", location: "", currentFitness: "", daysPerWeek: 3 });
  const [generating, setGenerating] = useState(false);
  const [fitnessErr, setFitnessErr] = useState("");
  const [fitExpWeeks, setFitExpWeeks] = useState<Set<number>>(new Set([1]));
  const [fitExpWorkouts, setFitExpWorkouts] = useState<Set<string>>(new Set());
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [logged, setLogged] = useState<Set<string>>(new Set());
  const [fitnessTab, setFitnessTab] = useState<"workout" | "nutrition">("workout");
  const [confirmDelFit, setConfirmDelFit] = useState(false);
  const [deletingFit, setDeletingFit] = useState(false);

  useEffect(() => {
    if (searchParams.get("start") === "fitness") setFitnessStep(1);
  }, [searchParams]);

  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      fetch("/api/races", { signal: ac.signal }).then(r => r.json()),
      fetch("/api/plan", { signal: ac.signal }).then(r => r.json()),
      fetch("/api/fitness-plan", { signal: ac.signal }).then(r => r.json()),
    ]).then(([rd, pd, fd]) => {
      const r = rd.races || [];
      const p = pd.plans || [];
      setRaces(r);
      setPlans(p);
      if (fd.plan) setFitnessPlan(fd.plan);
      setLoading(false);
      if (r.length > 0) {
        const firstId = r[0].id;
        setSelRaceId(firstId);
        const firstPlan = p.find((pl: any) => pl.raceId === firstId);
        if (firstPlan) setExpandedWeeks(new Set([currentWeekNum(firstPlan)]));
      }
    }).catch(() => {});
    return () => ac.abort();
  }, []);

  // Race functions
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

  // Fitness functions
  async function startGenerating(wantsNutrition: boolean) {
    setGenerating(true);
    setFitnessErr("");
    try {
      const res = await fetch("/api/fitness-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fitnessAns, includeNutrition: wantsNutrition }),
      });
      if (!res.ok) throw new Error("failed");
      const { plan } = await res.json();
      setFitnessPlan(plan);
      setFitnessStep(0);
      setFitnessTab("workout");
      setFitExpWeeks(new Set([1]));
    } catch {
      setFitnessErr("Something went wrong. Please try again.");
      setFitnessStep(5);
    }
    setGenerating(false);
  }

  function toggleFitnessWeek(week: number) {
    setFitExpWeeks(prev => {
      const next = new Set(prev);
      if (next.has(week)) next.delete(week); else next.add(week);
      return next;
    });
  }

  function toggleFitnessWorkout(id: string) {
    setFitExpWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function logFitnessWorkout(workout: any) {
    if (!fitnessPlan || loggingId) return;
    setLoggingId(workout.id);
    try {
      const res = await fetch(`/api/fitness-plan/${fitnessPlan.id}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: workout.id,
          workoutTitle: workout.title,
          workoutType: workout.type,
          durationMin: workout.durationMin,
        }),
      });
      if (res.ok) {
        setLogged(prev => new Set(prev).add(workout.id));
        setFitnessPlan((prev: any) => ({
          ...prev,
          completedWorkoutIds: [...(prev.completedWorkoutIds || []), workout.id],
        }));
      }
    } catch {}
    setLoggingId(null);
  }

  async function deleteFitnessPlan() {
    if (!fitnessPlan) return;
    setDeletingFit(true);
    try {
      await fetch(`/api/fitness-plan/${fitnessPlan.id}`, { method: "DELETE" });
      setFitnessPlan(null);
      setFitnessStep(0);
      setConfirmDelFit(false);
      setLogged(new Set());
    } catch {}
    setDeletingFit(false);
  }

  if (loading) return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <div className="h-8 w-40 bg-surface rounded-xl animate-pulse mb-6" />
      <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />)}</div>
    </div>
  );

  const selRace = races.find((r: any) => r.id === selRaceId);
  const selPlan = plans.find((p: any) => p.raceId === selRaceId);

  const showTwoCards = races.length === 0 && !fitnessPlan && fitnessStep === 0 && !showAddForm && !generating;

  const fitnessWeeks: any[] = fitnessPlan ? (fitnessPlan.planContent as any)?.weeks || [] : [];
  const completedIds = new Set([...(fitnessPlan?.completedWorkoutIds || []), ...logged]);
  const totalFitnessWorkouts = fitnessWeeks.reduce((s: number, w: any) => s + w.workouts.length, 0);
  const doneFitnessWorkouts = fitnessWeeks.reduce((s: number, w: any) =>
    s + w.workouts.filter((wr: any) => completedIds.has(wr.id)).length, 0
  );
  const fitPct = totalFitnessWorkouts > 0 ? Math.round((doneFitnessWorkouts / totalFitnessWorkouts) * 100) : 0;
  const nutrition = fitnessPlan?.nutritionContent as any;

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">My Plan</h1>
          <p className="text-foreground-dim text-sm">Your races and training schedule.</p>
        </div>
        {!showAddForm && races.length === 0 && !showTwoCards && (
          <button onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-full border border-signal text-signal text-sm font-medium hover:bg-signal hover:text-background transition-colors shrink-0">
            + Add race
          </button>
        )}
      </header>

      {/* ── Two-card empty state ── */}
      {showTwoCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col">
            <div className="text-3xl mb-3">🏁</div>
            <h3 className="font-semibold mb-1">Race Training</h3>
            <p className="text-sm text-foreground-dim mb-5 flex-1">Set a race target and follow an AI-generated training plan tailored to your race date.</p>
            <button onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 rounded-xl border border-signal text-signal text-sm font-medium hover:bg-signal hover:text-background transition-colors">
              Add a race →
            </button>
          </div>
          <div className="rounded-2xl border border-teal-500/40 bg-surface p-6 flex flex-col">
            <div className="text-3xl mb-3">💪</div>
            <h3 className="font-semibold mb-1">Get in Shape</h3>
            <p className="text-sm text-foreground-dim mb-5 flex-1">No race? Build a custom 4-week workout plan tailored to your goal, location, and schedule.</p>
            <button onClick={() => setFitnessStep(1)}
              className="w-full py-2.5 rounded-xl border border-teal-500 text-teal-400 text-sm font-medium hover:bg-teal-500/10 transition-colors">
              Get started →
            </button>
          </div>
        </div>
      )}

      {/* ── Race section (non-empty or form active) ── */}
      {!showTwoCards && (
        <>
          {/* Add race form */}
          {showAddForm && races.length === 0 && (
            <div className="mb-6">
              <NewRaceForm />
              <button onClick={() => setShowAddForm(false)} className="mt-3 text-sm text-foreground-dim hover:text-foreground">Cancel</button>
            </div>
          )}

          {/* Race empty state — only when no fitness section is taking over */}
          {races.length === 0 && !showAddForm && fitnessStep === 0 && !generating && (
            <div className="rounded-2xl border border-border bg-surface p-10 text-center mb-8">
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
                      <div className="shrink-0 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <a href={`/dashboard/races/${r.id}`} className="text-xs text-signal hover:underline px-2 py-1">Edit plan</a>
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
            <div className="mb-10">
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
                                  className="text-xs text-foreground-dim hover:text-signal transition-colors shrink-0 mt-0.5 px-2 py-1 rounded-lg hover:bg-surface border border-transparent hover:border-border">
                                  ✎
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
            <div className="rounded-2xl border border-border bg-surface p-8 text-center mb-10">
              <p className="font-medium mb-1">No training plan yet</p>
              <p className="text-sm text-foreground-dim mb-4">Build your plan for {selRace.raceName}.</p>
              <a href={`/dashboard/races/${selRace.id}`}
                className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium">
                Build training plan →
              </a>
            </div>
          )}

          {/* ── Fitness section ── */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-semibold whitespace-nowrap">Get in Shape</h2>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Option card */}
            {!fitnessPlan && fitnessStep === 0 && !generating && (
              <div className="rounded-2xl border border-teal-500/40 bg-surface p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="text-4xl">💪</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">Build a fitness plan</h3>
                  <p className="text-sm text-foreground-dim">Get a custom 4-week workout plan tailored to your goal, location, and schedule. Takes 30 seconds to set up.</p>
                </div>
                <button onClick={() => setFitnessStep(1)}
                  className="shrink-0 px-5 py-2.5 rounded-full border border-teal-500 text-teal-400 text-sm font-medium hover:bg-teal-500/10 transition-colors">
                  Get started →
                </button>
              </div>
            )}

            {/* Questionnaire */}
            {fitnessStep > 0 && !generating && (
              <div className="rounded-2xl border border-teal-500/40 bg-surface p-6">
                {/* Step indicator */}
                <div className="flex items-center gap-1.5 mb-5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <div key={s} className={"h-1 flex-1 rounded-full transition-colors " + (s <= fitnessStep ? "bg-teal-500" : "bg-border")} />
                  ))}
                </div>

                {/* Step 1: Goal */}
                {fitnessStep === 1 && (
                  <div>
                    <p className="font-semibold mb-1">What's your main goal?</p>
                    <p className="text-sm text-foreground-dim mb-4">Step 1 of 5</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Q1.map(({ v, i }) => (
                        <button key={v} onClick={() => { setFitnessAns(a => ({ ...a, goal: v })); setFitnessStep(2); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-teal-500 hover:bg-teal-500/5 text-left text-sm font-medium transition-colors">
                          <span className="text-xl shrink-0">{i}</span><span>{v}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setFitnessStep(0)} className="mt-4 text-xs text-foreground-dim hover:text-foreground">Cancel</button>
                  </div>
                )}

                {/* Step 2: Location */}
                {fitnessStep === 2 && (
                  <div>
                    <p className="font-semibold mb-1">Where do you work out?</p>
                    <p className="text-sm text-foreground-dim mb-4">Step 2 of 5</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Q2.map(({ v, i }) => (
                        <button key={v} onClick={() => { setFitnessAns(a => ({ ...a, location: v })); setFitnessStep(3); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-teal-500 hover:bg-teal-500/5 text-left text-sm font-medium transition-colors">
                          <span className="text-xl shrink-0">{i}</span><span>{v}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setFitnessStep(1)} className="mt-4 text-xs text-foreground-dim hover:text-foreground">← Back</button>
                  </div>
                )}

                {/* Step 3: Current fitness */}
                {fitnessStep === 3 && (
                  <div>
                    <p className="font-semibold mb-1">How active are you right now?</p>
                    <p className="text-sm text-foreground-dim mb-4">Step 3 of 5</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Q3.map(({ v, i }) => (
                        <button key={v} onClick={() => { setFitnessAns(a => ({ ...a, currentFitness: v })); setFitnessStep(4); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-teal-500 hover:bg-teal-500/5 text-left text-sm font-medium transition-colors">
                          <span className="text-xl shrink-0">{i}</span><span>{v}</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setFitnessStep(2)} className="mt-4 text-xs text-foreground-dim hover:text-foreground">← Back</button>
                  </div>
                )}

                {/* Step 4: Days per week */}
                {fitnessStep === 4 && (
                  <div>
                    <p className="font-semibold mb-1">How many days per week can you commit?</p>
                    <p className="text-sm text-foreground-dim mb-4">Step 4 of 5</p>
                    <div className="grid grid-cols-4 gap-2">
                      {Q4.map(d => (
                        <button key={d} onClick={() => { setFitnessAns(a => ({ ...a, daysPerWeek: d })); setFitnessStep(5); }}
                          className="py-4 rounded-xl border border-border hover:border-teal-500 hover:bg-teal-500/5 text-center font-semibold text-lg transition-colors">
                          {d}
                          <span className="block text-xs font-normal text-foreground-dim mt-0.5">days</span>
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setFitnessStep(3)} className="mt-4 text-xs text-foreground-dim hover:text-foreground">← Back</button>
                  </div>
                )}

                {/* Step 5: Nutrition */}
                {fitnessStep === 5 && (
                  <div>
                    <p className="font-semibold mb-1">Would you like simple nutrition tips?</p>
                    <p className="text-sm text-foreground-dim mb-4">Step 5 of 5 · Claude will add a personalised nutrition guide alongside your workout plan.</p>
                    {fitnessErr && <p className="text-sm text-red-400 mb-3">{fitnessErr}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button onClick={() => startGenerating(true)}
                        className="flex flex-col items-start px-5 py-4 rounded-xl border border-teal-500 bg-teal-500/5 hover:bg-teal-500/10 text-left transition-colors">
                        <span className="text-xl mb-1">🥗</span>
                        <span className="font-semibold text-sm text-teal-400">Yes, add nutrition tips</span>
                        <span className="text-xs text-foreground-dim mt-0.5">Includes calorie targets, food guidance, and practical tips</span>
                      </button>
                      <button onClick={() => startGenerating(false)}
                        className="flex flex-col items-start px-5 py-4 rounded-xl border border-border hover:border-teal-500/50 hover:bg-teal-500/5 text-left transition-colors">
                        <span className="text-xl mb-1">⏭️</span>
                        <span className="font-semibold text-sm">Skip for now</span>
                        <span className="text-xs text-foreground-dim mt-0.5">Workout plan only — you can always start over to add it later</span>
                      </button>
                    </div>
                    <button onClick={() => setFitnessStep(4)} className="mt-4 text-xs text-foreground-dim hover:text-foreground">← Back</button>
                  </div>
                )}
              </div>
            )}

            {/* Generating */}
            {generating && (
              <div className="rounded-2xl border border-teal-500/40 bg-surface p-12 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mx-auto mb-4" />
                <p className="font-semibold mb-1">Building your plan…</p>
                <p className="text-sm text-foreground-dim">Claude is crafting a 4-week workout plan just for you. This takes about 20 seconds.</p>
              </div>
            )}

            {/* Plan display */}
            {fitnessPlan && !generating && (
              <div>
                {/* Tabs */}
                <div className="flex gap-0 mb-5 border-b border-border">
                  <button onClick={() => setFitnessTab("workout")}
                    className={"px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " + (fitnessTab === "workout" ? "border-teal-500 text-teal-400" : "border-transparent text-foreground-dim hover:text-foreground")}>
                    Workout Plan
                  </button>
                  {nutrition && (
                    <button onClick={() => setFitnessTab("nutrition")}
                      className={"px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors " + (fitnessTab === "nutrition" ? "border-teal-500 text-teal-400" : "border-transparent text-foreground-dim hover:text-foreground")}>
                      Nutrition
                    </button>
                  )}
                </div>

                {/* ── Workout tab ── */}
                {fitnessTab === "workout" && (
                  <div>
                    {/* Summary card */}
                    <div className="rounded-2xl border border-teal-500/40 bg-surface p-5 mb-4">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Fitness Plan</p>
                          <h2 className="font-semibold">{(fitnessPlan.planContent as any)?.planTitle || "4-Week Plan"}</h2>
                          <p className="text-xs text-foreground-dim mt-0.5">{fitnessPlan.goal} · {fitnessPlan.daysPerWeek}x/week · {fitnessPlan.location}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-bold text-teal-400">{fitPct}%</p>
                          <p className="text-xs text-foreground-dim">{doneFitnessWorkouts}/{totalFitnessWorkouts} done</p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full">
                        <div className="h-1.5 rounded-full bg-teal-500 transition-all" style={{ width: fitPct + "%" }} />
                      </div>
                    </div>

                    {/* Week accordion */}
                    <div className="space-y-2 mb-5">
                      {fitnessWeeks.map((wk: any) => {
                        const isExp = fitExpWeeks.has(wk.week);
                        const wkDone = wk.workouts.filter((w: any) => completedIds.has(w.id)).length;
                        const wkTotal = wk.workouts.length;
                        const wkPct = wkTotal > 0 ? Math.round((wkDone / wkTotal) * 100) : 0;

                        return (
                          <div key={wk.week} className="rounded-2xl border border-border overflow-hidden">
                            <button onClick={() => toggleFitnessWeek(wk.week)}
                              className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface/60 transition-colors">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">Week {wk.week}</span>
                                  {wkDone === wkTotal && wkTotal > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/50 text-teal-300 font-medium">Complete</span>
                                  )}
                                </div>
                                <p className="text-xs text-foreground-dim mt-0.5">{wk.theme}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-foreground-dim">{wkDone}/{wkTotal}</span>
                                <div className="w-16 h-1.5 bg-border rounded-full hidden sm:block">
                                  <div className="h-1.5 rounded-full bg-teal-500 transition-all" style={{ width: wkPct + "%" }} />
                                </div>
                                <span className="text-foreground-dim text-sm">{isExp ? "▲" : "▼"}</span>
                              </div>
                            </button>

                            {isExp && (
                              <div className="border-t border-border/60 divide-y divide-border/40">
                                {wk.workouts.map((w: any) => {
                                  const isDone = completedIds.has(w.id);
                                  const isExpW = fitExpWorkouts.has(w.id);
                                  const colorClass = FIT_COLORS[w.type] || "bg-border/60 text-foreground-dim border-border";

                                  return (
                                    <div key={w.id}>
                                      <button onClick={() => toggleFitnessWorkout(w.id)}
                                        className={"w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-surface/40 " + (isDone ? "opacity-50" : "")}>
                                        <div className={"w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 " + (isDone ? "bg-teal-500 border-teal-500" : "border-border")}>
                                          {isDone && <span className="text-white text-xs font-bold">✓</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-2 mb-0.5">
                                            <span className={"text-xs px-2 py-0.5 rounded-full border font-medium " + colorClass}>
                                              {FIT_LABELS[w.type] || w.type}
                                            </span>
                                            <span className="text-xs text-foreground-dim">{w.day} · {w.durationMin} min</span>
                                          </div>
                                          <p className={"text-sm font-medium " + (isDone ? "line-through text-foreground-dim" : "")}>{w.title}</p>
                                        </div>
                                        <span className="text-foreground-dim text-sm shrink-0">{isExpW ? "▲" : "▼"}</span>
                                      </button>

                                      {isExpW && (
                                        <div className="px-5 pb-4 bg-surface/30">
                                          <div className="space-y-2 mb-4">
                                            {(w.exercises || []).map((ex: any, idx: number) => (
                                              <div key={idx} className="flex items-start gap-3 py-2 border-b border-border/40 last:border-0">
                                                <span className="text-xs text-foreground-dim/60 font-mono pt-0.5 shrink-0 w-5">{idx + 1}.</span>
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="text-sm font-medium">{ex.name}</span>
                                                    <span className="text-xs text-foreground-dim">{ex.sets} × {ex.reps}</span>
                                                  </div>
                                                  {ex.instructions && (
                                                    <p className="text-xs text-foreground-dim mt-0.5">{ex.instructions}</p>
                                                  )}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          {!isDone && (
                                            <button onClick={() => logFitnessWorkout(w)} disabled={loggingId === w.id}
                                              className="w-full py-2.5 rounded-xl bg-teal-500/10 border border-teal-500/40 text-teal-400 text-sm font-medium hover:bg-teal-500/20 transition-colors disabled:opacity-60">
                                              {loggingId === w.id ? "Logging…" : "Log this workout ✓"}
                                            </button>
                                          )}
                                          {isDone && (
                                            <p className="text-center text-sm text-teal-400 font-medium py-2">Workout logged ✓</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Delete plan */}
                    <div className="text-center">
                      {confirmDelFit ? (
                        <div className="inline-flex items-center gap-3">
                          <span className="text-sm text-foreground-dim">Delete this plan?</span>
                          <button onClick={deleteFitnessPlan} disabled={deletingFit}
                            className="text-sm text-red-400 hover:text-red-300 disabled:opacity-60">
                            {deletingFit ? "Deleting…" : "Yes, delete"}
                          </button>
                          <button onClick={() => setConfirmDelFit(false)} className="text-sm text-foreground-dim hover:text-foreground">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelFit(true)} className="text-xs text-foreground-dim hover:text-red-400 transition-colors">
                          Delete plan
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* ── Nutrition tab ── */}
                {fitnessTab === "nutrition" && nutrition && (
                  <div className="space-y-5">
                    {/* Daily targets */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-surface p-4 text-center">
                        <p className="text-2xl font-bold text-teal-400">{nutrition.dailyCalorieRange}</p>
                        <p className="text-xs text-foreground-dim mt-1">kcal / day</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-4 text-center">
                        <p className="text-2xl font-bold text-teal-400">{nutrition.proteinTargetG}g</p>
                        <p className="text-xs text-foreground-dim mt-1">protein / day</p>
                      </div>
                    </div>

                    {/* Tips */}
                    <div className="rounded-2xl border border-border bg-surface p-5">
                      <h3 className="font-semibold text-sm mb-3">Practical Tips</h3>
                      <ol className="space-y-2">
                        {(nutrition.tips || []).map((tip: string, i: number) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className="text-xs font-semibold text-teal-400 pt-0.5 shrink-0">{i + 1}.</span>
                            <span className="text-sm text-foreground-dim">{tip}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Focus / Limit */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border bg-surface p-4">
                        <h3 className="font-semibold text-sm mb-2 text-green-400">Focus on</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {(nutrition.focusFoods || []).map((f: string) => (
                            <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-green-900/30 text-green-300 border border-green-700/50">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border bg-surface p-4">
                        <h3 className="font-semibold text-sm mb-2 text-red-400">Limit</h3>
                        <div className="flex flex-wrap gap-1.5">
                          {(nutrition.limitFoods || []).map((f: string) => (
                            <span key={f} className="text-xs px-2.5 py-1 rounded-full bg-red-900/30 text-red-300 border border-red-700/50">{f}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Disclaimer */}
                    <div className="rounded-xl border border-border/60 bg-surface/50 p-4">
                      <p className="text-xs text-foreground-dim leading-relaxed">
                        <span className="font-medium text-foreground">Disclaimer:</span> These are general wellness guidelines generated by AI and are not a substitute for advice from a qualified dietitian or healthcare provider. Individual nutritional needs vary. Consult a professional before making significant dietary changes.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense>
      <PlanPageInner />
    </Suspense>
  );
}
