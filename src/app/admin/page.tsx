"use client";
import { useState } from "react";

const SOURCE_COLORS: Record<string, string> = {
  STRAVA: "bg-orange-900 text-orange-300",
  GARMIN: "bg-blue-900 text-blue-300",
  WHOOP: "bg-red-900 text-red-300",
  APPLE_HEALTH: "bg-green-900 text-green-300",
};

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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"users" | "invites">("users");

  async function handleLogin() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { setError("Wrong password"); setLoading(false); return; }
    const dataRes = await fetch(`/api/admin?password=${encodeURIComponent(password)}`);
    const json = await dataRes.json();
    setData(json);
    setAuthed(true);
    setLoading(false);
  }

  async function refreshData() {
    const dataRes = await fetch(`/api/admin?password=${encodeURIComponent(password)}`);
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

  async function deleteInvite(id: string) {
    setDeletingId(id);
    await fetch("/api/admin/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, id }),
    });
    await refreshData();
    setDeletingId(null);
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
              className="w-full px-4 py-3 rounded-xl bg-background border border-border text-sm outline-none focus:border-signal mb-4"
              autoFocus />
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
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-foreground-dim text-sm">train2race.com</p>
          </div>
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
          {(["users", "invites"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? "bg-signal text-background" : "border border-border hover:bg-surface"}`}>
              {tab === "users" ? `Users (${data?.users?.length || 0})` : `Invites (${unusedCodes.length} unused)`}
            </button>
          ))}
        </div>
        {activeTab === "users" && (
          <div className="space-y-3">
            {data?.users?.map((user: any) => (
              <div key={user.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-medium">{user.name || "No name"}</p>
                    <p className="text-sm text-foreground-dim">{user.email}</p>
                    <p className="text-xs text-foreground-dim mt-0.5">
                      Joined {new Date(user.createdAt).toLocaleDateString()} · {user._count.activities} activities · {user._count.raceTargets} races
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {user.connections?.filter((c: any) => c.connected).map((c: any) => (
                      <span key={c.source} className={`text-xs px-2 py-0.5 rounded-full ${SOURCE_COLORS[c.source] || "bg-surface border border-border text-foreground-dim"}`}>
                        {c.source}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {activeTab === "invites" && (
          <div>
            <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
              <h2 className="font-medium mb-4">Generate invite codes</h2>
              <div className="flex gap-3 items-center flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-foreground-dim">Count:</label>
                  <input type="number" min={1} max={20} value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    className="w-16 px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:border-signal" />
                </div>
                <button onClick={generateInvites} disabled={generating}
                  className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60">
                  {generating ? "Generating..." : "Generate"}
                </button>
              </div>
              {newCodes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-foreground-dim uppercase tracking-wide mb-2">New codes — click to copy</p>
                  <div className="flex flex-wrap gap-2">
                    {newCodes.map((code) => (
                      <button key={code} onClick={() => copyCode(code)}
                        className="px-3 py-1.5 rounded-xl bg-background border border-signal text-sm font-mono hover:bg-surface transition-colors">
                        {copied === code ? "Copied!" : code}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {unusedCodes.length > 0 && (
              <div className="mb-6">
                <h2 className="font-medium mb-3">Unused ({unusedCodes.length})</h2>
                <div className="space-y-2">
                  {unusedCodes.map((invite: any) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{invite.code}</span>
                        <button onClick={() => copyCode(invite.code)} className="text-xs text-foreground-dim hover:text-foreground">
                          {copied === invite.code ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-foreground-dim">{new Date(invite.createdAt).toLocaleDateString()}</span>
                        <button onClick={() => deleteInvite(invite.id)} disabled={deletingId === invite.id}
                          className="text-xs text-red-400 hover:text-red-300 disabled:opacity-40">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {usedCodes.length > 0 && (
              <div>
                <h2 className="font-medium mb-3 text-foreground-dim">Used ({usedCodes.length})</h2>
                <div className="space-y-2">
                  {usedCodes.map((invite: any) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 opacity-50">
                      <span className="font-mono text-sm line-through">{invite.code}</span>
                      <span className="text-xs text-foreground-dim">Used {invite.usedAt ? new Date(invite.usedAt).toLocaleDateString() : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
