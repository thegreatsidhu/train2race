"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogWorkoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [unit, setUnit] = useState("mi");
  const [swimUnit, setSwimUnit] = useState("m");

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  const [form, setForm] = useState({
    type: "run",
    title: "",
    date: todayLocal(),
    durationHours: "0",
    durationMins: "0",
    distance: "",
    steps: "",
    notes: "",
  });
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState("");

  const isSwim = form.type === "swim";
  const isWalk = form.type === "walk";
  const noDistance = form.type === "strength" || form.type === "other";

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 3 - photoFiles.length;
    const toAdd = files.slice(0, remaining);
    const invalid = toAdd.find(f =>
      !["image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"].includes(f.type) ||
      f.size > 5 * 1024 * 1024
    );
    if (invalid) { setPhotoError("Photos must be JPG, PNG, or HEIC and under 5 MB each."); return; }
    setPhotoError("");
    setPhotoPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
    setPhotoFiles(prev => [...prev, ...toAdd]);
    e.target.value = "";
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(photoPreviews[i]);
    setPhotoFiles(prev => prev.filter((_, j) => j !== i));
    setPhotoPreviews(prev => prev.filter((_, j) => j !== i));
  }

  async function handleSubmit() {
    const errors: string[] = [];
    if (!form.date) errors.push("date");
    const totalMin = Number(form.durationHours || 0) * 60 + Number(form.durationMins || 0);
    if (!totalMin) errors.push("duration (hours or minutes)");
    if (errors.length) { setError("Missing required fields: " + errors.join(", ") + "."); return; }
    setError("");
    setLoading(true);
    const effectiveUnit = isSwim ? swimUnit : unit;
    let photos: string[] = [];
    if (photoFiles.length > 0) {
      const results = await Promise.all(photoFiles.map(async file => {
        const fd = new FormData();
        fd.append("file", file);
        const r = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return { error: d.error || "Upload failed" };
        return { url: d.url as string };
      }));
      const failed = results.find(r => "error" in r);
      if (failed && "error" in failed) {
        setLoading(false);
        setError("Photo upload failed: " + failed.error + ". Please try again.");
        return;
      }
      photos = results.map(r => ("url" in r ? r.url : "")).filter(Boolean);
    }
    const res = await fetch("/api/activities/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, durationMin: totalMin, unit: effectiveUnit, photos }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      router.push(data.isFirstWorkout ? "/dashboard?kudo=first" : "/dashboard");
    } else {
      setError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="max-w-lg px-8 py-10">
      <h1 className="text-2xl font-semibold mb-6">Log Workout</h1>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity type</label>
          <select className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            value={form.type} onChange={e => setForm({ ...form, type: e.target.value, distance: "", steps: "" })}>
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
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Duration</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input type="number" min="0" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm pr-10"
                value={form.durationHours}
                onChange={e => setForm({ ...form, durationHours: e.target.value })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">hr</span>
            </div>
            <div className="relative flex-1">
              <input type="number" min="0" max="59" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm pr-10"
                value={form.durationMins}
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
                  <button onClick={() => setSwimUnit("m")}
                    className={"px-3 py-1 " + (swimUnit === "m" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>m</button>
                  <button onClick={() => setSwimUnit("yd")}
                    className={"px-3 py-1 " + (swimUnit === "yd" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>yd</button>
                </div>
              ) : (
                <div className="flex rounded-lg overflow-hidden border border-border text-xs">
                  <button onClick={() => setUnit("mi")}
                    className={"px-3 py-1 " + (unit === "mi" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>mi</button>
                  <button onClick={() => setUnit("km")}
                    className={"px-3 py-1 " + (unit === "km" ? "bg-signal text-background" : "bg-surface text-foreground-dim")}>km</button>
                </div>
              )}
            </div>
            <input type="number" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
              placeholder={isSwim ? (swimUnit === "m" ? "e.g. 1500" : "e.g. 1650") : (unit === "mi" ? "e.g. 3.1" : "e.g. 5.0")}
              value={form.distance}
              onChange={e => setForm({ ...form, distance: e.target.value })} />
          </div>
        )}
        <div>
            <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Steps (optional)</label>
            <input type="number" min="0" step="1" className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
              placeholder="e.g. 8000"
              value={form.steps}
              onChange={e => setForm({ ...form, steps: e.target.value })} />
          </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Photos (optional)</label>
          {photoPreviews.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {photoPreviews.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="w-20 h-20 object-cover rounded-xl border border-border" />
                  <button type="button" onClick={() => removePhoto(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoFiles.length < 3 && (
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border bg-surface cursor-pointer hover:bg-surface-raised transition-colors text-sm text-foreground-dim">
              <span>📷</span>
              <span>Add photo{photoFiles.length > 0 ? ` (${photoFiles.length}/3)` : " (up to 3)"}</span>
              <input type="file" accept="image/jpeg,image/jpg,image/png,image/heic,image/heif" multiple className="hidden"
                onChange={handlePhotoSelect} />
            </label>
          )}
          {photoError && <p className="text-xs text-red-400 mt-1">{photoError}</p>}
        </div>
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Notes (optional)</label>
          <textarea className="w-full bg-surface border border-border rounded-xl px-4 py-2 text-sm"
            rows={3} placeholder="How did it feel?"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={handleSubmit} disabled={loading}
          className="w-full py-3 rounded-full bg-signal text-background font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
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