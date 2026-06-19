"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogWorkoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: "run",
    title: "",
    date: new Date().toISOString().split("T")[0],
    durationMin: "",
    distanceKm: "",
    notes: "",
  });

  async function handleSubmit() {
    setLoading(true);
    await fetch("/api/activities/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    router.push("/dashboard");
  }

  return (
    <div className="max-w-lg px-8 py-10">
      <h1 className="text-2xl font-semibold mb-6">Log Workout</h1>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity type</label>
          <select className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option value="run">Run</option>
            <option value="ride">Ride</option>
            <option value="swim">Swim</option>
            <option value="strength">Strength</option>
            <option value="walk">Walk</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Title (optional)</label>
          <input className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            placeholder="e.g. Morning Run" value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Date</label>
          <input type="date" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Duration (minutes)</label>
          <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            placeholder="30" value={form.durationMin}
            onChange={e => setForm({ ...form, durationMin: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Distance (km, optional)</label>
          <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            placeholder="5.0" value={form.distanceKm}
            onChange={e => setForm({ ...form, distanceKm: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Notes (optional)</label>
          <textarea className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            rows={3} placeholder="How did it feel?"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors">
          {loading ? "Saving..." : "Save workout"}
        </button>
        <button onClick={() => router.back()}
          className="w-full py-3 rounded-full border border-border text-sm hover:bg-surface transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}
