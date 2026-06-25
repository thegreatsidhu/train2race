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
  const [allChallenges, setAllChallenges] = useState([]);
  const [challengesLoaded, setChallengesLoaded] = useState(false);
  const [challengeStatusFilter, setChallengeStatusFilter] = useState("all");
  const [expandedChallengeId, setExpandedChallengeId] = useState(null);
  const [approvingChallenge, setApprovingChallenge] = useState(null);
  const [deletingChallengeId, setDeletingChallengeId] = useState(null);
  const [confirmDeleteChallengeId, setConfirmDeleteChallengeId] = useState(null);
  const [removingParticipantKey, setRemovingParticipantKey] = useState(null);
  const [confirmRemoveParticipantKey, setConfirmRemoveParticipantKey] = useState(null);
  const [teams, setTeams] = useState([]);
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [teamActionKey, setTeamActionKey] = useState(null);
  const [confirmActionKey, setConfirmActionKey] = useState(null);
  const [confirmDeleteTeam, setConfirmDeleteTeam] = useState(null);
  const [deletingTeamId, setDeletingTeamId] = useState(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState("");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDesc, setEditTeamDesc] = useState("");
  const [savingTeamEdit, setSavingTeamEdit] = useState(false);

  // Race management
  const [allRaces, setAllRaces] = useState([]);
  const [allRacesLoaded, setAllRacesLoaded] = useState(false);
  const [raceViewTab, setRaceViewTab] = useState("pending");
  const [editingRaceId, setEditingRaceId] = useState(null);
  const [editRaceName, setEditRaceName] = useState("");
  const [editRaceDate, setEditRaceDate] = useState("");
  const [editRaceCity, setEditRaceCity] = useState("");
  const [editRaceCountry, setEditRaceCountry] = useState("");
  const [editRaceDist, setEditRaceDist] = useState("");
  const [editRaceWeb, setEditRaceWeb] = useState("");
  const [editRaceTri, setEditRaceTri] = useState(false);
  const [savingRaceEdit, setSavingRaceEdit] = useState(false);
  const [confirmDeleteRaceId, setConfirmDeleteRaceId] = useState(null);
  const [deletingRaceId, setDeletingRaceId] = useState(null);
  const [showCreateRace, setShowCreateRace] = useState(false);
  const [newRaceName, setNewRaceName] = useState("");
  const [newRaceDate, setNewRaceDate] = useState("");
  const [newRaceCity, setNewRaceCity] = useState("");
  const [newRaceCountry, setNewRaceCountry] = useState("USA");
  const [newRaceDist, setNewRaceDist] = useState("42195");
  const [newRaceWeb, setNewRaceWeb] = useState("");
  const [newRaceTri, setNewRaceTri] = useState(false);
  const [creatingRace, setCreatingRace] = useState(false);

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
    setAllRacesLoaded(false);
  }

  async function loadAllRaces() {
    if (allRacesLoaded) return;
    const res = await fetch(`/api/admin/races?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    const combined = [...(d.pending || []), ...(d.active || [])].sort((a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime());
    setAllRaces(combined);
    setAllRacesLoaded(true);
  }

  async function saveRaceEdit(raceId) {
    setSavingRaceEdit(true);
    const res = await fetch("/api/admin/races", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, raceId, name: editRaceName, city: editRaceCity, country: editRaceCountry, raceDate: editRaceDate, distanceM: parseFloat(editRaceDist), website: editRaceWeb || null, isTriathlon: editRaceTri }),
    });
    setSavingRaceEdit(false);
    if (res.ok) {
      setAllRaces(prev => prev.map(r => r.id === raceId ? { ...r, name: editRaceName, city: editRaceCity, country: editRaceCountry, raceDate: new Date(editRaceDate).toISOString(), distanceM: parseFloat(editRaceDist), website: editRaceWeb || null, isTriathlon: editRaceTri } : r));
      setEditingRaceId(null);
    }
  }

  async function deleteRace(raceId) {
    setDeletingRaceId(raceId);
    await fetch("/api/admin/races", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, raceId }) });
    setAllRaces(prev => prev.filter(r => r.id !== raceId));
    setData(prev => prev ? { ...prev, pendingRaces: (prev.pendingRaces || []).filter(r => r.id !== raceId) } : prev);
    setDeletingRaceId(null);
    setConfirmDeleteRaceId(null);
  }

  async function createRaceAdmin() {
    if (!newRaceName || !newRaceDate || !newRaceCity || !newRaceCountry || !newRaceDist) return;
    setCreatingRace(true);
    const res = await fetch("/api/admin/races", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "create", name: newRaceName, city: newRaceCity, country: newRaceCountry, raceDate: newRaceDate, distanceM: parseFloat(newRaceDist), website: newRaceWeb || null, isTriathlon: newRaceTri }),
    });
    const d = await res.json();
    setCreatingRace(false);
    if (res.ok && d.race) {
      setAllRaces(prev => [...prev, d.race].sort((a, b) => new Date(a.raceDate).getTime() - new Date(b.raceDate).getTime()));
      setNewRaceName(""); setNewRaceDate(""); setNewRaceCity(""); setNewRaceCountry("USA"); setNewRaceDist("42195"); setNewRaceWeb(""); setNewRaceTri(false); setShowCreateRace(false);
    }
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
    setAllChallenges(d.challenges || []);
    setChallengesLoaded(true);
  }

  async function reloadChallenges() {
    const res = await fetch(`/api/admin/challenges?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setAllChallenges(d.challenges || []);
  }

  async function approveChallenge(challengeId, status) {
    setApprovingChallenge(challengeId);
    await fetch("/api/admin/challenges", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, challengeId, status }) });
    setAllChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, status } : c));
    setApprovingChallenge(null);
  }

  async function deleteChallenge(challengeId) {
    setDeletingChallengeId(challengeId);
    setConfirmDeleteChallengeId(null);
    await fetch("/api/admin/challenges", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, challengeId }) });
    setAllChallenges(prev => prev.filter(c => c.id !== challengeId));
    setDeletingChallengeId(null);
    if (expandedChallengeId === challengeId) setExpandedChallengeId(null);
  }

  async function removeParticipantFromChallenge(challengeId, userId) {
    const key = `${challengeId}:${userId}`;
    setRemovingParticipantKey(key);
    setConfirmRemoveParticipantKey(null);
    await fetch("/api/admin/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "removeParticipant", challengeId, userId }) });
    setAllChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, participants: c.participants.filter(p => p.id !== userId) } : c));
    setRemovingParticipantKey(null);
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
    setConfirmActionKey(null);
    const key = `${teamId}:${userId}:${action === "banUser" || action === "unbanUser" ? "ban" : action}`;
    setTeamActionKey(key);
    await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action, teamId, userId, ...extra }) });
    setTeamActionKey(null);
    if (action === "removeMember") setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: t.members.filter(m => m.userId !== userId) } : t));
    if (action === "setRole") setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: t.members.map(m => m.userId === userId ? { ...m, role: extra.role } : m) } : t));
    if (action === "banUser") setTeams(prev => prev.map(t => ({ ...t, members: t.members.map(m => m.userId === userId ? { ...m, isBanned: true } : m) })));
    if (action === "unbanUser") setTeams(prev => prev.map(t => ({ ...t, members: t.members.map(m => m.userId === userId ? { ...m, isBanned: false } : m) })));
  }

  async function deleteTeam(teamId) {
    setDeletingTeamId(teamId);
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "deleteTeam", teamId }) });
    setDeletingTeamId(null);
    setConfirmDeleteTeam(null);
    if (res.ok) setTeams(prev => prev.filter(t => t.id !== teamId));
  }

  async function createTeam() {
    if (!newTeamName.trim()) return;
    setCreatingTeam(true);
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "createTeam", name: newTeamName.trim(), description: newTeamDesc.trim() || null }) });
    const d = await res.json().catch(() => ({}));
    setCreatingTeam(false);
    if (res.ok && d.team) { setTeams(prev => [{ ...d.team, members: [] }, ...prev]); setNewTeamName(""); setNewTeamDesc(""); setShowCreateTeam(false); }
  }

  async function addMemberToTeam(teamId) {
    if (!addMemberEmail.trim()) return;
    setAddingMember(true); setAddMemberMsg("");
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "addMember", teamId, email: addMemberEmail.trim() }) });
    const d = await res.json().catch(() => ({}));
    setAddingMember(false);
    if (res.ok && d.member) {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, members: [...t.members, d.member] } : t));
      setAddMemberEmail(""); setAddMemberTeamId(null);
    } else { setAddMemberMsg(d.error || "User not found"); }
  }

  async function saveTeamEdit(teamId) {
    if (!editTeamName.trim()) return;
    setSavingTeamEdit(true);
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "editTeam", teamId, name: editTeamName.trim(), description: editTeamDesc.trim() || null }) });
    setSavingTeamEdit(false);
    if (res.ok) {
      setTeams(prev => prev.map(t => t.id === teamId ? { ...t, name: editTeamName.trim(), description: editTeamDesc.trim() || null } : t));
      setEditingTeamId(null);
    }
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
    if (id === "races") loadAllRaces();
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
  const pendingChallengeCount = allChallenges.filter(c => c.status === "pending").length;

  const filteredChallenges = allChallenges.filter(c => {
    if (challengeStatusFilter === "all") return true;
    if (challengeStatusFilter === "pending") return c.status === "pending";
    if (challengeStatusFilter === "active") return c.status === "approved" && new Date() < new Date(c.endDate);
    if (challengeStatusFilter === "ended") return c.status === "approved" && new Date() >= new Date(c.endDate);
    if (challengeStatusFilter === "rejected") return c.status === "rejected";
    return true;
  });

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
            { id: "challenges", label: "Challenges" + (challengesLoaded && pendingChallengeCount > 0 ? " (" + pendingChallengeCount + " pending)" : "") },
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
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex gap-1.5">
                {[
                  { id: "pending", label: `Pending (${data?.pendingRaces?.length || 0})` },
                  { id: "active", label: `All races (${allRaces.filter(r => r.status === "active").length})` },
                ].map(vt => (
                  <button key={vt.id} onClick={() => { setRaceViewTab(vt.id); if (vt.id === "active") loadAllRaces(); }} className={"text-xs px-3 py-1.5 rounded-full border transition-colors " + (raceViewTab === vt.id ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                    {vt.label}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowCreateRace(v => !v)} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium">+ Add race</button>
            </div>

            {showCreateRace && (
              <div className="rounded-2xl border border-signal/30 bg-surface p-4 mb-4 space-y-3">
                <p className="text-sm font-medium">Add race (goes live immediately)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newRaceName} onChange={e => setNewRaceName(e.target.value)} placeholder="Race name" className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input type="date" value={newRaceDate} onChange={e => setNewRaceDate(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input type="number" value={newRaceDist} onChange={e => setNewRaceDist(e.target.value)} placeholder="Distance (meters)" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input value={newRaceCity} onChange={e => setNewRaceCity(e.target.value)} placeholder="City" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input value={newRaceCountry} onChange={e => setNewRaceCountry(e.target.value)} placeholder="Country" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input value={newRaceWeb} onChange={e => setNewRaceWeb(e.target.value)} placeholder="Website (optional)" className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={newRaceTri} onChange={e => setNewRaceTri(e.target.checked)} className="rounded" />
                  Triathlon
                </label>
                <p className="text-xs text-foreground-dim">Common distances: 5K=5000, 10K=10000, Half=21097, Marathon=42195, 50K=50000, 50M=80467, 100K=100000, 100M=160934</p>
                <div className="flex gap-2">
                  <button onClick={createRaceAdmin} disabled={creatingRace || !newRaceName || !newRaceDate || !newRaceCity || !newRaceCountry || !newRaceDist} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{creatingRace ? "Creating..." : "Create"}</button>
                  <button onClick={() => setShowCreateRace(false)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                </div>
              </div>
            )}

            {raceViewTab === "pending" && (
              <div>
                {(!data?.pendingRaces || data.pendingRaces.length === 0) ? <p className="text-sm text-foreground-dim">No pending submissions.</p> : (
                  <div className="space-y-3">
                    {data.pendingRaces.map((race) => (
                      <div key={race.id} className="rounded-2xl border border-yellow-700/40 bg-surface p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{race.name}</p>
                            <p className="text-sm text-foreground-dim">{race.city}, {race.country} · {(race.distanceM/1609.34).toFixed(1)} mi{race.isTriathlon ? " · Triathlon" : ""}</p>
                            <p className="text-sm text-foreground-dim">{new Date(race.raceDate).toLocaleDateString()}</p>
                            {race.website && <a href={race.website} target="_blank" rel="noopener noreferrer" className="text-xs text-signal hover:underline">{race.website}</a>}
                          </div>
                          <div className="flex gap-2 flex-wrap justify-end">
                            <button onClick={() => approveRace(race.id,"approve")} className="px-3 py-1.5 rounded-full bg-signal text-background text-xs">Approve</button>
                            <button onClick={() => approveRace(race.id,"reject")} className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs">Reject</button>
                            {confirmDeleteRaceId === race.id ? (
                              <>
                                <button onClick={() => deleteRace(race.id)} disabled={deletingRaceId === race.id} className="px-3 py-1.5 rounded-full bg-red-600 text-white text-xs disabled:opacity-50">{deletingRaceId === race.id ? "..." : "Confirm delete"}</button>
                                <button onClick={() => setConfirmDeleteRaceId(null)} className="px-3 py-1.5 rounded-full border border-border text-xs">Cancel</button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDeleteRaceId(race.id)} className="px-3 py-1.5 rounded-full border border-red-700/40 text-red-400 text-xs">Delete</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {raceViewTab === "active" && (
              <div>
                {!allRacesLoaded ? (
                  <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
                ) : allRaces.filter(r => r.status === "active").length === 0 ? (
                  <p className="text-sm text-foreground-dim">No active races.</p>
                ) : (
                  <div className="space-y-3">
                    {allRaces.filter(r => r.status === "active").map((race) => (
                      <div key={race.id} className="rounded-2xl border border-border bg-surface p-4">
                        {editingRaceId === race.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input value={editRaceName} onChange={e => setEditRaceName(e.target.value)} placeholder="Race name" className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                              <input type="date" value={editRaceDate} onChange={e => setEditRaceDate(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                              <input type="number" value={editRaceDist} onChange={e => setEditRaceDist(e.target.value)} placeholder="Distance (meters)" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                              <input value={editRaceCity} onChange={e => setEditRaceCity(e.target.value)} placeholder="City" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                              <input value={editRaceCountry} onChange={e => setEditRaceCountry(e.target.value)} placeholder="Country" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                              <input value={editRaceWeb} onChange={e => setEditRaceWeb(e.target.value)} placeholder="Website" className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                            </div>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" checked={editRaceTri} onChange={e => setEditRaceTri(e.target.checked)} className="rounded" />
                              Triathlon
                            </label>
                            <div className="flex gap-2">
                              <button onClick={() => saveRaceEdit(race.id)} disabled={savingRaceEdit} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{savingRaceEdit ? "Saving..." : "Save"}</button>
                              <button onClick={() => setEditingRaceId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{race.name}</p>
                              <p className="text-sm text-foreground-dim">{race.city}, {race.country} · {(race.distanceM/1609.34).toFixed(1)} mi{race.isTriathlon ? " · Triathlon" : ""}</p>
                              <p className="text-sm text-foreground-dim">{new Date(race.raceDate).toLocaleDateString()}</p>
                              {race.website && <a href={race.website} target="_blank" rel="noopener noreferrer" className="text-xs text-signal hover:underline">{race.website}</a>}
                            </div>
                            <div className="flex gap-2 flex-wrap justify-end shrink-0">
                              <button onClick={() => { setEditingRaceId(race.id); setEditRaceName(race.name); setEditRaceDate(new Date(race.raceDate).toISOString().split("T")[0]); setEditRaceCity(race.city); setEditRaceCountry(race.country); setEditRaceDist(String(race.distanceM)); setEditRaceWeb(race.website || ""); setEditRaceTri(race.isTriathlon); }} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-signal hover:text-signal transition-colors">Edit</button>
                              {confirmDeleteRaceId === race.id ? (
                                <>
                                  <button onClick={() => deleteRace(race.id)} disabled={deletingRaceId === race.id} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">{deletingRaceId === race.id ? "..." : "Confirm delete"}</button>
                                  <button onClick={() => setConfirmDeleteRaceId(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                                </>
                              ) : (
                                <button onClick={() => setConfirmDeleteRaceId(race.id)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Delete</button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "challenges" && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="font-medium">All Challenges ({filteredChallenges.length})</h2>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { v: "all", l: "All" },
                  { v: "pending", l: "Pending" },
                  { v: "active", l: "Active" },
                  { v: "ended", l: "Ended" },
                  { v: "rejected", l: "Rejected" },
                ].map(f => (
                  <button key={f.v} onClick={() => setChallengeStatusFilter(f.v)} className={"text-xs px-3 py-1 rounded-full border transition-colors " + (challengeStatusFilter === f.v ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
            {!challengesLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : filteredChallenges.length === 0 ? (
              <p className="text-sm text-foreground-dim">No challenges found.</p>
            ) : (
              <div className="space-y-3">
                {filteredChallenges.map((c) => {
                  const isActive = c.status === "approved" && new Date() < new Date(c.endDate);
                  const isEnded = c.status === "approved" && new Date() >= new Date(c.endDate);
                  const isPending = c.status === "pending";
                  const isRejected = c.status === "rejected";
                  const isExpanded = expandedChallengeId === c.id;
                  const statusColor = isPending ? "border-yellow-700/40" : isRejected ? "border-red-700/30 opacity-70" : isEnded ? "border-border opacity-70" : "border-border";
                  return (
                    <div key={c.id} className={"rounded-2xl border bg-surface " + statusColor}>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-medium text-sm">{c.title}</p>
                              {isPending && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-700/40">Pending</span>}
                              {isActive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-300 border border-green-700/40">Active</span>}
                              {isEnded && <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-raised text-foreground-dim border border-border">Ended</span>}
                              {isRejected && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-300 border border-red-700/30">Rejected</span>}
                            </div>
                            <p className="text-xs text-foreground-dim capitalize">{c.teamName} · {c.type} · {c.metric} · {c.unit}{c.goal ? ` · Goal: ${c.goal}` : ""}</p>
                            <p className="text-xs text-foreground-dim">{new Date(c.startDate).toLocaleDateString()} – {new Date(c.endDate).toLocaleDateString()} · {c.participants.length} participant{c.participants.length !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                            {isPending && (
                              <>
                                <button onClick={() => approveChallenge(c.id, "approved")} disabled={approvingChallenge === c.id} className="text-xs px-2.5 py-1 rounded-full bg-signal text-background disabled:opacity-50">
                                  {approvingChallenge === c.id ? "..." : "Approve"}
                                </button>
                                <button onClick={() => approveChallenge(c.id, "rejected")} disabled={approvingChallenge === c.id} className="text-xs px-2.5 py-1 rounded-full border border-red-500/40 text-red-400 disabled:opacity-50">
                                  Reject
                                </button>
                              </>
                            )}
                            <button onClick={() => setExpandedChallengeId(isExpanded ? null : c.id)} className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-surface-raised transition-colors">
                              {isExpanded ? "Collapse" : `Participants (${c.participants.length})`}
                            </button>
                            {confirmDeleteChallengeId === c.id ? (
                              <>
                                <button onClick={() => deleteChallenge(c.id)} disabled={deletingChallengeId === c.id} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">
                                  {deletingChallengeId === c.id ? "..." : "Confirm delete"}
                                </button>
                                <button onClick={() => setConfirmDeleteChallengeId(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                              </>
                            ) : (
                              <button onClick={() => setConfirmDeleteChallengeId(c.id)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                        {c.description && <p className="text-xs text-foreground-dim mt-2">{c.description}</p>}
                        {c.creator && <p className="text-xs text-foreground-dim mt-1">Created by: {c.creator.name || "Unknown"} ({c.creator.email})</p>}
                      </div>
                      {isExpanded && (
                        <div className="border-t border-border px-4 pb-4 pt-3">
                          <p className="text-xs font-medium text-foreground-dim mb-2">Participants ({c.participants.length})</p>
                          {c.participants.length === 0 ? (
                            <p className="text-xs text-foreground-dim">No participants yet.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {c.participants.map((p, i) => {
                                const removeKey = `${c.id}:${p.id}`;
                                return (
                                  <div key={p.id} className="flex items-center justify-between rounded-xl bg-background border border-border px-3 py-2">
                                    <div>
                                      <p className="text-sm font-medium">{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`} {p.name}</p>
                                      <p className="text-xs text-foreground-dim">{p.email} · {p.total} {c.unit} ({p.entryCount} log{p.entryCount !== 1 ? "s" : ""})</p>
                                    </div>
                                    <div className="flex gap-1.5 shrink-0">
                                      {confirmRemoveParticipantKey === removeKey ? (
                                        <>
                                          <button onClick={() => removeParticipantFromChallenge(c.id, p.id)} disabled={removingParticipantKey === removeKey} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">
                                            {removingParticipantKey === removeKey ? "..." : "Confirm"}
                                          </button>
                                          <button onClick={() => setConfirmRemoveParticipantKey(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                                        </>
                                      ) : (
                                        <button onClick={() => setConfirmRemoveParticipantKey(removeKey)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">
                                          Remove
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">All Teams ({teams.length})</h2>
              <button onClick={() => setShowCreateTeam(v => !v)} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium">+ Create team</button>
            </div>
            {showCreateTeam && (
              <div className="rounded-2xl border border-signal/30 bg-surface p-4 mb-4 space-y-3">
                <p className="text-sm font-medium">New team</p>
                <input value={newTeamName} onChange={e=>setNewTeamName(e.target.value)} placeholder="Team name" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                <input value={newTeamDesc} onChange={e=>setNewTeamDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                <div className="flex gap-2">
                  <button onClick={createTeam} disabled={creatingTeam || !newTeamName.trim()} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{creatingTeam ? "Creating..." : "Create"}</button>
                  <button onClick={() => { setShowCreateTeam(false); setNewTeamName(""); setNewTeamDesc(""); }} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                </div>
              </div>
            )}
            {!teamsLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : teams.length === 0 ? (
              <p className="text-sm text-foreground-dim">No teams yet.</p>
            ) : (
              <div className="space-y-4">
                {teams.map(t => {
                  const captain = t.members.find(m => m.userId === t.createdBy);
                  return (
                    <div key={t.id} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-foreground-dim mt-0.5">
                            {captain ? (
                              <>Captain: <span className="text-foreground">{captain.name}</span></>
                            ) : (
                              <span>No captain (admin created)</span>
                            )}
                            {" · "}{t.members.length} member{t.members.length !== 1 ? "s" : ""} · {t.isPrivate ? "Private" : "Public"} · {new Date(t.createdAt).toLocaleDateString()}
                          </p>
                          {captain && (
                            <a href={`mailto:${captain.email}?subject=Train2Race: ${encodeURIComponent(t.name)} Team`} className="text-xs text-signal hover:underline mt-1 block">
                              Email captain ({captain.email})
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <button onClick={() => setAddMemberTeamId(addMemberTeamId === t.id ? null : t.id)} className="text-xs px-2.5 py-1 rounded-full border border-signal/40 text-signal hover:border-signal transition-colors">+ Member</button>
                          <button onClick={() => { setEditingTeamId(editingTeamId === t.id ? null : t.id); setEditTeamName(t.name); setEditTeamDesc(t.description || ""); }} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-signal hover:text-signal transition-colors">Edit</button>
                          {confirmDeleteTeam === t.id ? (
                            <>
                              <button onClick={() => deleteTeam(t.id)} disabled={deletingTeamId === t.id} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">{deletingTeamId === t.id ? "..." : "Confirm delete"}</button>
                              <button onClick={() => setConfirmDeleteTeam(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteTeam(t.id)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Delete team</button>
                          )}
                        </div>
                      </div>
                      {editingTeamId === t.id && (
                        <div className="mb-3 rounded-xl border border-signal/30 bg-background p-3 space-y-2">
                          <p className="text-xs font-medium text-foreground-dim">Edit team</p>
                          <input value={editTeamName} onChange={e => setEditTeamName(e.target.value)} placeholder="Team name" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:border-signal outline-none" autoFocus />
                          <input value={editTeamDesc} onChange={e => setEditTeamDesc(e.target.value)} placeholder="Description (optional)" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:border-signal outline-none" />
                          <div className="flex gap-2">
                            <button onClick={() => saveTeamEdit(t.id)} disabled={savingTeamEdit || !editTeamName.trim()} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{savingTeamEdit ? "Saving..." : "Save"}</button>
                            <button onClick={() => setEditingTeamId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                          </div>
                        </div>
                      )}
                      {addMemberTeamId === t.id && (
                        <div className="flex gap-2 mb-3">
                          <input value={addMemberEmail} onChange={e=>{setAddMemberEmail(e.target.value);setAddMemberMsg("");}} placeholder="User email" className="flex-1 px-3 py-1.5 rounded-xl bg-background border border-border text-xs focus:border-signal outline-none" />
                          <button onClick={() => addMemberToTeam(t.id)} disabled={addingMember || !addMemberEmail.trim()} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{addingMember ? "..." : "Add"}</button>
                        </div>
                      )}
                      {addMemberMsg && addMemberTeamId === t.id && <p className="text-xs text-red-400 mb-2">{addMemberMsg}</p>}
                      <div className="space-y-2">
                        {t.members.map(m => {
                          const removeKey = `${t.id}:${m.userId}:removeMember`;
                          const banKey = `${t.id}:${m.userId}:ban`;
                          return (
                            <div key={m.userId} className={"flex items-center justify-between rounded-xl border px-3 py-2 " + (m.isBanned ? "border-red-800/40 bg-red-900/10" : "border-border bg-background")}>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-medium">{m.name}</p>
                                  {m.role === "admin" && <span className="text-xs px-1.5 py-0.5 rounded bg-signal/20 text-signal">admin</span>}
                                  {m.userId === t.createdBy && <span className="text-xs px-1.5 py-0.5 rounded bg-surface-raised text-foreground-dim border border-border">captain</span>}
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
                                {!m.isBanned ? (
                                  confirmActionKey === banKey ? (
                                    <>
                                      <button onClick={() => handleTeamAction("banUser", t.id, m.userId)} disabled={teamActionKey === banKey} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">{teamActionKey === banKey ? "..." : "Confirm ban"}</button>
                                      <button onClick={() => setConfirmActionKey(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                                    </>
                                  ) : (
                                    <button onClick={() => setConfirmActionKey(banKey)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Ban</button>
                                  )
                                ) : (
                                  <button onClick={() => handleTeamAction("unbanUser", t.id, m.userId)} disabled={teamActionKey === banKey} className="text-xs px-2.5 py-1 rounded-full border border-green-700/40 text-green-400 hover:border-green-500 transition-colors disabled:opacity-40">{teamActionKey === banKey ? "..." : "Unban"}</button>
                                )}
                                {confirmActionKey === removeKey ? (
                                  <>
                                    <button onClick={() => handleTeamAction("removeMember", t.id, m.userId)} disabled={teamActionKey === removeKey} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">{teamActionKey === removeKey ? "..." : "Confirm"}</button>
                                    <button onClick={() => setConfirmActionKey(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                                  </>
                                ) : (
                                  <button onClick={() => setConfirmActionKey(removeKey)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors disabled:opacity-40">Remove</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
