"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function EditWorkoutPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unit, setUnit] = useState("mi");
  const [swimUnit, setSwimUnit] = useState("m");
  const [form, setForm] = useState({
    type: "run",
    title: "",
    date: "",
    durationHours: "",
    durationMins: "",
    distance: "",
    notes: "",
  });

  useEffect(() => {
    fetch(`/api/activities/${id}`)
      .then(r => r.json())
      .then(data => {
        const a = data.activity;
        const d = new Date(a.startTime);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        let distance = "";
        if (a.distanceM) {
          if (a.type === "swim") {
            distance = String(Math.round(a.distanceM));
            setSwimUnit("m");
          } else {
            distance = (a.distanceM / 1609.34).toFixed(2);
          }
        }
        const totalMin = Math.round(a.durationSec / 60);
        setForm({
          type: a.type,
          title: a.title || "",
          date: dateStr,
          durationHours: String(Math.floor(totalMin / 60)),
          durationMins: String(totalMin % 60),
          distance,
          notes: a.raw?.notes || "",
        });
        setLoading(false);
      });
  }, [id]);

  const isSwim = form.type === "swim";
  const noDistance = form.type === "strength" || form.type === "other";

  async function handleSave() {
    const totalMin = Number(form.durationHours || 0) * 60 + Number(form.durationMins || 0);
    setSaving(true);
    const effectiveUnit = isSwim ? swimUnit : unit;
    const res = await fetch(`/api/activities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationMin: totalMin, unit: effectiveUnit }),
    });
    setSaving(false);
    if (res.ok) router.push("/dashboard");
    else alert("Something went wrong.");
  }

  if (loading) return <div className="px-8 py-10 text-sm text-foreground-dim">Loading...</div>;

  return (
    <div className="max-w-lg px-8 py-10">
      <h1 className="text-2xl font-semibold mb-6">Edit Workout</h1>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity type</label>
          <select className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.type} onChange={e => setForm({ ...form, type: e.target.value, distance: "" })}>
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
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Date</label>
          <input type="date" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Duration</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" min="0" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm pr-10"
                placeholder="0" value={form.durationHours}
                onChange={e => setForm({ ...form, durationHours: e.target.value })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">hr</span>
            </div>
            <div className="relative flex-1">
              <input type="number" min="0" max="59" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm pr-10"
                placeholder="30" value={form.durationMins}
                onChange={e => setForm({ ...form, durationMins: e.target.value })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">min</span>
            </div>
          </div>
        </div>
        {!noDistance && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-foreground-dim uppercase tracking-wide">Distance (optional)</label>
              {isSwim ? (
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button onClick={() => setSwimUnit("m")} className={"px-3 py-1 " + (swimUnit === "m" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>m</button>
                  <button onClick={() => setSwimUnit("yd")} className={"px-3 py-1 " + (swimUnit === "yd" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>yd</button>
                </div>
              ) : (
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button onClick={() => setUnit("mi")} className={"px-3 py-1 " + (unit === "mi" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>mi</button>
                  <button onClick={() => setUnit("km")} className={"px-3 py-1 " + (unit === "km" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>km</button>
                </div>
              )}
            </div>
            <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
              value={form.distance} onChange={e => setForm({ ...form, distance: e.target.value })} />
          </div>
        )}
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Notes (optional)</label>
          <textarea className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button onClick={handleSave} disabled={saving}
          className="w-full py-3 rounded-full bg-signal text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
          {saving ? "Saving..." : "Update workout"}
        </button>
        <button onClick={() => router.back()}
          className="w-full py-3 rounded-full border border-border text-sm hover:bg-surface transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}