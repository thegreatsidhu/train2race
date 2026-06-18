"use client";

import { useState } from "react";
import type { NutritionPlan, FuelingPhase } from "@/lib/ai/nutrition";

const PHASE_COLORS: Record<string, string> = {
  "Pre-Workout": "var(--load)",
  "During Workout": "var(--signal)",
  "Post-Workout": "#7c9ef5",
};

const NUTRIENT_COLORS: Record<string, string> = {
  "Carbohydrates": "var(--load)",
  "Protein": "#7c9ef5",
  "Fluid": "var(--signal)",
  "Sodium": "#9aa3ab",
  "Potassium": "#b07cf5",
  "Magnesium": "#5ec4c9",
};

function PhaseCard({ phase }: { phase: FuelingPhase }) {
  const color = PHASE_COLORS[phase.title] ?? "var(--signal)";
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold tracking-tight" style={{ color }}>{phase.title}</h3>
          <p className="text-xs text-foreground-dim mt-0.5">{phase.timing}</p>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ background: color }} />
      </div>
      <div className="divide-y divide-border">
        {phase.items.map((item) => {
          const nColor = NUTRIENT_COLORS[item.nutrient] ?? "var(--foreground-dim)";
          return (
            <div key={item.nutrient} className="px-6 py-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: nColor }}>{item.nutrient}</span>
                <span className="font-data text-sm font-semibold">{item.amount}</span>
              </div>
              <p className="text-xs text-foreground-dim">{item.examples}</p>
            </div>
          );
        })}
      </div>
      {phase.notes && (
        <div className="px-6 py-3 bg-surface-raised border-t border-border">
          <p className="text-xs text-foreground-dim italic">{phase.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function NutritionPage() {
  const [type, setType] = useState("run");
  const [durationMin, setDurationMin] = useState("60");
  const [intensity, setIntensity] = useState("moderate");
  const [heat, setHeat] = useState("normal");
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        durationMin: parseInt(durationMin),
        intensityLabel: intensity,
        heatIndex: heat,
      }),
    });
    const data = await res.json();
    setPlan(data.plan);
    setWeightKg(data.weightKg);
    setLoading(false);
  }

  return (
    <div className="max-w-3xl px-8 py-10">
      <header className="mb-8">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-2">
          Pre · During · Post
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">Nutrition Planner</h1>
        <p className="text-foreground-dim text-sm mt-2">
          Enter your upcoming workout and get exact fueling targets for carbs, protein, fluid, and electrolytes.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-surface p-6 mb-8">
        <h2 className="text-sm font-medium mb-4">Tell me about your workout</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-foreground-dim mb-1">Activity</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
              <option value="run">Running</option>
              <option value="ride">Cycling</option>
              <option value="swim">Swimming</option>
              <option value="strength">Strength / Gym</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-foreground-dim mb-1">Duration (minutes)</label>
            <input type="number" min="10" max="600" value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs text-foreground-dim mb-1">Intensity</label>
            <select value={intensity} onChange={(e) => setIntensity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
              <option value="easy">Easy / Recovery</option>
              <option value="moderate">Moderate</option>
              <option value="hard">Hard / Threshold</option>
              <option value="race">Race Day</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-foreground-dim mb-1">Conditions</label>
            <select value={heat} onChange={(e) => setHeat(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
              <option value="normal">Normal / Cool</option>
              <option value="hot">Hot / Humid</option>
            </select>
          </div>
        </div>

        <button onClick={handleGenerate} disabled={loading}
          className="px-6 py-2.5 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
          {loading ? "Calculating…" : "Generate fueling plan"}
        </button>

        {weightKg && (
          <p className="text-xs text-foreground-dim mt-3">
            Calculated for {Math.round(weightKg * 2.20462)} lbs ·{" "}
            <a href="/dashboard/profile" className="text-signal hover:underline">Update in Profile</a>
          </p>
        )}
      </div>

      {plan && (
        <div className="space-y-6">
          {plan.raceDay && (
            <div className="rounded-xl border border-load/40 bg-load/10 px-5 py-3">
              <p className="text-sm font-medium text-load">🏁 Race day plan — nothing new on race day. Stick to what you've trained with.</p>
            </div>
          )}

          <div className="space-y-4">
            {plan.phases.map((phase) => (
              <PhaseCard key={phase.title} phase={phase} />
            ))}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6">
            <h3 className="text-sm font-medium mb-4">Daily targets on training days</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-surface-raised border border-border px-4 py-3">
                <p className="text-xs text-foreground-dim mb-1">Total protein</p>
                <p className="font-data text-xl" style={{ color: "#7c9ef5" }}>{plan.dailyProteinG}g</p>
                <p className="text-xs text-foreground-dim mt-1">Spread across 4–5 meals</p>
              </div>
              <div className="rounded-xl bg-surface-raised border border-border px-4 py-3">
                <p className="text-xs text-foreground-dim mb-1">Total water</p>
                <p className="font-data text-xl" style={{ color: "var(--signal)" }}>{plan.dailyWaterOz} oz</p>
                <p className="text-xs text-foreground-dim mt-1">Including workout losses</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-foreground-dim">
            Targets are evidence-based estimates from ACSM and sports nutrition guidelines, personalised to your weight and workout. Individual needs vary — adjust based on how you feel.
          </p>
        </div>
      )}
    </div>
  );
}