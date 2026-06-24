"use client";
import { useState, useEffect, useCallback, useRef } from "react";

const PERIODS    = [{ v: "week", l: "This week" }, { v: "month", l: "This month" }, { v: "year", l: "This year" }, { v: "all", l: "All time" }];
const METRICS    = [{ v: "distance", l: "Distance" }, { v: "duration", l: "Duration" }, { v: "count", l: "Activities" }];
const TYPES      = [{ v: "all", l: "All" }, { v: "run", l: "Run" }, { v: "bike", l: "Bike" }, { v: "swim", l: "Swim" }, { v: "walk", l: "Walk" }, { v: "strength", l: "Strength" }];
const SEXES      = [{ v: "all", l: "Any" }, { v: "male", l: "Male" }, { v: "female", l: "Female" }, { v: "other", l: "Other" }];
const AGE_GROUPS = [{ v: "all", l: "Any age" }, { v: "18-29", l: "18–29" }, { v: "30-39", l: "30–39" }, { v: "40-49", l: "40–49" }, { v: "50-59", l: "50–59" }, { v: "60+", l: "60+" }];
const MEDAL = ["🥇", "🥈", "🥉"];

function Chips({ items, value, onChange }: { items: { v: string; l: string }[]; value: string; onChange: (v: string) => void }) {
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

export default function LeaderboardPage() {
  const [period,    setPeriod]    = useState("month");
  const [metric,    setMetric]    = useState("distance");
  const [type,      setType]      = useState("all");
  const [sex,       setSex]       = useState("all");
  const [ageGroup,  setAgeGroup]  = useState("all");
  const [city,      setCity]      = useState("");
  const [cityInput, setCityInput] = useState("");
  const [teamId,    setTeamId]    = useState("");
  const [raceId,    setRaceId]    = useState("");

  const [teams,          setTeams]          = useState<any[]>([]);
  const [races,          setRaces]          = useState<any[]>([]);
  const [raceSearch,     setRaceSearch]     = useState("");
  const [raceDropdown,   setRaceDropdown]   = useState(false);
  const [selectedRace,   setSelectedRace]   = useState<any>(null);
  const [adminTeams,     setAdminTeams]     = useState<any[]>([]);
  const [entries,        setEntries]        = useState<any[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [apiError,       setApiError]       = useState("");
  const raceRef = useRef<HTMLDivElement>(null);

  // Invite state
  const [inviting,    setInviting]    = useState<{ userId: string; name: string } | null>(null);
  const [addingTo,    setAddingTo]    = useState<string | null>(null); // teamId being added to
  const [addedMsg,    setAddedMsg]    = useState<string>("");
  const inviteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/teams").then(r => r.json()).then(d => {
      const t = d.teams || [];
      setTeams(t);
      setAdminTeams(t.filter((tm: any) => tm.members?.[0]?.role === "admin" || tm.isAdmin));
    }).catch(() => {});
    fetch("/api/major-races").then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (inviteRef.current && !inviteRef.current.contains(e.target as Node)) setInviting(null);
      if (raceRef.current && !raceRef.current.contains(e.target as Node)) setRaceDropdown(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setApiError("");
    const params = new URLSearchParams({ period, metric, type, sex, ageGroup, city, teamId, raceId });
    const res = await fetch(`/api/leaderboard?${params}`);
    const d   = await res.json().catch(() => ({}));
    if (!res.ok) setApiError(d.error || `Error ${res.status}`);
    setEntries(d.entries || []);
    setLoading(false);
  }, [period, metric, type, sex, ageGroup, city, teamId, raceId]);

  useEffect(() => { load(); }, [load]);

  async function inviteToTeam(targetUserId: string, tId: string) {
    setAddingTo(tId);
    const res = await fetch(`/api/teams/${tId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId }),
    });
    const d = await res.json().catch(() => ({}));
    setAddingTo(null);
    setInviting(null);
    if (res.ok) setAddedMsg(`Invitation sent!`);
    else if (d.alreadyMember) setAddedMsg("Already a member of that team.");
    else if (d.alreadyInvited) setAddedMsg("Invitation already pending.");
    else setAddedMsg(d.error || "Failed to invite.");
    setTimeout(() => setAddedMsg(""), 3000);
  }

  function formatValue(e: any) {
    if (metric === "distance") return `${e.distanceMi} mi`;
    if (metric === "duration") {
      const h = Math.floor(e.durationMin / 60), m = e.durationMin % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    }
    return `${e.activityCount} activities`;
  }

  const activeFilters = [sex !== "all", ageGroup !== "all", city, teamId, raceId].filter(Boolean).length;

  return (
    <div className="max-w-2xl px-4 md:px-8 py-6 md:py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        {addedMsg && <span className="text-xs text-signal bg-signal/10 border border-signal/20 px-3 py-1 rounded-full">{addedMsg}</span>}
      </div>
      <p className="text-sm text-foreground-dim mb-6">Rankings across all Train2Race athletes.</p>

      {/* Core filters */}
      <div className="space-y-4 mb-6 rounded-2xl border border-border bg-surface p-5">
        <div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Period</p>
          <Chips items={PERIODS} value={period} onChange={setPeriod} />
        </div>
        <div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Metric</p>
          <Chips items={METRICS} value={metric} onChange={setMetric} />
        </div>
        <div>
          <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">Activity type</p>
          <Chips items={TYPES} value={type} onChange={setType} />
        </div>
      </div>

      {/* Advanced filters (collapsible-style grid) */}
      <div className="space-y-4 mb-8 rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs text-foreground-dim uppercase tracking-wide">Filters{activeFilters > 0 ? ` · ${activeFilters} active` : ""}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-foreground-dim mb-2">Sex</p>
            <Chips items={SEXES} value={sex} onChange={setSex} />
          </div>
          <div>
            <p className="text-xs text-foreground-dim mb-2">Age group</p>
            <Chips items={AGE_GROUPS} value={ageGroup} onChange={setAgeGroup} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-foreground-dim mb-2">City</p>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-signal"
                placeholder="e.g. Los Angeles"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && setCity(cityInput)}
              />
              {cityInput !== city
                ? <button onClick={() => setCity(cityInput)} className="px-3 py-1.5 rounded-xl bg-signal text-background text-xs font-medium">Go</button>
                : city && <button onClick={() => { setCity(""); setCityInput(""); }} className="text-xs text-foreground-dim hover:text-foreground px-1">✕</button>
              }
            </div>
          </div>
          <div>
            <p className="text-xs text-foreground-dim mb-2">Team</p>
            <select
              className="w-full bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-signal"
              value={teamId} onChange={e => setTeamId(e.target.value)}>
              <option value="">All teams</option>
              {teams.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div ref={raceRef} className="relative sm:col-span-2">
            <p className="text-xs text-foreground-dim mb-2">Event / Race</p>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-sm outline-none focus:border-signal"
                placeholder="Search races..."
                value={raceSearch}
                onChange={e => { const v = e.target.value; setRaceSearch(v); setRaceDropdown(!!v); if (!v) { setRaceId(""); setSelectedRace(null); } }}
                onFocus={() => { if (raceSearch) setRaceDropdown(true); }}
              />
              {(raceId || raceSearch) && (
                <button onClick={() => { setRaceId(""); setRaceSearch(""); setSelectedRace(null); setRaceDropdown(false); }} className="text-xs text-foreground-dim hover:text-foreground px-2">✕</button>
              )}
            </div>
            {selectedRace && <p className="text-xs text-signal mt-1 px-1 truncate">{selectedRace.name} · {new Date(selectedRace.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>}
            {raceDropdown && (() => {
              const q = raceSearch.toLowerCase();
              const filtered = races.filter((r: any) => !q || r.name.toLowerCase().includes(q)).slice(0, 12);
              return filtered.length > 0 ? (
                <div className="absolute z-30 top-full mt-1 left-0 right-0 bg-background border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {filtered.map((r: any) => (
                    <button key={r.id} onClick={() => { setRaceId(r.id); setSelectedRace(r); setRaceSearch(r.name); setRaceDropdown(false); }}
                      className={"w-full text-left px-3 py-2 text-sm hover:bg-surface transition-colors " + (raceId === r.id ? "text-signal bg-signal/5" : "")}>
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-foreground-dim ml-2">{new Date(r.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
        </div>
        {activeFilters > 0 && (
          <button onClick={() => { setSex("all"); setAgeGroup("all"); setCity(""); setCityInput(""); setTeamId(""); setRaceId(""); setRaceSearch(""); setSelectedRace(null); }}
            className="text-xs text-foreground-dim hover:text-foreground">
            Clear all filters
          </button>
        )}
      </div>

      {/* Results */}
      {apiError && <p className="text-red-400 text-sm mb-4 rounded-xl border border-red-900 bg-red-950/30 px-4 py-3">{apiError}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 text-foreground-dim text-sm">
          No athletes found for these filters yet.
          {activeFilters > 0 && (
            <button onClick={() => { setSex("all"); setAgeGroup("all"); setCity(""); setCityInput(""); setTeamId(""); setRaceId(""); setRaceSearch(""); setSelectedRace(null); }}
              className="block mx-auto mt-3 text-signal hover:underline text-xs">
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e: any) => (
            <div key={e.userId} className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
              <span className={"w-8 text-center text-base font-bold shrink-0 " + (e.rank === 1 ? "text-yellow-400" : e.rank === 2 ? "text-gray-400" : e.rank === 3 ? "text-amber-600" : "text-foreground-dim text-xs")}>
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
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <p className="font-semibold text-sm">{formatValue(e)}</p>
                  {metric !== "count" && <p className="text-xs text-foreground-dim">{e.activityCount} activities</p>}
                </div>
                {/* Invite button — only shown when user has admin teams */}
                {adminTeams.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setInviting(inviting?.userId === e.userId ? null : { userId: e.userId, name: e.name })}
                      className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-signal hover:text-signal transition-colors text-foreground-dim"
                      title="Invite to a team">
                      + Invite
                    </button>
                    {inviting?.userId === e.userId && (
                      <div ref={inviteRef} className="absolute right-0 top-8 z-20 bg-background border border-border rounded-xl shadow-xl p-2 min-w-[180px]">
                        <p className="text-xs text-foreground-dim px-2 py-1">Add {e.name} to:</p>
                        {adminTeams.map((t: any) => (
                          <button key={t.id} onClick={() => inviteToTeam(e.userId, t.id)} disabled={addingTo === t.id}
                            className="w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-surface transition-colors disabled:opacity-50">
                            {addingTo === t.id ? "Adding..." : t.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <p className="text-xs text-foreground-dim text-center mt-6">
          Top {entries.length} athletes · Set your city and profile to appear in filtered views
        </p>
      )}
    </div>
  );
}
