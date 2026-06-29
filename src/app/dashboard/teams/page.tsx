"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TeamInvitations } from "@/components/TeamInvitations";

export default function TeamsPage() {
  const router = useRouter();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myFilter, setMyFilter] = useState("");
  const [races, setRaces] = useState([]);

  // panel state
  const [panel, setPanel] = useState<"none"|"create"|"join"|"discover">("none");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRace, setSelectedRace] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  // join form
  const [inviteCode, setInviteCode] = useState("");

  // discover
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState<string|null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/teams", { signal: ac.signal }).then(r => r.json()).then(d => { setTeams(d.teams || []); setLoading(false); }).catch((e: any) => { if (e?.name !== "AbortError") { setLoading(false); setError("Failed to load teams. Please refresh."); } });
    fetch("/api/major-races?upcoming=1", { signal: ac.signal }).then(r => r.json()).then(d => setRaces(d.races || [])).catch(() => {});
    return () => ac.abort();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    const res = await fetch(`/api/teams/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data.teams || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    if (panel !== "discover") return;
    const t = setTimeout(() => runSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery, panel, runSearch]);

  function openPanel(p: "create"|"join"|"discover") {
    setPanel(prev => prev === p ? "none" : p);
    setError("");
    if (p === "discover" && searchResults.length === 0) runSearch("");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setSubmitting(true); setError("");
    const res = await fetch("/api/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, majorRaceId: selectedRace || null, isPrivate }) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setSubmitting(false); return; }
    router.push(`/dashboard/teams/${data.team.id}`);
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setSubmitting(true); setError("");
    const res = await fetch("/api/teams/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inviteCode }) });
    const data = await res.json();
    setSubmitting(false);
    if (res.status === 409 || res.ok) { router.push(`/dashboard/teams/${data.teamId}`); return; }
    setError(data.error || "Invalid invite code");
  }

  async function handleJoinPublic(teamId: string) {
    setJoining(teamId);
    const res = await fetch(`/api/teams/${teamId}/join`, { method: "POST" });
    const data = await res.json();
    setJoining(null);
    if (res.ok || res.status === 409) { router.push(`/dashboard/teams/${data.teamId}`); return; }
    setSearchResults(prev => prev.map((t: any) => t.id === teamId ? { ...t, _error: data.error } : t));
  }

  const filteredTeams = teams.filter((t: any) => t.name.toLowerCase().includes(myFilter.toLowerCase()));

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Teams</h1>
        <p className="text-foreground-dim text-sm">Train together, compete together.</p>
      </header>

      <TeamInvitations />

      <div className="flex gap-2 mb-6 flex-wrap">
        {([
          { id: "create", label: "Create team" },
          { id: "join", label: "Join with code" },
          { id: "discover", label: "Discover" },
        ] as const).map(btn => (
          <button key={btn.id} onClick={() => openPanel(btn.id)}
            className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (panel === btn.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
            {btn.label}
          </button>
        ))}
      </div>

      {panel === "create" && (
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-semibold mb-4">Create a team</h2>
          <div className="space-y-3">
            <div><label className="block text-xs text-foreground-dim mb-1">Team name *</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Chicago Marathon Crew" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" /></div>
            <div><label className="block text-xs text-foreground-dim mb-1">Description (optional)</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="What is this team about?" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm resize-none" /></div>
            <div><label className="block text-xs text-foreground-dim mb-1">Target race (optional)</label><select value={selectedRace} onChange={e => setSelectedRace(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"><option value="">No specific race</option>{races.map((r: any) => <option key={r.id} value={r.id}>{r.name} · {new Date(r.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</option>)}</select></div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div onClick={() => setIsPrivate(p => !p)} className={"relative w-10 h-5 rounded-full transition-colors " + (isPrivate ? "bg-border" : "bg-signal")}>
                <div className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform " + (isPrivate ? "left-0.5" : "left-5")} />
              </div>
              <span className="text-sm">{isPrivate ? "Private — invite code only" : "Public — discoverable by anyone"}</span>
            </label>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPanel("none")} className="flex-1 py-2 rounded-full border border-border text-sm">Cancel</button>
              <button onClick={handleCreate} disabled={submitting || !name.trim()} className="flex-1 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{submitting ? "Creating..." : "Create team"}</button>
            </div>
          </div>
        </div>
      )}

      {panel === "join" && (
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-semibold mb-4">Join a team</h2>
          <div className="space-y-3">
            <div><label className="block text-xs text-foreground-dim mb-1">Invite code</label><input value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())} placeholder="e.g. ABC123" maxLength={6} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm font-mono tracking-widest" /></div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => setPanel("none")} className="flex-1 py-2 rounded-full border border-border text-sm">Cancel</button>
              <button onClick={handleJoin} disabled={submitting || !inviteCode.trim()} className="flex-1 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{submitting ? "Joining..." : "Join team"}</button>
            </div>
          </div>
        </div>
      )}

      {panel === "discover" && (
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <h2 className="font-semibold mb-4">Discover public teams</h2>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by team name..."
            className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm mb-4"
            autoFocus
          />
          {searching ? (
            <p className="text-sm text-foreground-dim">Searching...</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-foreground-dim">{searchQuery ? "No public teams found." : "No public teams yet."}</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    {t.description && <p className="text-xs text-foreground-dim mt-0.5">{t.description}</p>}
                    {t.majorRace && <p className="text-xs text-signal mt-0.5">🏁 {t.majorRace.name}</p>}
                    <p className="text-xs text-foreground-dim mt-0.5">{t.memberCount} member{t.memberCount !== 1 ? "s" : ""}</p>
                    {t._error && <p className="text-xs text-red-400 mt-0.5">{t._error}</p>}
                  </div>
                  {t.isMember ? (
                    <button onClick={() => router.push(`/dashboard/teams/${t.id}`)} className="px-3 py-1.5 rounded-full border border-border text-xs shrink-0 ml-3">View</button>
                  ) : (
                    <button onClick={() => handleJoinPublic(t.id)} disabled={joining === t.id} className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-60 shrink-0 ml-3">{joining === t.id ? "Joining..." : "Join"}</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-4">
        {teams.length > 3 && (
          <input
            value={myFilter}
            onChange={e => setMyFilter(e.target.value)}
            placeholder="Filter my teams..."
            className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
          />
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-surface border border-border animate-pulse" />)}
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-foreground-dim text-sm mb-2">No teams yet.</p>
          <p className="text-xs text-foreground-dim">Create a team, join one with an invite code, or discover public teams.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTeams.length === 0 ? (
            <p className="text-sm text-foreground-dim">No teams match "{myFilter}".</p>
          ) : filteredTeams.map((team: any) => (
            <button key={team.id} onClick={() => router.push(`/dashboard/teams/${team.id}`)} className="w-full text-left rounded-2xl border border-border bg-surface p-5 hover:bg-surface-raised transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{team.name}</p>
                    {!team.isPrivate && <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">Public</span>}
                  </div>
                  {team.description && <p className="text-sm text-foreground-dim mt-0.5">{team.description}</p>}
                  {team.majorRace && <p className="text-xs text-signal mt-1">🏁 {team.majorRace.name}</p>}
                  <p className="text-xs text-foreground-dim mt-1">{team._count.members} member{team._count.members !== 1 ? "s" : ""} · {team.members[0]?.role === "admin" ? "Admin" : "Member"}</p>
                </div>
                <span className="text-foreground-dim">→</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
