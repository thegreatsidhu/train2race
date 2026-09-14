"use client";
import { useState, useEffect } from "react";

const LB_PER_KG = 2.20462;
const kgToLbs = (kg: number) => Math.round(kg * LB_PER_KG * 10) / 10;
const lbsToKg = (lbs: number) => lbs / LB_PER_KG;

interface CheckIn {
  id: string;
  weightKg: number;
  source: string;
  severity: "none" | "moderate" | "severe";
  message: string | null;
  createdAt: string;
}

interface Plan {
  id: string;
  startWeightKg: number | null;
  dailyCalorieTarget: number | null;
  weeklyLossTargetLbs: number | null;
  lastAdjustmentNote: string | null;
  createdAt: string;
  targetWeightKg?: number | null;
  targetDate?: string | null;
  paceSafety?: "safe" | "aggressive" | "unsafe" | null;
  paceSafetyMessage?: string | null;
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function WeightLossTracker({ plan, onPlanUpdate }: { plan: Plan; onPlanUpdate: (plan: Plan) => void }) {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [weightLbs, setWeightLbs] = useState("");
  const [usedSynced, setUsedSynced] = useState(false);
  const [synced, setSynced] = useState<{ weightKg: number; date: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [lastEvaluation, setLastEvaluation] = useState<{ severity: string; message: string | null } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/fitness-plan/${plan.id}/check-ins`, { signal: ac.signal })
      .then(r => r.json())
      .then(d => setCheckIns(d.checkIns || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/health/latest-weight", { signal: ac.signal })
      .then(r => r.json())
      .then(d => { if (d.weightKg != null) setSynced({ weightKg: d.weightKg, date: d.date }); })
      .catch(() => {});
    return () => ac.abort();
  }, [plan.id]);

  const latestWeightKg = checkIns[0]?.weightKg ?? plan.startWeightKg;
  const lastCheckInDate = checkIns[0]?.createdAt ?? plan.createdAt;
  const dueForCheckIn = daysSince(lastCheckInDate) >= 7;

  function useSyncedWeight() {
    if (!synced) return;
    setWeightLbs(kgToLbs(synced.weightKg).toString());
    setUsedSynced(true);
  }

  async function submitCheckIn() {
    const lbs = parseFloat(weightLbs);
    if (!lbs || isNaN(lbs)) { setError("Enter a valid weight."); return; }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/fitness-plan/${plan.id}/check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: lbsToKg(lbs), source: usedSynced ? "connected" : "manual" }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Something went wrong. Please try again.");
      } else {
        setCheckIns(prev => [d.checkIn, ...prev]);
        onPlanUpdate(d.plan);
        setLastEvaluation(d.evaluation);
        setFormOpen(false);
        setWeightLbs("");
        setUsedSynced(false);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setSubmitting(false);
  }

  return (
    <div className="rounded-2xl border border-teal-500/40 bg-surface p-5 mb-4">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-3">Weight Loss Tracking</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <p className="text-xs text-foreground-dim">Start</p>
          <p className="text-lg font-semibold">{plan.startWeightKg ? `${kgToLbs(plan.startWeightKg)} lb` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-dim">Current</p>
          <p className="text-lg font-semibold text-teal-400">{latestWeightKg ? `${kgToLbs(latestWeightKg)} lb` : "—"}</p>
        </div>
        <div>
          <p className="text-xs text-foreground-dim">Calorie target</p>
          <p className="text-lg font-semibold">{plan.dailyCalorieTarget ? `${plan.dailyCalorieTarget}` : "—"} <span className="text-xs font-normal text-foreground-dim">kcal/day</span></p>
        </div>
        <div>
          <p className="text-xs text-foreground-dim">Pace</p>
          <p className="text-lg font-semibold">~{plan.weeklyLossTargetLbs ?? 1} <span className="text-xs font-normal text-foreground-dim">lb/wk{plan.paceSafety && plan.paceSafety !== "safe" ? " (your goal)" : " (max 1-2)"}</span></p>
        </div>
        {plan.targetWeightKg != null && (
          <div>
            <p className="text-xs text-foreground-dim">Goal</p>
            <p className="text-lg font-semibold">{kgToLbs(plan.targetWeightKg)} lb {plan.targetDate ? <span className="text-xs font-normal text-foreground-dim">by {fmtDate(plan.targetDate)}</span> : null}</p>
          </div>
        )}
      </div>

      {plan.paceSafety === "unsafe" && plan.paceSafetyMessage && (
        <div className="rounded-xl border-2 border-alert/60 bg-alert/15 p-3 mb-3">
          <p className="text-sm font-semibold text-alert">⚠️ This goal isn't considered safe</p>
          <p className="text-xs text-foreground mt-1 leading-relaxed">{plan.paceSafetyMessage}</p>
        </div>
      )}
      {plan.paceSafety === "aggressive" && plan.paceSafetyMessage && (
        <div className="rounded-xl border border-amber-600/50 bg-amber-900/15 p-3 mb-3">
          <p className="text-sm font-semibold text-amber-400">This goal is faster than recommended</p>
          <p className="text-xs text-foreground-dim mt-1 leading-relaxed">{plan.paceSafetyMessage}</p>
        </div>
      )}

      {plan.lastAdjustmentNote && (
        <div className="rounded-xl border border-signal/30 bg-signal/5 p-3 mb-3">
          <p className="text-xs text-foreground leading-relaxed">
            <span className="font-medium">Plan adjusted: </span>{plan.lastAdjustmentNote}
          </p>
        </div>
      )}

      {lastEvaluation?.severity === "severe" && (
        <div className="rounded-xl border-2 border-alert/60 bg-alert/15 p-3 mb-3">
          <p className="text-sm font-semibold text-alert">⚠️ Faster than recommended</p>
          <p className="text-xs text-foreground mt-1 leading-relaxed">{lastEvaluation.message}</p>
        </div>
      )}
      {lastEvaluation?.severity === "moderate" && (
        <div className="rounded-xl border border-amber-600/50 bg-amber-900/15 p-3 mb-3">
          <p className="text-sm font-semibold text-amber-400">Heads up</p>
          <p className="text-xs text-foreground-dim mt-1 leading-relaxed">{lastEvaluation.message}</p>
        </div>
      )}
      {lastEvaluation?.severity === "none" && !lastEvaluation.message && (
        <p className="text-xs text-teal-400 mb-3">Check-in logged — right on pace ✓</p>
      )}

      {!formOpen && (
        <div className="flex items-center justify-between gap-3">
          {dueForCheckIn ? (
            <p className="text-sm font-medium">Time for your weekly check-in</p>
          ) : (
            <p className="text-xs text-foreground-dim">Next check-in in {7 - daysSince(lastCheckInDate)} day(s)</p>
          )}
          <button onClick={() => setFormOpen(true)}
            className="shrink-0 px-4 py-2 rounded-full border border-teal-500 text-teal-400 text-sm font-medium hover:bg-teal-500/10 transition-colors">
            Log this week's weight
          </button>
        </div>
      )}

      {formOpen && (
        <div className="rounded-xl border border-border bg-background p-4">
          <label className="text-xs text-foreground-dim mb-1.5 block">Weight (lbs)</label>
          <div className="flex items-center gap-2 mb-2">
            <input type="number" step="0.1" min="0" placeholder="175" value={weightLbs}
              onChange={e => { setWeightLbs(e.target.value); setUsedSynced(false); }}
              className="w-32 px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm" />
            <span className="text-sm text-foreground-dim">lbs</span>
          </div>
          {synced && (
            <button onClick={useSyncedWeight} className="text-xs text-signal hover:underline mb-3 block">
              Use synced weight: {kgToLbs(synced.weightKg)} lbs (from {fmtDate(synced.date)})
            </button>
          )}
          {error && <p className="text-xs text-red-400 mb-2">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submitCheckIn} disabled={submitting}
              className="px-4 py-2 rounded-full bg-teal-500 text-background text-sm font-medium disabled:opacity-60">
              {submitting ? "Saving…" : "Save check-in"}
            </button>
            <button onClick={() => { setFormOpen(false); setError(""); setWeightLbs(""); setUsedSynced(false); }}
              className="px-4 py-2 rounded-full border border-border text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {checkIns.length > 0 && (
        <div className="mt-4">
          <button onClick={() => setHistoryOpen(v => !v)} className="text-xs text-foreground-dim hover:text-foreground">
            {historyOpen ? "Hide" : "Show"} check-in history ({checkIns.length}) {historyOpen ? "▲" : "▼"}
          </button>
          {historyOpen && (
            <div className="mt-2 divide-y divide-border/40">
              {checkIns.map((c, i) => {
                const prevKg = checkIns[i + 1]?.weightKg ?? plan.startWeightKg;
                const deltaLbs = prevKg != null ? kgToLbs(prevKg) - kgToLbs(c.weightKg) : null;
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground-dim">{fmtDate(c.createdAt)}</span>
                    <span className="font-medium">{kgToLbs(c.weightKg)} lb</span>
                    {deltaLbs != null && (
                      <span className={deltaLbs > 0 ? "text-teal-400" : "text-foreground-dim"}>
                        {deltaLbs > 0 ? "-" : "+"}{Math.abs(deltaLbs).toFixed(1)} lb
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {!loading && checkIns.length === 0 && (
        <p className="text-xs text-foreground-dim mt-3">No check-ins yet — log your weight weekly to track progress and stay safe.</p>
      )}
    </div>
  );
}
