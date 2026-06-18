"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PRESET_DISTANCES: Record<string, number> = {
  "5K": 5000,
  "10K": 10000,
  "Half marathon": 21097.5,
  Marathon: 42195,
};

export function NewRaceForm() {
  const router = useRouter();
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [distance, setDistance] = useState("Half marathon");
  const [goalHours, setGoalHours] = useState("");
  const [goalMinutes, setGoalMinutes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const goalTimeSec =
      goalHours || goalMinutes
        ? parseInt(goalHours || "0", 10) * 3600 + parseInt(goalMinutes || "0", 10) * 60
        : undefined;

    await fetch("/api/races", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raceName,
        raceDate,
        distanceM: PRESET_DISTANCES[distance],
        goalTimeSec,
      }),
    });

    setSubmitting(false);
    setRaceName("");
    setRaceDate("");
    setGoalHours("");
    setGoalMinutes("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-surface p-5 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          placeholder="Race name"
          value={raceName}
          onChange={(e) => setRaceName(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm"
        />
        <input
          required
          type="date"
          value={raceDate}
          onChange={(e) => setRaceDate(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <select
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm"
        >
          {Object.keys(PRESET_DISTANCES).map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Goal hrs"
          value={goalHours}
          onChange={(e) => setGoalHours(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm"
        />
        <input
          type="number"
          min={0}
          max={59}
          placeholder="Goal min"
          value={goalMinutes}
          onChange={(e) => setGoalMinutes(e.target.value)}
          className="px-3 py-2 rounded-lg bg-surface-raised border border-border outline-none focus:border-signal text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60"
      >
        {submitting ? "Adding…" : "Add race"}
      </button>
    </form>
  );
}
