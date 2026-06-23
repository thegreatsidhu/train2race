"use client";
import { useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [genCount, setGenCount] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [newCodes, setNewCodes] = useState([]);
  const [copied, setCopied] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [activeTab, setActiveTab] = useState("users");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [confirmAdminPassword, setConfirmAdminPassword] = useState("");
  const [pwChanging, setPwChanging] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function handleLogin() {
    setLoading(true); setError("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "getData" }),
    });
    if (!res.ok) { setError("Wrong password"); setLoading(false); return; }
    const json = await res.json();
    setData(json); setAuthed(true); setLoading(false);
  }

  async function refreshData() {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "getData" }) });
    const json = await res.json(); setData(json);
  }

  async function generateInvites() {
    setGenerating(true);
    const res = await fetch("/api/admin/invites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, count: genCount }) });
    const json = await res.json();
    setNewCodes(json.codes?.map((c) => c.code) || []);
    await refreshData(); setGenerating(false);
  }

  async function deleteInvite(id) {
    setDeletingId(id);
    await fetch("/api/admin/invites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id }) });
    await refreshData(); setDeletingId(null);
  }

  async function deleteMessage(messageId) {
    await fetch("/api/major-races/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, adminPassword: password }) });
    await refreshData();
  }

  async function approveRace(raceId, action) {
    await fetch("/api/admin/races", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, raceId, action }) });
    await refreshData();
  }

  async function changeAdminPassword() {
    if (!newAdminPassword || newAdminPassword.length < 8) { setPwMsg("Password must be at least 8 characters"); return; }
    if (newAdminPassword !== confirmAdminPassword) { setPwMsg("Passwords do not match"); return; }
    setPwChanging(true); setPwMsg("");
    const res = await fetch("/api/admin/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, newPassword: newAdminPassword }) });
    setPwChanging(false);
    if (res.ok) { setPwMsg("Password changed successfully"); setNewAdminPassword(""); setConfirmAdminPassword(""); }
    else { const d = await res.json(); setPwMsg(d.error || "Failed to change password"); }
  }

  function copyCode(code) { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 2000); }

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-foreground-dim text-sm mt-1">train2race.com</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6">
            <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Admin Password</label>
            <div className="relative mb-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 pr-16 rounded-xl bg-background border border-border text-sm outline-none focus:border-signal"
                autoFocus
              />
              <button onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-signal px-1 py-1">
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
            <button onClick={handleLogin} disabled={loading||!password} className="w-full py-3 rounded-full bg-signal text-background font-medium disabled:opacity-60">
              {loading ? "Checking..." : "Enter"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const unusedCodes = data?.inviteCodes?.filter((c) => !c.usedBy) || [];
  const usedCodes = data?.inviteCodes?.filter((c) => c.usedBy) || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button onClick={() => { setAuthed(false); setData(null); setPassword(""); }} className="px-4 py-2 rounded-full border border-border text-sm">Sign out</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total users", value: data?.users?.length || 0 },
            { label: "Activities", value: data?.activityCount || 0 },
            { label: "Race plans", value: data?.raceCount || 0 },
            { label: "Unused invites", value: unusedCodes.length },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border border-border bg-surface p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-foreground-dim mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { id: "users", label: "Users (" + (data?.users?.length || 0) + ")" },
            { id: "invites", label: "Invites (" + unusedCodes.length + " unused)" },
            { id: "races", label: "Races (" + (data?.pendingRaces?.length || 0) + " pending)" },
            { id: "chat", label: "Chat" },
            { id: "settings", label: "Settings" },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (activeTab===tab.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="space-y-3">
            {data?.users?.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border bg-surface p-4">
                <p className="font-medium">{user.name || "No name"}</p>
                <p className="text-sm text-foreground-dim">{user.email}</p>
                <p className="text-xs text-foreground-dim mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString()} - {user.raceTargets?.length || 0} races</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {user.connections?.map((c) => (
                    <span key={c.source} className="text-xs px-2 py-0.5 rounded-full bg-surface-raised border border-border">{c.source}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "invites" && (
          <div>
            <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
              <h2 className="font-medium mb-4">Generate invite codes</h2>
              <div className="flex gap-3 items-center">
                <label className="text-sm text-foreground-dim">Count:</label>
                <input type="number" min={1} max={20} value={genCount} onChange={e => setGenCount(Number(e.target.value))} className="w-16 px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none"/>
                <button onClick={generateInvites} disabled={generating} className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{generating ? "Generating..." : "Generate"}</button>
              </div>
              {newCodes.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-foreground-dim mb-2">New codes — click to copy</p>
                  <div className="flex flex-wrap gap-2">
                    {newCodes.map(code => <button key={code} onClick={() => copyCode(code)} className="px-3 py-1.5 rounded-xl bg-background border border-signal text-sm font-mono">{copied===code?"Copied!":code}</button>)}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2 mb-6">
              {unusedCodes.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{invite.code}</span>
                    <button onClick={() => copyCode(invite.code)} className="text-xs text-foreground-dim">{copied===invite.code?"Copied!":"Copy"}</button>
                  </div>
                  <button onClick={() => deleteInvite(invite.id)} disabled={deletingId===invite.id} className="text-xs text-red-400">Delete</button>
                </div>
              ))}
            </div>
            {usedCodes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground-dim mb-2">Used ({usedCodes.length})</h3>
                <div className="space-y-2">
                  {usedCodes.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-foreground-dim line-through">{invite.code}</span>
                        <div className="text-xs text-foreground-dim">
                          {invite.usedByUser ? (
                            <span>{invite.usedByUser.name || "No name"} &middot; {invite.usedByUser.email}</span>
                          ) : (
                            <span>Unknown user</span>
                          )}
                        </div>
                      </div>
                      {invite.usedAt && <span className="text-xs text-foreground-dim">{new Date(invite.usedAt).toLocaleDateString()}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "races" && (
          <div>
            <h2 className="font-medium mb-3">Pending ({data?.pendingRaces?.length || 0})</h2>
            {(!data?.pendingRaces || data.pendingRaces.length === 0) ? <p className="text-sm text-foreground-dim">No pending submissions.</p> : (
              <div className="space-y-3">
                {data.pendingRaces.map((race) => (
                  <div key={race.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">{race.name}</p>
                        <p className="text-sm text-foreground-dim">{race.city}, {race.country} - {(race.distanceM/1609.34).toFixed(1)} mi</p>
                        <p className="text-sm text-foreground-dim">{new Date(race.raceDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => approveRace(race.id,"approve")} className="px-3 py-1.5 rounded-full bg-signal text-background text-xs">Approve</button>
                        <button onClick={() => approveRace(race.id,"reject")} className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs">Reject</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-sm">
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-medium mb-1">Change admin password</h2>
              <p className="text-xs text-foreground-dim mb-5">This changes the password used to log into this admin panel.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-foreground-dim mb-1">New password</label>
                  <input type="password" value={newAdminPassword} onChange={e=>setNewAdminPassword(e.target.value)} placeholder="Min 8 characters" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-foreground-dim mb-1">Confirm new password</label>
                  <input type="password" value={confirmAdminPassword} onChange={e=>setConfirmAdminPassword(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                </div>
                {pwMsg && <p className={"text-sm " + (pwMsg.includes("successfully") ? "text-signal" : "text-red-400")}>{pwMsg}</p>}
                <button onClick={changeAdminPassword} disabled={pwChanging||!newAdminPassword} className="w-full py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">
                  {pwChanging ? "Changing..." : "Change password"}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div>
            <h2 className="font-medium mb-3">Event Messages</h2>
            {(!data?.recentMessages || data.recentMessages.length === 0) ? <p className="text-sm text-foreground-dim">No messages yet.</p> : (
              <div className="space-y-2">
                {data.recentMessages.map((msg) => (
                  <div key={msg.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">{msg.user?.name || "Unknown"}</span>
                          <span className="text-xs text-foreground-dim">in {msg.majorRace?.name}</span>
                        </div>
                        <p className="text-sm text-foreground-dim">{msg.content}</p>
                      </div>
                      <button onClick={() => deleteMessage(msg.id)} className="text-xs text-red-400">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}