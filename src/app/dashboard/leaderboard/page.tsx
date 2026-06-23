"use client";
import { useState, useEffect, useCallback } from "react";

const PERIODS   = [{ v: "week", l: "This week" }, { v: "month", l: "This month" }, { v: "year", l: "This year" }, { v: "all", l: "All time" }];
const METRICS   = [{ v: "distance", l: "Distance" }, { v: "duration", l: "Duration" }, { v: "count", l: "Activities" }];
const TYPES     = [{ v: "all", l: "All" }, { v: "run", l: "Run" }, { v: "bike", l: "Bike" }, { v: "swim", l: "Swim" }, { v: "walk", l: "Walk" }, { v: "strength", l: "Strength" }];
const SEXES     = [{ v: "all", l: "Any" }, { v: "male", l: "Male" }, { v: "female", l: "Female" }, { v: "other", l: "Other" }];
const AGE_GROUPS = [{ v: "all", l: "Any age" }, { v: "18-29", l: "18–29" }, { v: "30-39", l: "30–39" }, { v: "40-49", l: "40–49" }, { v: "50-59", l: "50–59" }, { v: "60+", l: "60+" }];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [period,   setPeriod]   = useState("month");
  const [metric,   setMetric]   = useState("distance");
  const [type,     setType]     = useState("all");
  const [sex,      setSex]      = useState("all");
  const [ageGroup, setAgeGroup] = useState("all");
  const [city,     setCity]     = useState("");
  const [teamId,   setTeamId]   = useState("");
  const [teams,    setTeams]    = useState<any[]>([]);
  const [entries,  setEntries]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [cityInput, setCityInput] = useState("");

  // Load user's teams for the team filter
  useEffect(() => {
    fetch("/api/teams").then(r => r.json()).then(d => setTeams(d.teams || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ period, metric, type, sex, ageGroup, city, teamId });
    const res = await fetch(`/api/leaderboard?${params}`);
    const d   = await res.json().catch(() => ({}));
    setEntries(d.entries || []);
    setLoading(false);
  }, [period, metric, type, sex, ageGroup, city, teamId]);

  useEffect(() => { load(); }, [load]);

  function formatValue(e: any) {
    if (metric === "distance") return `${e.distanceMi} mi`;
    if (metric === "duration") {
      const h = Math.floor(e.durationMin / 60);
      const m = e.durationMin % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return `${e.activityCount} activities`;
  }

  function FilterChips<T extends { v: string; l: string }>({ items, value, onChange }: { items: T[]; value: string; onChange: (v: string) => void }) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map(i => (
          <button key={i.v} onClick={() => onChange(i.v)}
            className={"px-3 py-1.5 rounded-full text-xs font-medium transition-colors " + (value === i.v ? "bg-signal text-background" : "border border-border hover:bg-surface text-foreground-dim")}>
            {i.l}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl px-4 md:px-8 py-6 md:py-10">
      <h1 className="text-2xl font-semibold mb-1">Leaderboard</h1>
      <p className="text-sm text-foreground-dim mb-6">Rankings across all Train2Race athletes.</p>

      {/* Filters */}
      <div className="space-y-4 mb-8 rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Period</p>
          <FilterChips items={PERIODS} value={period} onChange={setPeriod} />
        </div>
        <div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Metric</p>
          <FilterChips items={METRICS} value={metric} onChange={setMetric} />
        </div>
        <div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Activity type</p>
          <FilterChips items={TYPES} value={type} onChange={setType} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Sex</p>
            <FilterChips items={SEXES} value={sex} onChange={setSex} />
          </div>
          <div>
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Age group</p>
            <FilterChips items={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">City</p>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-signal"
                placeholder="e.g. Los Angeles"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setCity(cityInput)}
              />
              {cityInput !== city && (
                <button onClick={() => setCity(cityInput)} className="px-3 py-1.5 rounded-xl bg-signal text-background text-xs font-medium">Go</button>
              )}
              {city && <button onClick={() => { setCity(""); setCityInput(""); }} className="text-xs text-foreground-dim hover:text-foreground">✕</button>}
            </div>
          </div>
          <div>
            <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Team</p>
            <select
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-signal"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}>
              <option value="">All teams</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-foreground-dim text-sm">
          No athletes found for these filters yet.
          {(sex !== "all" || ageGroup !== "all" || city || teamId) && (
            <button onClick={() => { setSex("all"); setAgeGroup("all"); setCity(""); setCityInput(""); setTeamId(""); }} className="block mx-auto mt-3 text-signal hover:underline text-xs">Clear filters</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e: any) => (
            <div key={e.userId} className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3">
              <span className={"w-8 text-center text-base font-bold shrink-0 " + (e.rank === 1 ? "text-yellow-400" : e.rank === 2 ? "text-gray-400" : e.rank === 3 ? "text-amber-600" : "text-foreground-dim text-sm")}>
                {e.rank <= 3 ? MEDAL[e.rank - 1] : `#${e.rank}`}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{e.name}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground-dim mt-0.5">
                  {e.city && <span>{e.city}</span>}
                  {e.ageGroup && <span>{e.ageGroup}</span>}
                  {e.sex && e.sex !== "other" && <span className="capitalize">{e.sex}</span>}
                  {e.team && <span className="text-signal">{e.team.name}</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-sm">{formatValue(e)}</p>
                {metric !== "count" && <p className="text-xs text-foreground-dim">{e.activityCount} activities</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-xs text-foreground-dim text-center mt-6">
          Showing top {entries.length} athletes. Set your city and profile details to appear in filtered views.
        </p>
      )}
    </div>
  );
}
