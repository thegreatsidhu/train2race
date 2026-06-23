"use client";
import { useState, useCallback } from "react";

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
  const [settingPwFor, setSettingPwFor] = useState(null);
  const [tempPassword, setTempPassword] = useState("");
  const [sendingResetFor, setSendingResetFor] = useState(null);
  const [userMsgs, setUserMsgs] = useState({});
  const [tickets, setTickets] = useState([]);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [ticketNote, setTicketNote] = useState({});
  const [updatingTicket, setUpdatingTicket] = useState(null);
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [approvingChallenge, setApprovingChallenge] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamActionKey, setTeamActionKey] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

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

  function setUserMsg(userId, msg, ok) {
    setUserMsgs(prev => ({ ...prev, [userId]: { msg, ok } }));
    setTimeout(() => setUserMsgs(prev => { const n = { ...prev }; delete n[userId]; return n; }), 4000);
  }

  async function setTempPw(userId) {
    if (!tempPassword || tempPassword.length < 6) { setUserMsg(userId, "Password must be at least 6 characters", false); return; }
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "setUserPassword", userId, newPassword: tempPassword }) });
    if (res.ok) { setUserMsg(userId, "Password set — share it with the user", true); setSettingPwFor(null); setTempPassword(""); }
    else { const d = await res.json(); setUserMsg(userId, d.error || "Failed", false); }
  }

  async function sendReset(userId, email) {
    setSendingResetFor(userId);
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "sendUserReset", userId, email }) });
    setSendingResetFor(null);
    if (res.ok) setUserMsg(userId, "Reset email sent to " + email, true);
    else { const d = await res.json(); setUserMsg(userId, d.error || "Failed to send email", false); }
  }

  function copyCode(code) { navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(null), 2000); }

  async function loadChallenges() {
    if (challengesLoaded) return;
    const res = await fetch(`/api/admin/challenges?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setPendingChallenges(d.challenges || []);
    setChallengesLoaded(true);
  }

  async function loadTickets() {
    if (ticketsLoaded) return;
    const res = await fetch(`/api/admin/tickets?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setTickets(d.tickets || []);
    setTicketsLoaded(true);
  }

  async function loadTeams() {
    if (teamsLoaded) return;
    const res = await fetch(`/api/admin/teams?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setTeams(d.teams || []);
    setTeamsLoaded(true);
  }

  async function handleTeamAction(action, teamId, userId, extra = {}) {
    if (action === "removeMember" && !confirm("Remove this member from the team?")) return;
    if (action === "banUser" && !confirm("Ban this user? They will not be able to join teams.")) return;
    const key = `${teamId}:${userId}:${action === "banUser" || action === "unbanUser" ? "ban" : action}`;
    setTeamActionKey(key);
    await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action, teamId, userId, ...extra }) });
    setTeamActionKey(null);
    if (action === "removeMember") setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: t.members.filter(m => m.userId !== userId) } : t));
    if (action === "setRole") setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: t.members.map(m => m.userId === userId ? { ...m, role: extra.role } : m) } : t));
    if (action === "banUser") setTeams(prev => prev.map(t => ({ ...t, members: t.members.map(m => m.userId === userId ? { ...m, isBanned: true } : m) })));
    if (action === "unbanUser") setTeams(prev => prev.map(t => ({ ...t, members: t.members.map(m => m.userId === userId ? { ...m, isBanned: false } : m) })));
  }

  async function deleteUser(userId) {
    setDeletingUser(userId);
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "deleteUser", userId }) });
    setDeletingUser(null);
    setConfirmDeleteUser(null);
    if (res.ok) {
      setData(prev => ({ ...prev, users: prev.users.filter(u => u.id !== userId) }));
      setTeams(prev => prev.map(t => ({ ...t, members: t.members.filter(m => m.userId !== userId) })));
    }
  }

  function switchTab(id) {
    setActiveTab(id);
    if (id === "challenges") loadChallenges();
    if (id === "tickets") loadTickets();
    if (id === "teams") loadTeams();
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
            { id: "challenges", label: "Challenges" + (pendingChallenges.length > 0 ? " (" + pendingChallenges.length + " pending)" : "") },
            { id: "tickets", label: "Tickets" + (tickets.filter(t=>t.status==="open").length > 0 ? " ("+tickets.filter(t=>t.status==="open").length+")" : "") },
            { id: "teams", label: "Teams (" + teams.length + ")" },
            { id: "settings", label: "Settings" },
          ].map(tab => (
            <button key={tab.id} onClick={() => switchTab(tab.id)} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (activeTab===tab.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="space-y-3">
            {data?.users?.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{user.name || "No name"}</p>
                    <p className="text-sm text-foreground-dim">{user.email}</p>
                    <p className="text-xs text-foreground-dim mt-0.5">Joined {new Date(user.createdAt).toLocaleDateString()} · {user.raceTargets?.length || 0} races</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {user.connections?.map((c) => (
                        <span key={c.source} className="text-xs px-2 py-0.5 rounded-full bg-surface-raised border border-border">{c.source}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setSettingPwFor(settingPwFor === user.id ? null : user.id); setTempPassword(""); }}
                      className="px-3 py-1.5 rounded-full border border-border text-xs hover:border-signal hover:text-signal transition-colors"
                    >
                      Set password
                    </button>
                    <button
                      onClick={() => sendReset(user.id, user.email)}
                      disabled={sendingResetFor === user.id}
                      className="px-3 py-1.5 rounded-full border border-border text-xs hover:border-signal hover:text-signal transition-colors disabled:opacity-50"
                    >
                      {sendingResetFor === user.id ? "Sending..." : "Send reset"}
                    </button>
                    {confirmDeleteUser === user.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => deleteUser(user.id)} disabled={deletingUser === user.id}
                          className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs font-medium disabled:opacity-50">
                          {deletingUser === user.id ? "Deleting..." : "Confirm delete"}
                        </button>
                        <button onClick={() => setConfirmDeleteUser(null)} className="px-3 py-1.5 rounded-full border border-border text-xs">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDeleteUser(user.id)}
                        className="px-3 py-1.5 rounded-full border border-red-700/40 text-red-400 text-xs hover:border-red-500 transition-colors">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
                {settingPwFor === user.id && (
                  <div className="mt-3 flex gap-2 items-center">
                    <input
                      type="text"
                      value={tempPassword}
                      onChange={e => setTempPassword(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && setTempPw(user.id)}
                      placeholder="Temporary password (min 6 chars)"
                      className="flex-1 px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
                      autoFocus
                    />
                    <button onClick={() => setTempPw(user.id)} className="px-4 py-2 rounded-full bg-signal text-background text-xs font-medium">Set</button>
                    <button onClick={() => { setSettingPwFor(null); setTempPassword(""); }} className="px-3 py-2 rounded-full border border-border text-xs">Cancel</button>
                  </div>
                )}
                {userMsgs[user.id] && (
                  <p className={"text-xs mt-2 " + (userMsgs[user.id].ok ? "text-signal" : "text-red-400")}>
                    {userMsgs[user.id].msg}
                  </p>
                )}
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

        {activeTab === "challenges" && (
          <div>
            <h2 className="font-medium mb-4">Pending Challenges</h2>
            {!challengesLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : pendingChallenges.length === 0 ? (
              <p className="text-sm text-foreground-dim">No pending challenges.</p>
            ) : (
              <div className="space-y-3">
                {pendingChallenges.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-yellow-700/40 bg-surface p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">{c.title}</p>
                        <p className="text-xs text-foreground-dim mt-0.5 capitalize">{c.type} · {c.metric} · {c.unit}{c.goal ? ` · Goal: ${c.goal}` : ""}</p>
                        <p className="text-xs text-foreground-dim">{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()}</p>
                        {c.description && <p className="text-xs text-foreground-dim mt-1">{c.description}</p>}
                        <p className="text-xs text-foreground-dim mt-1">Team: {c.teamName} · By: {c.creator?.name || "Unknown"} ({c.creator?.email})</p>
                        <p className="text-xs text-foreground-dim">{c.isPublic ? "Public (will appear in Discover)" : "Team-only"}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={async () => {
                            setApprovingChallenge(c.id);
                            await fetch("/api/admin/challenges", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, challengeId: c.id, status: "approved" }) });
                            setPendingChallenges(prev => prev.filter(x => x.id !== c.id));
                            setApprovingChallenge(null);
                          }}
                          disabled={approvingChallenge === c.id}
                          className="px-3 py-1.5 rounded-full bg-signal text-background text-xs disabled:opacity-50"
                        >
                          {approvingChallenge === c.id ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={async () => {
                            setApprovingChallenge(c.id);
                            await fetch("/api/admin/challenges", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, challengeId: c.id, status: "rejected" }) });
                            setPendingChallenges(prev => prev.filter(x => x.id !== c.id));
                            setApprovingChallenge(null);
                          }}
                          disabled={approvingChallenge === c.id}
                          className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "tickets" && (
          <div>
            <h2 className="font-medium mb-4">Support Tickets</h2>
            {!ticketsLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : tickets.length === 0 ? <p className="text-sm text-foreground-dim">No tickets yet.</p> : (
              <div className="space-y-3">
                {tickets.map((t)=>{
                  const STATUS_COLORS={open:"border-yellow-600/40 bg-yellow-900/10 text-yellow-300",in_progress:"border-blue-600/40 bg-blue-900/10 text-blue-300",resolved:"border-green-600/40 bg-green-900/10 text-green-300",closed:"border-border bg-surface text-foreground-dim"};
                  return(
                    <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <p className="font-medium text-sm">{t.subject}</p>
                          <p className="text-xs text-foreground-dim mt-0.5">{t.user?.name||"Unknown"} · {t.user?.email} · {t.category} · {new Date(t.createdAt).toLocaleDateString()}</p>
                          <p className="text-sm text-foreground-dim mt-2">{t.description}</p>
                          {t.adminNote&&<p className="text-xs text-signal mt-1">Note: {t.adminNote}</p>}
                        </div>
                        <span className={"text-xs px-2 py-0.5 rounded-full border shrink-0 "+STATUS_COLORS[t.status]}>{t.status.replace("_"," ")}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                        {["open","in_progress","resolved","closed"].map(s=>(
                          <button key={s} disabled={updatingTicket===t.id||t.status===s} onClick={async()=>{
                            setUpdatingTicket(t.id);
                            await fetch("/api/admin/tickets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({password,ticketId:t.id,status:s})});
                            setTickets(prev=>prev.map(x=>x.id===t.id?{...x,status:s}:x));
                            setUpdatingTicket(null);
                          }} className={"text-xs px-3 py-1 rounded-full border transition-colors "+(t.status===s?"bg-signal text-background border-signal":"border-border hover:bg-surface-raised disabled:opacity-40")}>
                            {s.replace("_"," ")}
                          </button>
                        ))}
                        <div className="flex items-center gap-2 ml-auto">
                          <input placeholder="Add note…" value={ticketNote[t.id]||""} onChange={e=>setTicketNote(n=>({...n,[t.id]:e.target.value}))}
                            className="px-2 py-1 rounded-lg bg-background border border-border text-xs outline-none focus:border-signal w-40"/>
                          <button disabled={updatingTicket===t.id} onClick={async()=>{
                            setUpdatingTicket(t.id);
                            await fetch("/api/admin/tickets",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({password,ticketId:t.id,adminNote:ticketNote[t.id]||""})});
                            setTickets(prev=>prev.map(x=>x.id===t.id?{...x,adminNote:ticketNote[t.id]||""}:x));
                            setUpdatingTicket(null);
                          }} className="text-xs text-signal hover:underline disabled:opacity-40">Save note</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "teams" && (
          <div>
            <h2 className="font-medium mb-4">All Teams ({teams.length})</h2>
            {!teamsLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : teams.length === 0 ? (
              <p className="text-sm text-foreground-dim">No teams yet.</p>
            ) : (
              <div className="space-y-4">
                {teams.map(t => (
                  <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="mb-3">
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-foreground-dim mt-0.5">
                        {t.members.length} member{t.members.length !== 1 ? "s" : ""} · {t.isPrivate ? "Private" : "Public"} · {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-y-2">
                      {t.members.map(m => (
                        <div key={m.userId} className={"flex items-center justify-between rounded-xl border px-3 py-2 " + (m.isBanned ? "border-red-800/40 bg-red-900/10" : "border-border bg-background")}>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{m.name}</p>
                              {m.role === "admin" && <span className="text-xs px-1.5 py-0.5 rounded bg-signal/20 text-signal">admin</span>}
                              {m.isBanned && <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">banned</span>}
                            </div>
                            <p className="text-xs text-foreground-dim">{m.email}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                            <button
                              onClick={() => handleTeamAction("setRole", t.id, m.userId, { role: m.role === "admin" ? "member" : "admin" })}
                              disabled={teamActionKey === `${t.id}:${m.userId}:setRole`}
                              className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-signal hover:text-signal transition-colors disabled:opacity-40"
                            >
                              {teamActionKey === `${t.id}:${m.userId}:setRole` ? "..." : m.role === "admin" ? "Remove admin" : "Make admin"}
                            </button>
                            <button
                              onClick={() => handleTeamAction(m.isBanned ? "unbanUser" : "banUser", t.id, m.userId)}
                              disabled={teamActionKey === `${t.id}:${m.userId}:ban`}
                              className={"text-xs px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40 " + (m.isBanned ? "border-green-700/40 text-green-400 hover:border-green-500" : "border-red-700/40 text-red-400 hover:border-red-500")}
                            >
                              {teamActionKey === `${t.id}:${m.userId}:ban` ? "..." : m.isBanned ? "Unban" : "Ban"}
                            </button>
                            <button
                              onClick={() => handleTeamAction("removeMember", t.id, m.userId)}
                              disabled={teamActionKey === `${t.id}:${m.userId}:removeMember`}
                              className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors disabled:opacity-40"
                            >
                              {teamActionKey === `${t.id}:${m.userId}:removeMember` ? "..." : "Remove"}
                            </button>
                          </div>
                        </div>
                      ))}
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