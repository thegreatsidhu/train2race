"use client";
import { useState } from "react";

const EXP = 1.06;

function predict(refM: number, refSec: number, targetM: number): number {
  return refSec * Math.pow(targetM / refM, EXP);
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "--";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function fmtPace(totalSec: number, distM: number, perKm: boolean): string {
  const pace = totalSec / (distM / (perKm ? 1000 : 1609.34));
  if (!Number.isFinite(pace) || pace <= 0) return "--";
  const m = Math.floor(pace / 60);
  const s = Math.round(pace % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const PRESETS = [
  { label: "1 mi", m: 1609.34 },
  { label: "5K", m: 5000 },
  { label: "10K", m: 10000 },
  { label: "Half", m: 21097.5 },
  { label: "Full", m: 42195 },
];

const TARGETS = [
  { label: "1 mile", m: 1609.34 },
  { label: "5K", m: 5000 },
  { label: "8K", m: 8046.72 },
  { label: "10K", m: 10000 },
  { label: "15K", m: 15000 },
  { label: "10 miles", m: 16093.44 },
  { label: "Half marathon", m: 21097.5 },
  { label: "30K", m: 30000 },
  { label: "Marathon", m: 42195 },
  { label: "50K", m: 50000 },
];

interface Activity {
  id: string;
  title: string | null;
  type: string;
  startTime: string;
  distanceM: number;
  durationSec: number;
}

export default function PredictPage() {
  const [presetIdx, setPresetIdx] = useState<number | null>(null);
  const [customDist, setCustomDist] = useState("");
  const [customUnit, setCustomUnit] = useState<"mi" | "km">("mi");
  const [hours, setHours] = useState("");
  const [mins, setMins] = useState("");
  const [secs, setSecs] = useState("");
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loadingActs, setLoadingActs] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function togglePicker() {
    if (showPicker) { setShowPicker(false); return; }
    setShowPicker(true);
    if (activities !== null) return;
    setLoadingActs(true);
    try {
      const res = await fetch("/api/activities");
      const data = await res.json();
      setActivities(data.activities ?? []);
    } finally {
      setLoadingActs(false);
    }
  }

  function pickActivity(a: Activity) {
    setPresetIdx(null);
    setCustomUnit("mi");
    setCustomDist((a.distanceM / 1609.34).toFixed(2));
    setHours(String(Math.floor(a.durationSec / 3600)));
    setMins(String(Math.floor((a.durationSec % 3600) / 60)));
    setSecs(String(a.durationSec % 60));
    setShowPicker(false);
  }

  const refM =
    presetIdx !== null
      ? PRESETS[presetIdx].m
      : customDist
      ? parseFloat(customDist) * (customUnit === "km" ? 1000 : 1609.34)
      : NaN;

  const refSec =
    Number(hours || 0) * 3600 + Number(mins || 0) * 60 + Number(secs || 0);

  const valid = Number.isFinite(refM) && refM > 0 && refSec > 0;

  return (
    <div className="max-w-lg px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Race Time Predictor</h1>
      <p className="text-sm text-foreground-dim mb-8">
        Enter a recent performance to predict finish times at every distance.
      </p>

      {/* ── Reference performance ── */}
      <div className="rounded-2xl border border-border bg-surface p-5 mb-5">
        <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-3">
          Reference distance
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPresetIdx(i)}
              className={
                "px-3 py-1.5 rounded-full text-sm border transition-colors " +
                (presetIdx === i
                  ? "bg-signal text-background border-signal"
                  : "border-border text-foreground-dim hover:text-foreground")
              }
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPresetIdx(null)}
            className={
              "px-3 py-1.5 rounded-full text-sm border transition-colors " +
              (presetIdx === null
                ? "bg-signal text-background border-signal"
                : "border-border text-foreground-dim hover:text-foreground")
            }
          >
            Custom
          </button>
        </div>

        {presetIdx === null && (
          <div className="flex gap-2 mb-4">
            <input
              type="number"
              min="0"
              step="any"
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm"
              placeholder="e.g. 3.1"
              value={customDist}
              onChange={(e) => setCustomDist(e.target.value)}
            />
            <div className="flex rounded-xl overflow-hidden border border-border text-sm shrink-0">
              <button
                onClick={() => setCustomUnit("mi")}
                className={
                  "px-4 py-2 transition-colors " +
                  (customUnit === "mi" ? "bg-signal text-background" : "bg-surface text-foreground-dim")
                }
              >
                mi
              </button>
              <button
                onClick={() => setCustomUnit("km")}
                className={
                  "px-4 py-2 transition-colors " +
                  (customUnit === "km" ? "bg-signal text-background" : "bg-surface text-foreground-dim")
                }
              >
                km
              </button>
            </div>
          </div>
        )}

        <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-2">
          Finish time
        </p>
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm pr-8"
              placeholder="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">
              h
            </span>
          </div>
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="59"
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm pr-8"
              placeholder="25"
              value={mins}
              onChange={(e) => setMins(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">
              m
            </span>
          </div>
          <div className="relative flex-1">
            <input
              type="number"
              min="0"
              max="59"
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-sm pr-8"
              placeholder="0"
              value={secs}
              onChange={(e) => setSecs(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-foreground-dim pointer-events-none">
              s
            </span>
          </div>
        </div>

        <button
          onClick={togglePicker}
          disabled={loadingActs}
          className="text-xs text-signal hover:underline disabled:opacity-50"
        >
          {loadingActs ? "Loading…" : showPicker ? "▲ Hide recent activities" : "▼ Use a recent activity"}
        </button>

        {showPicker && activities !== null && (
          <div className="mt-2 border border-border rounded-xl overflow-hidden">
            {activities.length === 0 ? (
              <p className="text-xs text-foreground-dim px-4 py-3">No activities with distance found.</p>
            ) : (
              activities.slice(0, 10).map((a) => (
                <button
                  key={a.id}
                  onClick={() => pickActivity(a)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-raised transition-colors text-left border-b border-border/40 last:border-0"
                >
                  <span className="text-sm truncate mr-3">
                    {a.title || a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                  </span>
                  <span className="text-xs text-foreground-dim shrink-0">
                    {new Date(a.startTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    · {(a.distanceM / 1609.34).toFixed(1)} mi · {fmtTime(a.durationSec)}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Results ── */}
      {valid ? (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide">
              Predicted times
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 text-xs text-foreground-dim">
                  <th className="text-left px-5 py-2 font-medium">Distance</th>
                  <th className="text-right px-3 py-2 font-medium">Finish</th>
                  <th className="text-right px-3 py-2 font-medium">/mi</th>
                  <th className="text-right px-5 py-2 font-medium">/km</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {TARGETS.map((d) => {
                  const tSec = predict(refM, refSec, d.m);
                  const isRef = Math.abs(d.m - refM) / d.m < 0.005;
                  return (
                    <tr key={d.label} className={isRef ? "bg-signal/5" : ""}>
                      <td className={"px-5 py-3 " + (isRef ? "text-signal font-semibold" : "")}>
                        {d.label}
                      </td>
                      <td
                        className={
                          "text-right px-3 py-3 font-data " +
                          (isRef ? "text-signal font-bold" : "font-medium")
                        }
                      >
                        {fmtTime(tSec)}
                      </td>
                      <td className="text-right px-3 py-3 font-data text-xs text-foreground-dim">
                        {fmtPace(tSec, d.m, false)}
                      </td>
                      <td className="text-right px-5 py-3 font-data text-xs text-foreground-dim">
                        {fmtPace(tSec, d.m, true)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border/50">
            <p className="text-xs text-foreground-dim">
              Riegel's formula: T₂ = T₁ × (D₂ ÷ D₁)^1.06. Predictions assume flat course and equal effort.
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-foreground-dim">
            Enter a distance and finish time above to see your predictions.
          </p>
        </div>
      )}
    </div>
  );
}
