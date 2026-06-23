"use client";
import { useState, useEffect } from "react";
import type { NutritionPlan, FuelingPhase } from "@/lib/ai/nutrition";

const PHASE_COLORS: Record<string, string> = { "Pre-Workout": "var(--load)", "During Workout": "var(--signal)", "Post-Workout": "#7c9ef5" };
const NUTRIENT_COLORS: Record<string, string> = { "Carbohydrates": "var(--load)", "Protein": "#7c9ef5", "Fluid": "var(--signal)", "Sodium": "#9aa3ab", "Potassium": "#b07cf5", "Magnesium": "#5ec4c9" };

function PhaseCard({ phase }: { phase: FuelingPhase }) {
  const color = PHASE_COLORS[phase.title] ?? "var(--signal)";
  return (
    <div className="rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold" style={{ color }}>{phase.title}</h3>
          <p className="text-xs text-foreground-dim mt-0.5">{phase.timing}</p>
        </div>
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

function TimelineItem({ item, color = "var(--signal)" }: { item: any; color?: string }) {
  return (
    <div className="flex gap-4 pb-5">
      <div className="flex flex-col items-center">
        <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ background: color }} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1">
        <p className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color }}>{item.time}</p>
        <p className="text-sm mb-1">{item.description}</p>
        {item.targets && <p className="text-xs text-foreground-dim">{item.targets}</p>}
        {item.foods?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.foods.map((f: string) => <span key={f} className="text-xs px-2 py-0.5 rounded-full bg-surface border border-border">{f}</span>)}
          </div>
        )}
        {item.products?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.products.map((p: string) => <span key={p} className="text-xs px-2 py-0.5 rounded-full bg-signal/10 border border-signal/30 text-signal">{p}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

function WeightRow({ lbs, onChange, onSave, saving, saved }: {
  lbs: string; onChange: (v: string) => void; onSave: () => void; saving: boolean; saved: boolean;
}) {
  return (
    <div className="flex items-end gap-3 pt-4 mt-4 border-t border-border">
      <div className="flex-1">
        <label className="block text-xs text-foreground-dim mb-1">Your weight (lbs)</label>
        <input
          type="number" min="50" max="500"
          value={lbs}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSave()}
          placeholder="e.g. 155"
          className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm"
        />
      </div>
      <button
        onClick={onSave}
        disabled={saving || !lbs}
        className="px-4 py-2 rounded-lg bg-signal text-background text-xs font-medium disabled:opacity-50 shrink-0 mb-0.5">
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save weight"}
      </button>
    </div>
  );
}

export default function NutritionPage() {
  const [activeTab, setActiveTab] = useState<"workout" | "raceday">("workout");

  const [type, setType] = useState("run");
  const [durationMin, setDurationMin] = useState("60");
  const [intensity, setIntensity] = useState("moderate");
  const [heat, setHeat] = useState("normal");
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [weightLbs, setWeightLbs] = useState("");
  const [savingWeight, setSavingWeight] = useState(false);
  const [weightSaved, setWeightSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [races, setRaces] = useState<any[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState("");
  const [conditions, setConditions] = useState("normal");
  const [stomachSensitivity, setStomachSensitivity] = useState("normal");
  const [racePlan, setRacePlan] = useState<any>(null);
  const [raceLoading, setRaceLoading] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => {
      const w = d.user?.weightKg;
      if (w) { setWeightKg(w); setWeightLbs(String(Math.round(w * 2.20462))); }
    }).catch(() => {});
    fetch("/api/races").then(r => r.json()).then(d => {
      const up = (d.races || []).filter((r: any) => new Date(r.raceDate) > new Date());
      setRaces(up);
      if (up.length > 0) setSelectedRaceId(up[0].id);
    });
  }, []);

  async function saveWeight() {
    const lbs = parseFloat(weightLbs);
    if (!lbs || lbs < 50 || lbs > 500) return;
    const kg = lbs / 2.20462;
    setSavingWeight(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightKg: kg }),
    });
    setWeightKg(kg);
    setSavingWeight(false);
    setWeightSaved(true);
    setTimeout(() => setWeightSaved(false), 2000);
  }

  async function handleGenerate() {
    setLoading(true);
    const res = await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, durationMin: parseInt(durationMin), intensityLabel: intensity, heatIndex: heat }),
    });
    const data = await res.json();
    setPlan(data.plan);
    setWeightKg(data.weightKg);
    setLoading(false);
  }

  async function handleRaceDayPlan(force = false) {
    if (!selectedRaceId) return;
    setRaceLoading(true);
    setRacePlan(null);
    const res = await fetch("/api/nutrition/race-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raceId: selectedRaceId, conditions, stomachSensitivity, force }),
    });
    const data = await res.json();
    setRacePlan(data);
    setRaceLoading(false);
  }

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-2">Fueling</p>
        <h1 className="text-3xl font-semibold tracking-tight">Nutrition</h1>
      </header>

      <div className="flex gap-2 mb-8">
        {([{ id: "workout", label: "Workout Fueling" }, { id: "raceday", label: "🏁 Race Day Plan" }] as const).map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (activeTab === tab.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workout fueling tab */}
      {activeTab === "workout" && (
        <>
          <div className="rounded-2xl border border-border bg-surface p-6 mb-8">
            <h2 className="text-sm font-medium mb-4">Tell me about your workout</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-foreground-dim mb-1">Activity</label>
                <select value={type} onChange={e => setType(e.target.value)}
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
                <input type="number" min="10" max="600" value={durationMin} onChange={e => setDurationMin(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs text-foreground-dim mb-1">Intensity</label>
                <select value={intensity} onChange={e => setIntensity(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
                  <option value="easy">Easy / Recovery</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard / Threshold</option>
                  <option value="race">Race Day</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-foreground-dim mb-1">Conditions</label>
                <select value={heat} onChange={e => setHeat(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
                  <option value="normal">Normal / Cool</option>
                  <option value="hot">Hot / Humid</option>
                </select>
              </div>
            </div>

            <WeightRow
              lbs={weightLbs} onChange={v => { setWeightLbs(v); setWeightSaved(false); }}
              onSave={saveWeight} saving={savingWeight} saved={weightSaved}
            />

            <button onClick={handleGenerate} disabled={loading}
              className="mt-5 px-6 py-2.5 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
              {loading ? "Calculating…" : "Generate fueling plan"}
            </button>
          </div>

          {plan && (
            <div className="space-y-6">
              {plan.raceDay && (
                <div className="rounded-xl border border-load/40 bg-load/10 px-5 py-3">
                  <p className="text-sm font-medium text-load">🏁 Race day — nothing new on race day. Stick to what you've trained with.</p>
                </div>
              )}
              <div className="space-y-4">
                {plan.phases.map(phase => <PhaseCard key={phase.title} phase={phase} />)}
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
              {weightKg && (
                <p className="text-xs text-foreground-dim">
                  Calculated for {Math.round(weightKg * 2.20462)} lbs · targets are evidence-based estimates from ACSM guidelines. Adjust based on how you feel.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Race day tab */}
      {activeTab === "raceday" && (
        <>
          <div className="rounded-2xl border border-border bg-surface p-6 mb-8">
            <h2 className="text-sm font-medium mb-1">Race Day Nutrition Plan</h2>
            <p className="text-xs text-foreground-dim mb-5">Personalized timeline from day-before carb loading through post-race recovery.</p>

            {races.length === 0 ? (
              <div className="rounded-xl bg-surface-raised border border-border p-4">
                <p className="text-sm text-foreground-dim">No upcoming races found.</p>
                <a href="/dashboard/races" className="text-sm text-signal hover:underline mt-1 block">Add a race →</a>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-foreground-dim mb-1">Select race</label>
                  <select value={selectedRaceId} onChange={e => setSelectedRaceId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
                    {races.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.raceName} · {new Date(r.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-foreground-dim mb-1">Race conditions</label>
                    <select value={conditions} onChange={e => setConditions(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
                      <option value="normal temperature">Normal / Cool</option>
                      <option value="hot and humid">Hot & Humid</option>
                      <option value="cold">Cold weather</option>
                      <option value="altitude">High altitude</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground-dim mb-1">Stomach sensitivity</label>
                    <select value={stomachSensitivity} onChange={e => setStomachSensitivity(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm">
                      <option value="normal">Normal</option>
                      <option value="sensitive - prone to GI issues">Sensitive / GI issues</option>
                      <option value="very sensitive - minimal intake works best">Very sensitive</option>
                    </select>
                  </div>
                </div>

                <WeightRow
                  lbs={weightLbs} onChange={v => { setWeightLbs(v); setWeightSaved(false); }}
                  onSave={saveWeight} saving={savingWeight} saved={weightSaved}
                />

                <button onClick={() => handleRaceDayPlan(false)} disabled={raceLoading || !selectedRaceId}
                  className="w-full py-2.5 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
                  {raceLoading ? "Building your plan..." : "Generate race day plan"}
                </button>
              </div>
            )}
          </div>

          {racePlan?.plan && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-signal/30 bg-signal/5 p-5">
                <p className="text-xs text-signal uppercase tracking-wide font-medium mb-2">Strategy</p>
                <p className="text-sm leading-relaxed">{racePlan.plan.summary}</p>
              </div>

              <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold">Day Before</h3></div>
                <div className="p-6">
                  {racePlan.plan.dayBefore.items.map((item: any) => <TimelineItem key={item.time} item={item} color="var(--load)" />)}
                  {racePlan.plan.dayBefore.keyTip && (
                    <div className="mt-3 rounded-xl bg-surface-raised border border-border px-4 py-3">
                      <p className="text-xs text-foreground-dim">💡 {racePlan.plan.dayBefore.keyTip}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold">Race Morning</h3></div>
                <div className="p-6">{racePlan.plan.raceDay.preRace.map((item: any) => <TimelineItem key={item.time} item={item} color="var(--load)" />)}</div>
              </div>

              <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold">During the Race</h3></div>
                <div className="p-6">{racePlan.plan.raceDay.duringRace.map((item: any) => <TimelineItem key={item.time} item={item} color="var(--signal)" />)}</div>
              </div>

              <div className="rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="px-6 py-4 border-b border-border"><h3 className="font-semibold">Post Race Recovery</h3></div>
                <div className="p-6">{racePlan.plan.raceDay.postRace.map((item: any) => <TimelineItem key={item.time} item={item} color="#7c9ef5" />)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <h3 className="text-sm font-medium mb-3">Key rules</h3>
                  <ul className="space-y-2">
                    {racePlan.plan.keyRules.map((r: string) => (
                      <li key={r} className="flex gap-2 text-sm"><span className="text-signal shrink-0">✓</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <h3 className="text-sm font-medium mb-3">What to avoid</h3>
                  <ul className="space-y-2">
                    {racePlan.plan.whatToAvoid.map((r: string) => (
                      <li key={r} className="flex gap-2 text-sm"><span className="text-red-400 shrink-0">✕</span><span>{r}</span></li>
                    ))}
                  </ul>
                </div>
              </div>

              <p className="text-xs text-foreground-dim">
                {racePlan.cached ? "Loaded from cache — " : "AI-generated — "}
                based on {Math.round(racePlan.weightKg * 2.20462)} lbs.
                {racePlan.cached
                  ? <> <button onClick={() => handleRaceDayPlan(true)} className="text-signal hover:underline">Regenerate</button></>
                  : " Individual needs vary — adjust based on training experience."
                }
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
