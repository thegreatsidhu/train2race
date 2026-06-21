"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const TYPE_COLORS: Record<string, string> = {
  easy_run: "bg-green-900 text-green-300",
  tempo: "bg-yellow-900 text-yellow-300",
  intervals: "bg-red-900 text-red-300",
  long_run: "bg-blue-900 text-blue-300",
  rest: "bg-surface text-foreground-dim border border-border",
  cross_train: "bg-purple-900 text-purple-300",
  swim: "bg-cyan-900 text-cyan-300",
  bike: "bg-orange-900 text-orange-300",
  brick: "bg-pink-900 text-pink-300",
  race: "bg-signal text-background",
};
const EFFORT_LABELS: Record<number, string> = { 1:"Very easy",2:"Easy",3:"Moderate",4:"Comfortably hard",5:"Hard",6:"Very hard",7:"Max effort" };
const FEEL_OPTIONS = [{ value:"great",label:"Felt great" },{ value:"good",label:"Felt good" },{ value:"ok",label:"Just ok" },{ value:"tired",label:"Felt tired" },{ value:"rough",label:"Rough one" }];

function WorkoutModal({ workout, onClose, onLogged, onMoved }: { workout: any; onClose: () => void; onLogged: () => void; onMoved?: () => void; }) {
  const [logging, setLogging] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [moving, setMoving] = useState(false);
  const [moveDate, setMoveDate] = useState("");
  const [showMove, setShowMove] = useState(false);
  const [form, setForm] = useState({ feel: "", effort: 3, actualDistanceMi: workout.distanceKm ? (workout.distanceKm/1.60934).toFixed(2) : "", actualDurationMin: workout.durationMin ? String(workout.durationMin) : "", notes: "" });

  async function handleMove() {
    if (!moveDate) return;
    setMoving(true);
    await fetch("/api/races/workouts/" + workout.id + "/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newDate: moveDate }) });
    setMoving(false); setShowMove(false); onMoved?.(); onClose();
  }

  async function handleLog() {
    setLogging(true);
    await fetch("/api/races/workouts/" + workout.id + "/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setLogging(false); setSubmitted(true);
    setTimeout(() => { onLogged(); onClose(); }, 800);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + (TYPE_COLORS[workout.type] || "bg-surface border border-border text-foreground-dim")}>{workout.type.replace(/_/g, " ")}</span>
            <h2 className="text-lg font-semibold mt-2">{workout.title}</h2>
            <p className="text-xs text-foreground-dim mt-0.5">{workout.day} - Week {workout.week}{workout.distanceKm ? " - " + (workout.distanceKm/1.60934).toFixed(1) + " mi planned" : ""}{workout.durationMin && !workout.distanceKm ? " - " + workout.durationMin + " min planned" : ""}</p>
          </div>
          <button onClick={onClose} className="text-foreground-dim hover:text-foreground text-xl leading-none ml-4">x</button>
        </div>
        <div className="rounded-xl bg-surface border border-border p-3 mb-4">
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Coach notes</p>
          <p className="text-sm leading-relaxed">{workout.description}</p>
        </div>
        {!workout.completed && (
          <div className="mb-4 border-t border-border pt-4">
            {!showMove ? (
              <button onClick={() => setShowMove(true)} className="w-full mt-2 py-2 rounded-full border border-signal text-signal text-sm font-medium hover:bg-signal hover:text-background transition-colors">Move to a different day</button>
            ) : (
              <div className="rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-foreground-dim mb-2">Pick a new date:</p>
                <div className="flex gap-2 flex-wrap">
                  <input type="date" value={moveDate} onChange={e => setMoveDate(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-sm outline-none focus:border-signal"/>
                  <button onClick={handleMove} disabled={moving||!moveDate} className="px-3 py-1.5 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-60">{moving ? "Moving..." : "Move"}</button>
                  <button onClick={() => setShowMove(false)} className="text-xs text-foreground-dim px-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
        {workout.completed ? (
          <p className="text-sm text-signal text-center font-medium py-2">Logged to your activity feed</p>
        ) : (
          <>
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Log this workout</p>
            <div className="mb-4">
              <label className="text-xs text-foreground-dim mb-2 block">How did it feel?</label>
              <div className="flex flex-wrap gap-2">
                {FEEL_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setForm({...form, feel: opt.value})} className={"text-xs px-3 py-1.5 rounded-full border transition-colors " + (form.feel===opt.value ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>{opt.label}</button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-foreground-dim mb-1 block">Effort (RPE): {form.effort} - {EFFORT_LABELS[form.effort]}</label>
              <input type="range" min={1} max={7} value={form.effort} onChange={e => setForm({...form, effort: Number(e.target.value)})} className="w-full accent-signal"/>
              <div className="flex justify-between text-xs text-foreground-dim mt-0.5"><span>Easy</span><span>Max</span></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="text-xs text-foreground-dim mb-1 block">Actual distance (mi)</label><input type="number" step="0.1" placeholder="e.g. 6.2" value={form.actualDistanceMi} onChange={e => setForm({...form, actualDistanceMi: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal"/></div>
              <div><label className="text-xs text-foreground-dim mb-1 block">Actual duration (min)</label><input type="number" placeholder="e.g. 45" value={form.actualDurationMin} onChange={e => setForm({...form, actualDurationMin: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal"/></div>
            </div>
            <div className="mb-5">
              <label className="text-xs text-foreground-dim mb-1 block">Notes (optional)</label>
              <textarea rows={2} placeholder="Anything to remember..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal resize-none"/>
            </div>
            <button onClick={handleLog} disabled={logging||submitted} className="w-full py-3 rounded-full bg-signal text-background font-medium text-sm hover:bg-signal-dim transition-colors disabled:opacity-60">{submitted ? "Logged!" : logging ? "Saving..." : "Log workout & mark done"}</button>
          </>
        )}
      </div>
    </div>
  );
}

function RebuildModal({ race, onClose, onRebuilt, isFirstBuild = false }: { race: any; onClose: () => void; onRebuilt: () => void; isFirstBuild?: boolean; }) {
  const [step, setStep] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [form, setForm] = useState({ currentWeeklyMileage: race.weeklyMileageKm ? (race.weeklyMileageKm/1.60934).toFixed(0) : "", trainingDaysPerWeek: race.trainingDaysPerWeek ? String(race.trainingDaysPerWeek) : "5", hardDays: [] as string[], longRunDay: "Saturday", recentRaceTime: race.recentRaceTime||"", injuryConcerns: "", fitnessNotes: "", prioritize: "balanced" });
  const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  function toggleHardDay(day: string) { setForm(f => ({...f, hardDays: f.hardDays.includes(day) ? f.hardDays.filter(d=>d!==day) : [...f.hardDays, day]})); }

  async function handleRebuild() {
    setGenerating(true); setError(null);
    try {
      const payload = { weeklyMileageKm: form.currentWeeklyMileage ? Number(form.currentWeeklyMileage)*1.60934 : race.weeklyMileageKm, recentRaceTime: form.recentRaceTime, trainingDaysPerWeek: Number(form.trainingDaysPerWeek), raceType: race.raceType, isTriathlon: race.isTriathlon, hardDays: form.hardDays, longRunDay: form.longRunDay, injuryConcerns: form.injuryConcerns, fitnessNotes: form.fitnessNotes, prioritize: form.prioritize };
      const check = await fetch("/api/races/" + race.id + "/generate-plan", { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(8000), body: JSON.stringify(payload) }).catch(() => null);
      if (check && !check.ok) { const data = await check.json(); setError(data.error || "Failed to generate plan"); setGenerating(false); return; }
      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        try { const status = await fetch("/api/races/" + race.id + "/plan-status"); if (!status.ok) { clearInterval(poll); setError("Plan generation failed."); setGenerating(false); return; } const data = await status.json(); if (data.ready) { clearInterval(poll); onRebuilt(); onClose(); } } catch {}
        if (attempts > 25) { clearInterval(poll); setError("Taking longer than expected. Try refreshing."); setGenerating(false); }
      }, 3000);
    } catch (e: any) { setError(e.message||"Unknown error"); setGenerating(false); }
  }

  return (
    <div className={isFirstBuild ? "w-full" : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"} onClick={e => { if (!isFirstBuild && e.target===e.currentTarget && !generating) onClose(); }}>
      <div className={isFirstBuild ? "w-full rounded-2xl border border-border bg-surface p-6" : "w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-xl"}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">{isFirstBuild ? "Build your training plan" : "Rebuild training plan"}</h2>
            <p className="text-xs text-foreground-dim mt-0.5">Step {step} of 3</p>
          </div>
          {!generating && !isFirstBuild && <button onClick={onClose} className="text-foreground-dim hover:text-foreground text-xl leading-none">x</button>}
        </div>
        {isFirstBuild && step===1 && (
          <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 mb-4 flex items-center justify-between">
            <p className="text-xs text-foreground-dim">Just want to track this race without a plan?</p>
            <button onClick={onRebuilt} className="text-xs text-signal hover:underline shrink-0 ml-4">Skip for now</button>
          </div>
        )}
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        {step===1 && (
          <div className="space-y-4">
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Current weekly mileage (miles)</label><input type="number" placeholder="e.g. 30" value={form.currentWeeklyMileage} onChange={e=>setForm({...form,currentWeeklyMileage:e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal"/></div>
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Recent race time (optional)</label><input placeholder="e.g. 1:52 half marathon" value={form.recentRaceTime} onChange={e=>setForm({...form,recentRaceTime:e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal"/></div>
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Training days per week: {form.trainingDaysPerWeek}</label><input type="range" min={3} max={7} value={form.trainingDaysPerWeek} onChange={e=>setForm({...form,trainingDaysPerWeek:e.target.value})} className="w-full accent-signal"/><div className="flex justify-between text-xs text-foreground-dim"><span>3 days</span><span>7 days</span></div></div>
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Current fitness notes</label><textarea rows={2} placeholder="e.g. Coming off a break, feeling strong..." value={form.fitnessNotes} onChange={e=>setForm({...form,fitnessNotes:e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal resize-none"/></div>
            <button onClick={()=>setStep(2)} className="w-full py-2.5 rounded-full bg-signal text-background text-sm font-medium">Next</button>
          </div>
        )}
        {step===2 && (
          <div className="space-y-4">
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Hard workout days (optional)</label><div className="flex flex-wrap gap-2">{DAYS.map(day=><button key={day} onClick={()=>toggleHardDay(day)} className={"text-xs px-3 py-1.5 rounded-full border transition-colors "+(form.hardDays.includes(day)?"bg-signal text-background border-signal":"border-border hover:bg-surface")}>{day.slice(0,3)}</button>)}</div></div>
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Preferred long run day</label><select value={form.longRunDay} onChange={e=>setForm({...form,longRunDay:e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal">{DAYS.map(d=><option key={d}>{d}</option>)}</select></div>
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Plan priority</label><div className="grid grid-cols-3 gap-2">{[{value:"balanced",label:"Balanced"},{value:"speed",label:"Speed"},{value:"endurance",label:"Endurance"}].map(opt=><button key={opt.value} onClick={()=>setForm({...form,prioritize:opt.value})} className={"text-xs px-3 py-2 rounded-xl border transition-colors "+(form.prioritize===opt.value?"bg-signal text-background border-signal":"border-border hover:bg-surface")}>{opt.label}</button>)}</div></div>
            <div className="flex gap-3"><button onClick={()=>setStep(1)} className="flex-1 py-2.5 rounded-full border border-border text-sm">Back</button><button onClick={()=>setStep(3)} className="flex-1 py-2.5 rounded-full bg-signal text-background text-sm font-medium">Next</button></div>
          </div>
        )}
        {step===3 && (
          <div className="space-y-4">
            <div><label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Injury concerns or limitations?</label><textarea rows={3} placeholder="e.g. Tight IT band, no back-to-back hard days..." value={form.injuryConcerns} onChange={e=>setForm({...form,injuryConcerns:e.target.value})} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal resize-none"/></div>
            <div className="rounded-xl bg-surface border border-border p-3"><p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">Plan summary</p><p className="text-sm">{form.currentWeeklyMileage||"?"} mi/week - {form.trainingDaysPerWeek} days - {form.prioritize}{form.longRunDay?" - Long run "+form.longRunDay:""}{form.hardDays.length>0?" - Hard: "+form.hardDays.map(d=>d.slice(0,3)).join(", "):""}</p></div>
            <div className="flex gap-3"><button onClick={()=>setStep(2)} disabled={generating} className="flex-1 py-2.5 rounded-full border border-border text-sm disabled:opacity-60">Back</button><button onClick={handleRebuild} disabled={generating} className="flex-1 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{generating ? "Building... (30s)" : "Build plan"}</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function RacePlanView({ race, plan }: { race: any; plan: any }) {
  const router = useRouter();
  const [completing, setCompleting] = useState<string|null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<any|null>(null);
  const [showRebuild, setShowRebuild] = useState(false);

  if (!plan) {
    return (
      <div>
        <RebuildModal race={race} onClose={()=>{}} onRebuilt={()=>router.refresh()} isFirstBuild/>
      </div>
    );
  }

  const weeks: Record<number, any[]> = {};
  for (const w of plan.workouts) { if (!weeks[w.week]) weeks[w.week] = []; weeks[w.week].push(w); }
  const today = new Date(); today.setHours(0,0,0,0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-foreground-dim">{plan.workouts.length} workouts across {Object.keys(weeks).length} weeks</p>
        <button onClick={()=>setShowRebuild(true)} className="px-4 py-2 rounded-full border border-border text-sm hover:bg-surface transition-colors">Rebuild plan</button>
      </div>

      <div className="space-y-6">
        {Object.entries(weeks).map(([weekNum, workouts]) => {
          const weekDone = workouts.filter(w=>w.completed).length;
          const isCurrentWeek = workouts.some(w => { const d=new Date(w.date); d.setHours(0,0,0,0); const diff=(d.getTime()-today.getTime())/(1000*60*60*24); return diff>=0&&diff<7; });
          return (
            <div key={weekNum} className={"rounded-2xl border p-5 "+(isCurrentWeek?"border-signal bg-surface":"border-border bg-surface")}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Week {weekNum}{isCurrentWeek&&<span className="ml-2 text-xs bg-signal text-background px-2 py-0.5 rounded-full">Current</span>}</h3>
                <span className="text-xs text-foreground-dim">{weekDone}/{workouts.length} done</span>
              </div>
              <div className="hidden md:grid md:grid-cols-7 gap-2">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => {
                  const workout = workouts.find(w=>w.day===day);
                  if (!workout) return <div key={day} className="rounded-xl p-2 text-center"><p className="text-xs text-foreground-dim">{day.slice(0,3)}</p></div>;
                  const workoutDate = new Date(workout.date); workoutDate.setHours(0,0,0,0);
                  const isPast = workoutDate < today;
                  const colorClass = TYPE_COLORS[workout.type]||"bg-surface border border-border";
                  return (
                    <div key={day} className={"rounded-xl p-2 "+(workout.completed?"opacity-60":"")}>
                      <p className="text-xs text-foreground-dim mb-1">{day.slice(0,3)}</p>
                      <button onClick={()=>setSelectedWorkout(workout)} className={"w-full text-left rounded-lg p-2 text-xs "+colorClass+" hover:opacity-80 transition-opacity"}>
                        <p className="font-medium truncate">{workout.title}</p>
                        {workout.distanceKm&&<p>{(workout.distanceKm/1.60934).toFixed(1)} mi</p>}
                        {workout.durationMin&&!workout.distanceKm&&<p>{workout.durationMin} min</p>}
                      </button>
                      {workout.completed?<div className="mt-1 w-full text-xs py-1 rounded-lg text-center bg-signal text-background">Done</div>:isPast?<button onClick={()=>setSelectedWorkout(workout)} className="mt-1 w-full text-xs py-1 rounded-lg border border-border hover:bg-surface-raised transition-colors">Log it</button>:null}
                    </div>
                  );
                })}
              </div>
              <div className="md:hidden space-y-2">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => {
                  const workout = workouts.find(w=>w.day===day);
                  if (!workout) return null;
                  const workoutDate = new Date(workout.date); workoutDate.setHours(0,0,0,0);
                  const isPast = workoutDate < today;
                  const colorClass = TYPE_COLORS[workout.type]||"bg-surface border border-border";
                  const isToday = workoutDate.getTime()===today.getTime();
                  return (
                    <div key={day} className={"flex items-center gap-3 "+(workout.completed?"opacity-60":"")}>
                      <div className="w-10 shrink-0 text-center"><p className={"text-xs font-medium "+(isToday?"text-signal":"text-foreground-dim")}>{day.slice(0,3)}</p></div>
                      <button onClick={()=>setSelectedWorkout(workout)} className={"flex-1 text-left rounded-xl px-3 py-2.5 text-xs "+colorClass+" hover:opacity-80 transition-opacity"}>
                        <div className="flex items-center justify-between gap-2"><p className="font-medium">{workout.title}</p><p className="shrink-0 opacity-75">{workout.distanceKm?(workout.distanceKm/1.60934).toFixed(1)+"mi":workout.durationMin?workout.durationMin+"min":""}</p></div>
                      </button>
                      {workout.completed?<span className="text-xs text-signal shrink-0">Done</span>:isPast?<button onClick={()=>setSelectedWorkout(workout)} className="text-xs text-foreground-dim hover:text-foreground shrink-0 border border-border rounded-lg px-2 py-1">Log</button>:null}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedWorkout&&<WorkoutModal workout={selectedWorkout} onClose={()=>setSelectedWorkout(null)} onLogged={()=>{setSelectedWorkout(null);router.refresh();}} onMoved={()=>{setSelectedWorkout(null);router.refresh();}}/>}
      {showRebuild&&<RebuildModal race={race} onClose={()=>setShowRebuild(false)} onRebuilt={()=>{setShowRebuild(false);router.refresh();}}/>}
    </div>
  );
}