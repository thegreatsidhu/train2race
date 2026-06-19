"use client";
import { useState } from "react";

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

export function RacePlanView({ race, plan }: { race: any; plan: any }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  async function generatePlan() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/races/${race.id}/generate-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weeklyMileageKm: race.weeklyMileageKm,
          recentRaceTime: race.recentRaceTime,
          trainingDaysPerWeek: race.trainingDaysPerWeek,
          raceType: race.raceType,
          isTriathlon: race.isTriathlon,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to generate plan");
      } else {
        window.location.reload();
      }
    } catch (e: any) {
      setError(e.message || "Unknown error");
    }
    setGenerating(false);
  }

  async function toggleComplete(workoutId: string, completed: boolean) {
    setCompleting(workoutId);
    await fetch(`/api/races/workouts/${workoutId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    setCompleting(null);
    window.location.reload();
  }

  if (!plan) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="text-foreground-dim mb-4">No training plan generated yet.</p>
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <button onClick={generatePlan} disabled={generating}
          className="px-6 py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
          {generating ? "Building your plan... (this may take 30s)" : "Build AI Training Plan"}
        </button>
      </div>
    );
  }

  const weeks: Record<number, any[]> = {};
  for (const w of plan.workouts) {
    if (!weeks[w.week]) weeks[w.week] = [];
    weeks[w.week].push(w);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-sm text-foreground-dim">{plan.workouts.length} workouts across {Object.keys(weeks).length} weeks</p>
        <button onClick={generatePlan} disabled={generating}
          className="px-4 py-2 rounded-full border border-border text-sm hover:bg-surface transition-colors disabled:opacity-60">
          {generating ? "Rebuilding..." : "Rebuild plan"}
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
      <div className="space-y-6">
        {Object.entries(weeks).map(([weekNum, workouts]) => {
          const weekDone = workouts.filter(w => w.completed).length;
          const isCurrentWeek = workouts.some(w => {
            const d = new Date(w.date);
            d.setHours(0, 0, 0, 0);
            const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
            return diff >= 0 && diff < 7;
          });
          return (
            <div key={weekNum} className={`rounded-2xl border p-5 ${isCurrentWeek ? "border-signal bg-surface" : "border-border bg-surface"}`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">
                  Week {weekNum}
                  {isCurrentWeek && <span className="ml-2 text-xs bg-signal text-background px-2 py-0.5 rounded-full">Current</span>}
                </h3>
                <span className="text-xs text-foreground-dim">{weekDone}/{workouts.length} done</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                {["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(day => {
                  const workout = workouts.find(w => w.day === day);
                  if (!workout) return (
                    <div key={day} className="rounded-xl p-2 text-center">
                      <p className="text-xs text-foreground-dim">{day.slice(0,3)}</p>
                    </div>
                  );
                  const workoutDate = new Date(workout.date);
                  workoutDate.setHours(0, 0, 0, 0);
                  const isPast = workoutDate < today;
                  const colorClass = TYPE_COLORS[workout.type] || "bg-surface border border-border";
                  return (
                    <div key={day} className={`rounded-xl p-2 ${workout.completed ? "opacity-60" : ""}`}>
                      <p className="text-xs text-foreground-dim mb-1">{day.slice(0,3)}</p>
                      <div className={`rounded-lg p-2 text-xs ${colorClass}`}>
                        <p className="font-medium truncate">{workout.title}</p>
                        {workout.distanceKm && <p>{(workout.distanceKm / 1.60934).toFixed(1)} mi</p>}
                        {workout.durationMin && !workout.distanceKm && <p>{workout.durationMin} min</p>}
                      </div>
                      {(isPast || workout.completed) && (
                        <button
                          onClick={() => toggleComplete(workout.id, workout.completed)}
                          disabled={completing === workout.id}
                          className={`mt-1 w-full text-xs py-1 rounded-lg transition-colors ${workout.completed ? "bg-signal text-background" : "border border-border hover:bg-surface-raised"}`}>
                          {workout.completed ? "Done" : "Mark done"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
