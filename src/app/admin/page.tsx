"use client";
import { useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [genCount, setGenCount] = useState(1);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "invites" | "races">("users");

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, action: "getData" }),
      });
      if (!res.ok) { setError("Wrong password"); setLoading(false); return; }
      const dataRes = await fetch("/api/admin?password=" + encodeURIComponent(password));
      const json = await dataRes.json();
      setData(json);
      setAuthed(true);
    } catch(e) {
      setError("Connection error");
    }
    setLoading(false);
  }

  async function refreshData() {
    const dataRes = await fetch("/api/admin?password=" + encodeURIComponent(password));
    setData(await dataRes.json());
  }

  async function generateInvites() {
    setGenerating(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, count: genCount }),
    });
    const json = await res.json();
    setNewCodes(json.codes.map((c: any) => c.code));
    await refreshData();
    setGenerating(false);
  }

  async function approveRace(raceId, action) {
    await fetch("/api/admin/races", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, raceId, action }) });
    await refreshData();
  }
  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-foreground-dim text-sm mt-1">train2race.com</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-signal mb-4" />
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={handleLogin} disabled={loading || !password}
              className="w-full py-3 rounded-full bg-signal text-background font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
              {loading ? "Checking..." : "Enter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unusedCodes = data?.inviteCodes?.filter((c: any) => !c.usedBy) || [];
  const usedCodes = data?.inviteCodes?.filter((c: any) => c.usedBy) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin</h1>
          <button onClick={() => { setAuthed(false); setData(null); setPassword(""); }}
            className="px-4 py-2 rounded-full border border-border text-sm hover:bg-surface transition-colors">
            Sign out
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Users", value: data?.users?.length || 0 },
            { label: "Activities", value: data?.activityCount || 0 },
            { label: "Race plans", value: data?.raceCount || 0 },
            { label: "Unused invites", value: unusedCodes.length },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-foreground-dim mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          {(["users", "invites", "races"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (activeTab === tab ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
              {tab === "users" ? "Users (" + (data?.users?.length || 0) + ")" : "Invites (" + unusedCodes.length + " unused)"}
            </button>
          ))}
        </div>
        {activeTab === "users" && (
          <div className="space-y-3">
            {data?.users?.map((user: any) => (
              <div key={user.id} className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-medium">{user.name || "No name"}</p>
                <p className="text-sm text-foreground-dim">{user.email}</p>
                <p className="text-xs text-foreground-dim mt-0.5">
                  Joined {new Date(user.createdAt).toLocaleDateString()} · {user._count.activities} activities · {user._count.raceTargets} races
                </p>
              </div>
            ))}
          </div>
        )}
        {activeTab === "invites" && (
          <div>
            <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
              <h2 className="font-medium mb-4">Generate invite codes</h2>
              <div className="flex gap-3 items-center">
                <input type="number" min={1} max={20} value={genCount}
                  onChange={(e) => setGenCount(Number(e.target.value))}
                  className="w-16 px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none" />
                <button onClick={generateInvites} disabled={generating}
                  className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
              {newCodes.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {newCodes.map((code) => (
                    <button key={code} onClick={() => copyCode(code)}
                      className="px-3 py-1.5 rounded-xl bg-background border border-signal text-sm font-mono">
                      {copied === code ? "Copied!" : code}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              {unusedCodes.map((invite: any) => (
                <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <span className="font-mono text-sm">{invite.code}</span>
                  <button onClick={() => copyCode(invite.code)} className="text-xs text-foreground-dim hover:text-foreground">
                    {copied === invite.code ? "Copied!" : "Copy"}
                  </button>
                </div>
              ))}
              {usedCodes.map((invite: any) => (
                <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 opacity-40">
                  <span className="font-mono text-sm line-through">{invite.code}</span>
                  <span className="text-xs text-foreground-dim">Used</span>
                </div>
              ))}
            </div>
          </div>
        )}
      {activeTab === "races" && (
        <div>
          <h2 className="font-medium mb-3">Pending Races ({data?.pendingRaces?.length || 0})</h2>
          {!data?.pendingRaces?.length ? <p className="text-sm text-foreground-dim">No pending submissions.</p> : (
            <div className="space-y-3">{data.pendingRaces.map((race) => (
              <div key={race.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="font-medium">{race.name}</p><p className="text-sm text-foreground-dim">{race.city}, {race.country} · {(race.distanceM/1609.34).toFixed(1)}mi</p><p className="text-sm text-foreground-dim">{new Date(race.raceDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</p>{race.website&&<a href={race.website} target="_blank" className="text-xs text-signal hover:underline">{race.website}</a>}</div>
                  <div className="flex gap-2 shrink-0"><button onClick={()=>approveRace(race.id,"approve")} className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium">Approve</button><button onClick={()=>approveRace(race.id,"reject")} className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs">Reject</button></div>
                </div>
              </div>
            ))}</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}



