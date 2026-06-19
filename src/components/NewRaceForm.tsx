"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_DISTANCES: Record<string, number> = {
  "5K": 5000,
  "10K": 10000,
  "Half Marathon": 21097.5,
  "Marathon": 42195,
  "Ultra (50K)": 50000,
  "Sprint Triathlon": 25750,
  "Olympic Triathlon": 51500,
  "70.3 Half Ironman": 113000,
  "140.6 Full Ironman": 226000,
};

const TRIATHLON_DISTANCES = ["Sprint Triathlon", "Olympic Triathlon", "70.3 Half Ironman", "140.6 Full Ironman"];

export function NewRaceForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distance, setDistance] = useState("Half Marathon");
  const [raceType, setRaceType] = useState("main");
  const [goalHours, setGoalHours] = useState("");
  const [goalMinutes, setGoalMinutes] = useState("");
  const [weeklyMileage, setWeeklyMileage] = useState("");
  const [recentRaceTime, setRecentRaceTime] = useState("");
  const [trainingDays, setTrainingDays] = useState("5");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const goalTimeSec =
      goalHours || goalMinutes
        ? parseInt(goalHours || "0") * 3600 + parseInt(goalMinutes || "0") * 60
        : undefined;
    await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceName,
        raceDate,
        distanceM: PRESET_DISTANCES[distance],
        goalTimeSec,
        raceType,
        weeklyMileageKm: weeklyMileage ? Number(weeklyMileage) : undefined,
        recentRaceTime,
        trainingDaysPerWeek: Number(trainingDays),
        isTriathlon: TRIATHLON_DISTANCES.includes(distance),
      }),
    });
    setSubmitting(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
      {step === 1 && (
        <>
          <h2 className="text-sm font-medium">Tell us about your race</h2>
          <div className="grid grid-cols-2 gap-3">
            <input required placeholder="Race name" value={raceName}
              onChange={e => setRaceName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm" />
            <input required type="date" value={raceDate}
              onChange={e => setRaceDate(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm" />
          </div>
          <select value={distance} onChange={e => setDistance(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm">
            <optgroup label="Running">
              {["5K","10K","Half Marathon","Marathon","Ultra (50K)"].map(d => <option key={d}>{d}</option>)}
            </optgroup>
            <optgroup label="Triathlon">
              {["Sprint Triathlon","Olympic Triathlon","70.3 Half Ironman","140.6 Full Ironman"].map(d => <option key={d}>{d}</option>)}
            </optgroup>
          </select>
          <select value={raceType} onChange={e => setRaceType(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm">
            <option value="main">🏆 Main race — peak for this</option>
            <option value="training">🏃 Training race — tune-up only</option>
            <option value="fun">🎉 Just for fun</option>
          </select>
          <button onClick={() => setStep(2)} disabled={!raceName || !raceDate}
            className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
            Next →
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-sm font-medium">Your goal & fitness</h2>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" min={0} placeholder="Goal hours" value={goalHours}
              onChange={e => setGoalHours(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm" />
            <input type="number" min={0} max={59} placeholder="Goal minutes" value={goalMinutes}
              onChange={e => setGoalMinutes(e.target.value)}
              className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm" />
          </div>
          <input placeholder="Current weekly mileage (km)" value={weeklyMileage}
            onChange={e => setWeeklyMileage(e.target.value)} type="number"
            className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm" />
          <input placeholder="Recent race time (e.g. 1:45 half marathon)" value={recentRaceTime}
            onChange={e => setRecentRaceTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm" />
          <div>
            <label className="text-xs text-foreground-dim mb-1 block">Training days per week: {trainingDays}</label>
            <input type="range" min={3} max={7} value={trainingDays}
              onChange={e => setTrainingDays(e.target.value)}
              className="w-full" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="px-4 py-2 rounded-full border border-border text-sm hover:bg-surface-raised transition-colors">
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
              {submitting ? "Saving..." : "Save & build plan"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
