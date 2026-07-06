"use client";
import { useState, useCallback, useEffect } from "react";

const MAJOR_CITIES = new Set([
  "new york","los angeles","chicago","houston","phoenix","philadelphia","san antonio",
  "san diego","dallas","san jose","austin","jacksonville","fort worth","columbus",
  "charlotte","indianapolis","san francisco","seattle","denver","nashville",
  "oklahoma city","el paso","washington","boston","las vegas","portland","louisville",
  "baltimore","milwaukee","albuquerque","tucson","fresno","sacramento","mesa",
  "kansas city","atlanta","omaha","colorado springs","raleigh","miami","minneapolis",
  "tulsa","cleveland","wichita","arlington","new orleans","bakersfield","tampa",
  "honolulu","anaheim","santa ana","corpus christi","riverside","st. louis",
  "pittsburgh","cincinnati","anchorage","greensboro","plano","newark","henderson",
  "lincoln","buffalo","fort wayne","orlando","st. paul","norfolk","chandler",
  "madison","durham","lubbock","scottsdale","irving","chesapeake","fremont",
  "gilbert","san bernardino","baton rouge","birmingham","richmond","spokane",
  "des moines","montgomery","little rock","salt lake city","portland","tacoma",
  "aurora","glendale","hialeah","north las vegas","jersey city","chula vista",
]);

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
  // Messaging
  const [msgTab, setMsgTab] = useState("dm");
  const [dmUserId, setDmUserId] = useState("");
  const [dmContent, setDmContent] = useState("");
  const [sendingDm, setSendingDm] = useState(false);
  const [dmMsg, setDmMsg] = useState({ text: "", ok: false });
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annScheduledFor, setAnnScheduledFor] = useState("");
  const [annExpiry, setAnnExpiry] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);
  const [annMsg, setAnnMsg] = useState({ text: "", ok: false });
  const [adminMsgs, setAdminMsgs] = useState([]);
  const [adminAnns, setAdminAnns] = useState([]);
  const [adminMsgsLoaded, setAdminMsgsLoaded] = useState(false);
  const [inviteRequests, setInviteRequests] = useState([]);
  const [inviteRequestsLoaded, setInviteRequestsLoaded] = useState(false);
  const [fulfillCodes, setFulfillCodes] = useState({});
  const [fulfillingId, setFulfillingId] = useState(null);
  const [decliningId, setDecliningId] = useState(null);
  const [showTeamInviteForm, setShowTeamInviteForm] = useState(false);
  const [teamInviteTeamId, setTeamInviteTeamId] = useState("");
  const [teamInviteExpiry, setTeamInviteExpiry] = useState("");
  const [generatingTeamInvite, setGeneratingTeamInvite] = useState(false);
  const [recentTeamCodes, setRecentTeamCodes] = useState([]);
  const [copiedTeamCode, setCopiedTeamCode] = useState(null);

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
  const [communities, setCommunities] = useState([]);
  const [communitiesLoaded, setCommunitiesLoaded] = useState(false);
  const [commSearch, setCommSearch] = useState("");
  const [commRequests, setCommRequests] = useState([]);
  const [commRequestsLoaded, setCommRequestsLoaded] = useState(false);
  const [approvingReqId, setApprovingReqId] = useState(null);
  const [rejectingReqId, setRejectingReqId] = useState(null);
  const [deletingReqId, setDeletingReqId] = useState(null);
  const [confirmDeleteReqId, setConfirmDeleteReqId] = useState(null);
  const [showCreateComm, setShowCreateComm] = useState(false);
  const [newCommName, setNewCommName] = useState("");
  const [newCommDesc, setNewCommDesc] = useState("");
  const [creatingComm, setCreatingComm] = useState(false);
  const [confirmDeleteCommId, setConfirmDeleteCommId] = useState(null);
  const [deletingCommId, setDeletingCommId] = useState(null);
  const [editingCommId, setEditingCommId] = useState(null);
  const [editCommName, setEditCommName] = useState("");
  const [editCommDesc, setEditCommDesc] = useState("");
  const [savingCommEdit, setSavingCommEdit] = useState(false);
  const [addMemberTeamId, setAddMemberTeamId] = useState(null);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [addMemberMsg, setAddMemberMsg] = useState("");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState("newest");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamSort, setTeamSort] = useState("members");
  const [challengeSearch, setChallengeSearch] = useState("");
  const [ticketStatusFilter, setTicketStatusFilter] = useState("open");
  const [editingTeamId, setEditingTeamId] = useState(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDesc, setEditTeamDesc] = useState("");
  const [savingTeamEdit, setSavingTeamEdit] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("admin");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState({ text: "", ok: false });

  // Race management
  const [allRaces, setAllRaces] = useState([]);
  const [allRacesLoaded, setAllRacesLoaded] = useState(false);
  const [raceViewTab, setRaceViewTab] = useState("pending");
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(null); // "approve" | "reject" | null
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkTargetRaces, setBulkTargetRaces] = useState([]);
  const [pendingSort, setPendingSort] = useState("date_asc"); // date_asc | date_desc
  const [pendingFilter, setPendingFilter] = useState("all"); // all | major_city
  const [rediscovering, setRediscovering] = useState(false);
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
  const [raceSearch, setRaceSearch] = useState("");
  const [raceDistFilter, setRaceDistFilter] = useState("all");
  const [raceYearFilter, setRaceYearFilter] = useState("all");
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newChTeamId, setNewChTeamId] = useState("");
  const [newChTitle, setNewChTitle] = useState("");
  const [newChType, setNewChType] = useState("run");
  const [newChMetric, setNewChMetric] = useState("distance");
  const [newChUnit, setNewChUnit] = useState("mi");
  const [newChGoal, setNewChGoal] = useState("");
  const [newChGoalPerDay, setNewChGoalPerDay] = useState(false);
  const [newChStart, setNewChStart] = useState("");
  const [newChEnd, setNewChEnd] = useState("");
  const [newChDesc, setNewChDesc] = useState("");
  const [creatingCh, setCreatingCh] = useState(false);
  const [createChMsg, setCreateChMsg] = useState("");

  const [stats, setStats] = useState(null);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // Email tab — compose
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailTarget, setEmailTarget] = useState("all");
  const [emailTeamId, setEmailTeamId] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ text: "", ok: false });

  // Email tab — schedule settings
  const [emailScheduleLoaded, setEmailScheduleLoaded] = useState(false);
  const [weeklySummaryEnabled, setWeeklySummaryEnabled] = useState(false);
  const [weeklySummaryDay, setWeeklySummaryDay] = useState("1");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState({ text: "", ok: false });

  useEffect(() => {
    setLoading(true);
    // Try super admin session first (no password needed)
    fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "getData" }) })
      .then(res => {
        if (res.ok) return res.json().then(json => { setData(json); setAuthed(true); setLoading(false); });
        // Fall back to stored password
        const saved = sessionStorage.getItem("adminPw");
        if (!saved) { setLoading(false); return; }
        setPassword(saved);
        return fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: saved, action: "getData" }) })
          .then(r => { if (!r.ok) { sessionStorage.removeItem("adminPw"); throw new Error(); } return r.json(); })
          .then(json => { setData(json); setAuthed(true); setLoading(false); });
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleLogin() {
    setLoading(true); setError("");
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, action: "getData" }),
    });
    if (!res.ok) { setError("Wrong password"); setLoading(false); return; }
    const json = await res.json();
    sessionStorage.setItem("adminPw", password);
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

  function initBulkConfirm(action, races) {
    setBulkTargetRaces(races);
    setBulkConfirm(action);
  }

  async function bulkAction(action) {
    setBulkProcessing(true);
    setBulkConfirm(null);
    await Promise.all(bulkTargetRaces.map(r => approveRace(r.id, action)));
    setBulkProcessing(false);
    setBulkTargetRaces([]);
  }

  async function rediscoverRaces() {
    setRediscovering(true);
    setDiscoverResult(null);
    const res = await fetch("\api\admin\races", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "rediscover" }) });
    const d = await res.json();
    setDiscoverResult({ ...d, cleared: d.cleared });
    setRediscovering(false);
    refreshData();
  }

  async function discoverRaces() {
    setDiscovering(true);
    setDiscoverResult(null);
    const res = await fetch("/api/admin/races", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "discover" }) });
    const d = await res.json();
    setDiscoverResult(d);
    setDiscovering(false);
    if (d.created > 0) refreshData();
  }

  async function approveRace(raceId, action) {
    await fetch("/api/admin/races", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, raceId, action }) });
    setData(prev => prev ? { ...prev, pendingRaces: prev.pendingRaces.filter(r => r.id !== raceId) } : prev);
    setAllRaces(prev => prev.map(r => r.id === raceId ? { ...r, status: action === "approve" ? "active" : "rejected" } : r));
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

  async function resetPlanGenerations(userId) {
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "resetPlanGenerations", userId }) });
    if (res.ok) { setUserMsg(userId, "Plan generations reset to 0", true); setData(prev => ({ ...prev, users: prev.users.map(u => u.id === userId ? { ...u, planGenerationCount: 0 } : u) })); }
    else setUserMsg(userId, "Failed to reset", false);
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

  function copyCode(code) { navigator.clipboard.writeText(`${window.location.origin}/signup?invite=${code}`); setCopied(code); setTimeout(() => setCopied(null), 2000); }

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

  async function loadAdminMsgsData() {
    const res = await fetch(`/api/admin/messages?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setAdminMsgs(d.messages || []);
    setAdminAnns(d.announcements || []);
    setAdminMsgsLoaded(true);
  }

  async function loadAdminMsgs() {
    if (adminMsgsLoaded) return;
    await loadAdminMsgsData();
  }

  async function sendDm() {
    if (!dmUserId || !dmContent.trim()) return;
    setSendingDm(true); setDmMsg({ text: "", ok: false });
    const res = await fetch("/api/admin/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "dm", toUserId: dmUserId, content: dmContent }) });
    setSendingDm(false);
    if (res.ok) { setDmMsg({ text: "Message sent!", ok: true }); setDmContent(""); setDmUserId(""); await loadAdminMsgsData(); }
    else { const d = await res.json(); setDmMsg({ text: d.error || "Failed", ok: false }); }
  }

  async function postAnnouncement() {
    if (!annContent.trim()) return;
    setPostingAnn(true); setAnnMsg({ text: "", ok: false });
    const res = await fetch("/api/admin/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "announce", title: annTitle, content: annContent, scheduledFor: annScheduledFor || null, expiresAt: annExpiry || null }) });
    setPostingAnn(false);
    if (res.ok) { setAnnMsg({ text: "Announcement posted!", ok: true }); setAnnTitle(""); setAnnContent(""); setAnnScheduledFor(""); setAnnExpiry(""); await loadAdminMsgsData(); }
    else { const d = await res.json(); setAnnMsg({ text: d.error || "Failed — " + (d.error || "check console"), ok: false }); }
  }

  async function deleteAdminMsg(id, type) {
    await fetch("/api/admin/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id, type }) });
    if (type === "dm") setAdminMsgs(prev => prev.filter(m => m.id !== id));
    else setAdminAnns(prev => prev.filter(a => a.id !== id));
  }

  async function loadTickets() {
    if (ticketsLoaded) return;
    const res = await fetch(`/api/admin/tickets?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setTickets(d.tickets || []);
    setTicketsLoaded(true);
  }

  async function createPublicChallenge() {
    if (!newChTeamId || !newChTitle || !newChStart || !newChEnd) return;
    setCreatingCh(true); setCreateChMsg("");
    const res = await fetch("/api/admin/challenges", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "createChallenge", teamId: newChTeamId, title: newChTitle, type: newChType, metric: newChMetric, unit: newChUnit, goal: newChGoal || null, goalPerDay: newChMetric === "count" && newChGoalPerDay, startDate: newChStart, endDate: newChEnd, description: newChDesc || null }) });
    const d = await res.json();
    setCreatingCh(false);
    if (res.ok) { setAllChallenges(prev => [d.challenge, ...prev]); setShowCreateChallenge(false); setNewChTitle(""); setNewChGoal(""); setNewChGoalPerDay(false); setNewChStart(""); setNewChEnd(""); setNewChDesc(""); setCreateChMsg(""); }
    else setCreateChMsg(d.error || "Failed to create challenge.");
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

  async function loadCommunities() {
    if (communitiesLoaded) return;
    const res = await fetch(`/api/admin/teams?password=${encodeURIComponent(password)}&community=true`);
    const d = await res.json();
    setCommunities(d.teams || []);
    setCommunitiesLoaded(true);
  }

  async function loadCommRequests() {
    const res = await fetch(`/api/admin/community-requests?password=${encodeURIComponent(password)}`);
    const d = await res.json().catch(() => ({}));
    setCommRequests(d.requests || []);
    setCommRequestsLoaded(true);
  }

  async function approveRequest(id) {
    setApprovingReqId(id);
    const res = await fetch("/api/admin/community-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id, action: "approve" }) });
    const d = await res.json().catch(() => ({}));
    setApprovingReqId(null);
    if (res.ok) {
      setCommRequests(prev => prev.map(r => r.id === id ? { ...r, status: "approved", teamId: d.teamId } : r));
      setCommunitiesLoaded(false);
    }
  }

  async function rejectRequest(id) {
    setRejectingReqId(id);
    await fetch("/api/admin/community-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id, action: "reject" }) });
    setRejectingReqId(null);
    setCommRequests(prev => prev.map(r => r.id === id ? { ...r, status: "rejected" } : r));
  }

  async function deleteRequest(id) {
    setDeletingReqId(id);
    await fetch("/api/admin/community-requests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id }) });
    setDeletingReqId(null);
    setConfirmDeleteReqId(null);
    setCommRequests(prev => prev.filter(r => r.id !== id));
  }

  async function createCommunity() {
    if (!newCommName.trim()) return;
    setCreatingComm(true);
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "createTeam", name: newCommName.trim(), description: newCommDesc.trim() || null, isCommunity: true }) });
    const d = await res.json().catch(() => ({}));
    setCreatingComm(false);
    if (res.ok && d.team) { setCommunities(prev => [{ ...d.team, members: [] }, ...prev]); setNewCommName(""); setNewCommDesc(""); setShowCreateComm(false); }
  }

  async function deleteCommunity(teamId) {
    setDeletingCommId(teamId);
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "deleteTeam", teamId }) });
    setDeletingCommId(null);
    setConfirmDeleteCommId(null);
    if (res.ok) setCommunities(prev => prev.filter(c => c.id !== teamId));
  }

  async function saveCommEdit(teamId) {
    if (!editCommName.trim()) return;
    setSavingCommEdit(true);
    const res = await fetch("/api/admin/teams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "editTeam", teamId, name: editCommName.trim(), description: editCommDesc.trim() || null }) });
    setSavingCommEdit(false);
    if (res.ok) {
      setCommunities(prev => prev.map(c => c.id === teamId ? { ...c, name: editCommName.trim(), description: editCommDesc.trim() || null } : c));
      setEditingCommId(null);
    }
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

  async function createUser() {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) return;
    setCreatingUser(true); setCreateUserMsg({ text: "", ok: false });
    const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, action: "createUser", name: newUserName.trim(), email: newUserEmail.trim(), newPassword: newUserPassword, role: newUserRole }) });
    const d = await res.json();
    setCreatingUser(false);
    if (res.ok && d.user) {
      setCreateUserMsg({ text: `Account created: ${d.user.email}`, ok: true });
      setData(prev => prev ? { ...prev, users: [{ ...d.user, raceTargets: [], _count: { activities: 0 }, connections: [] }, ...prev.users] } : prev);
      setNewUserName(""); setNewUserEmail(""); setNewUserPassword("");
    } else {
      setCreateUserMsg({ text: d.error || "Failed to create account", ok: false });
    }
  }

  async function loadInviteRequests() {
    if (inviteRequestsLoaded) return;
    const res = await fetch(`/api/admin/invite-requests?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setInviteRequests(d.requests || []);
    setInviteRequestsLoaded(true);
  }

  async function fulfillRequest(id, action = "fulfill") {
    setFulfillingId(id);
    const res = await fetch("/api/admin/invite-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id, action }) });
    const d = await res.json();
    setFulfillingId(null);
    if (d.code) {
      setFulfillCodes(prev => ({ ...prev, [id]: { code: d.code, emailError: d.emailError || null } }));
      setInviteRequests(prev => prev.map(r => r.id === id ? { ...r, status: "sent", inviteCode: d.code } : r));
    }
  }

  async function declineRequest(id) {
    setDecliningId(id);
    await fetch("/api/admin/invite-requests", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id, action: "decline" }) });
    setDecliningId(null);
    setInviteRequests(prev => prev.map(r => r.id === id ? { ...r, status: "declined" } : r));
  }

  async function deleteInviteRequest(id) {
    await fetch("/api/admin/invite-requests", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, id }) });
    setInviteRequests(prev => prev.filter(r => r.id !== id));
  }

  async function generateTeamInvite() {
    const team = teams.find(t => t.id === teamInviteTeamId);
    if (!team) return;
    setGeneratingTeamInvite(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, count: 1, teamId: team.id, teamName: team.name, expiresAt: teamInviteExpiry || null }),
    });
    const d = await res.json();
    const newCode = d.codes?.[0];
    if (newCode) {
      setRecentTeamCodes(prev => [{ code: newCode.code, teamId: team.id, teamName: team.name }, ...prev]);
    }
    await refreshData();
    setGeneratingTeamInvite(false);
  }

  function copyTeamCode(code) {
    navigator.clipboard.writeText(`${window.location.origin}/signup?invite=${code}`);
    setCopiedTeamCode(code);
    setTimeout(() => setCopiedTeamCode(null), 2000);
  }

  async function loadStats() {
    if (statsLoaded) return;
    setStatsLoading(true);
    const res = await fetch(`/api/admin/stats?password=${encodeURIComponent(password)}`);
    const d = await res.json();
    setStats(d);
    setStatsLoaded(true);
    setStatsLoading(false);
  }

  async function loadEmailSchedule() {
    if (emailScheduleLoaded) return;
    const res = await fetch(`/api/admin/email-settings?password=${encodeURIComponent(password)}`);
    if (res.ok) {
      const d = await res.json();
      setWeeklySummaryEnabled(!!d.weeklySummaryEnabled);
      setWeeklySummaryDay(d.weeklySummaryDay ?? "1");
    }
    setEmailScheduleLoaded(true);
  }

  async function saveEmailSchedule() {
    setSavingSchedule(true);
    setScheduleMsg({ text: "", ok: false });
    const res = await fetch("/api/admin/email-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, weeklySummaryEnabled, weeklySummaryDay }),
    });
    setSavingSchedule(false);
    setScheduleMsg(res.ok ? { text: "Saved.", ok: true } : { text: "Failed to save.", ok: false });
    setTimeout(() => setScheduleMsg({ text: "", ok: false }), 3000);
  }

  async function sendEmailBroadcast() {
    if (!emailSubject.trim() || !emailBody.trim()) return;
    if (emailTarget === "team" && !emailTeamId) return;
    setSendingEmail(true);
    setEmailMsg({ text: "", ok: false });
    const res = await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, subject: emailSubject, message: emailBody, target: emailTarget, teamId: emailTeamId || undefined }),
    });
    const d = await res.json();
    setSendingEmail(false);
    if (res.ok) {
      setEmailMsg({ text: `Sent to ${d.sent} recipient${d.sent !== 1 ? "s" : ""}${d.failed > 0 ? ` (${d.failed} failed)` : ""}.`, ok: true });
      setEmailSubject("");
      setEmailBody("");
    } else {
      setEmailMsg({ text: d.error || "Failed to send.", ok: false });
    }
  }

  function switchTab(id) {
    setActiveTab(id);
    if (id === "challenges") { loadChallenges(); loadTeams(); }
    if (id === "tickets") loadTickets();
    if (id === "teams") loadTeams();
    if (id === "invites") loadTeams();
    if (id === "communities") { loadCommunities(); loadCommRequests(); }
    if (id === "races") loadAllRaces();
    if (id === "messages") loadAdminMsgs();
    if (id === "requests") loadInviteRequests();
    if (id === "stats") loadStats();
    if (id === "email") { loadTeams(); loadEmailSchedule(); }
  }

  if (!authed && loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-sm text-foreground-dim">Loading...</p></div>;
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

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const filteredUsers = (data?.users || [])
    .filter(u => {
      if (!userSearch) return true;
      const q = userSearch.toLowerCase();
      return (u.name || "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (userSort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (userSort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (userSort === "name") return (a.name || "").localeCompare(b.name || "");
      if (userSort === "races") return (b.raceTargets?.length || 0) - (a.raceTargets?.length || 0);
      if (userSort === "active") return (b._count?.activities || 0) - (a._count?.activities || 0);
      return 0;
    });

  const filteredTeams = teams
    .filter(t => {
      if (!teamSearch) return true;
      const q = teamSearch.toLowerCase();
      return t.name.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (teamSort === "members") return b.members.length - a.members.length;
      if (teamSort === "name") return a.name.localeCompare(b.name);
      if (teamSort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

  const displayedPending = (() => {
    const races = [...(data?.pendingRaces || [])];
    const filtered = pendingFilter === "major_city"
      ? races.filter(r => MAJOR_CITIES.has((r.city || "").toLowerCase()))
      : races;
    return filtered.sort((a, b) => {
      const da = new Date(a.raceDate).getTime();
      const db = new Date(b.raceDate).getTime();
      return pendingSort === "date_asc" ? da - db : db - da;
    });
  })();

  const filteredChallenges = allChallenges.filter(c => {
    if (challengeStatusFilter === "all") return true;
    if (challengeStatusFilter === "pending") return c.status === "pending";
    if (challengeStatusFilter === "active") return c.status === "approved" && new Date() < new Date(c.endDate);
    if (challengeStatusFilter === "ended") return c.status === "approved" && new Date() >= new Date(c.endDate);
    if (challengeStatusFilter === "rejected") return c.status === "rejected";
    return true;
  });

  const filteredChallengesSearched = filteredChallenges.filter(c => {
    if (!challengeSearch) return true;
    const q = challengeSearch.toLowerCase();
    return c.title.toLowerCase().includes(q) || (c.teamName || "").toLowerCase().includes(q);
  });

  const filteredTickets = tickets.filter(t =>
    ticketStatusFilter === "all" ? true : t.status === ticketStatusFilter
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <button onClick={() => { sessionStorage.removeItem("adminPw"); setAuthed(false); setData(null); setPassword(""); }} className="px-4 py-2 rounded-full border border-border text-sm">Sign out</button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total users", value: data?.users?.length || 0 },
            { label: "Activities logged", value: data?.activityCount || 0 },
            { label: "Race plans", value: data?.raceCount || 0 },
            { label: "Teams", value: data?.teamCount ?? teams.length },
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
            { id: "messages", label: "Messages" },
            { id: "requests", label: "Requests" + (inviteRequestsLoaded && inviteRequests.filter(r=>r.status==="pending").length > 0 ? " (" + inviteRequests.filter(r=>r.status==="pending").length + ")" : "") },
            { id: "challenges", label: "Challenges" + (challengesLoaded && pendingChallengeCount > 0 ? " (" + pendingChallengeCount + " pending)" : "") },
            { id: "tickets", label: "Tickets" + (tickets.filter(t=>t.status==="open").length > 0 ? " ("+tickets.filter(t=>t.status==="open").length+")" : "") },
            { id: "teams", label: "Teams (" + teams.length + ")" },
            { id: "communities", label: "Communities" + (communitiesLoaded ? " (" + communities.length + ")" : "") + (commRequests.filter(r => r.status === "pending").length > 0 ? " · " + commRequests.filter(r => r.status === "pending").length + " pending" : "") },
            { id: "settings", label: "Settings" },
            { id: "stats", label: "Stats" },
            { id: "email", label: "Email" },
          ].map(tab => (
            <button key={tab.id} onClick={() => switchTab(tab.id)} className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (activeTab===tab.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none"
                autoFocus
              />
              <select value={userSort} onChange={e => setUserSort(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Name A–Z</option>
                <option value="races">Most races</option>
                <option value="active">Most active</option>
              </select>
            </div>
            {userSearch && (
              <p className="text-xs text-foreground-dim mb-3">{filteredUsers.length} of {data?.users?.length || 0} users</p>
            )}
            <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-medium">{user.name || "No name"}</p>
                      {new Date(user.createdAt).getTime() > sevenDaysAgo && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">New</span>
                      )}
                      {user.role === "admin" && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/40">Admin</span>}
                      {user.role === "superadmin" && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-300 border border-purple-700/40">Superadmin</span>}
                      {user.role === "test" && <span className="text-xs px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-300 border border-yellow-700/40">Test</span>}
                    </div>
                    <a href={`mailto:${user.email}`} className="text-sm text-foreground-dim hover:text-signal transition-colors">{user.email}</a>
                    <p className="text-xs text-foreground-dim mt-0.5">
                      Joined {new Date(user.createdAt).toLocaleDateString()} · {user.raceTargets?.length || 0} race{user.raceTargets?.length !== 1 ? "s" : ""} · {user._count?.activities || 0} activities
                      {" · "}
                      <span className={(user.planGenerationCount || 0) >= 3 ? "text-red-400 font-medium" : ""}>{user.planGenerationCount || 0}/3 plan generations</span>
                      {(user.planGenerationCount || 0) >= 3 && (
                        <button onClick={() => resetPlanGenerations(user.id)} className="ml-2 text-signal hover:underline">Reset</button>
                      )}
                    </p>
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
                      Change password
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
                  <div className="mt-3 rounded-xl border border-border bg-background p-3">
                    <p className="text-xs text-foreground-dim mb-2">Set a new password for <strong>{user.name || user.email}</strong>. This permanently replaces their current password.</p>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={tempPassword}
                        onChange={e => setTempPassword(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && setTempPw(user.id)}
                        placeholder="New password (min 6 chars)"
                        className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm"
                        autoFocus
                      />
                      <button onClick={() => setTempPw(user.id)} disabled={tempPassword.length < 6} className="px-4 py-2 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-50">Save</button>
                      <button onClick={() => { setSettingPwFor(null); setTempPassword(""); }} className="px-3 py-2 rounded-full border border-border text-xs">Cancel</button>
                    </div>
                  </div>
                )}
                {userMsgs[user.id] && (
                  <p className={"text-xs mt-2 " + (userMsgs[user.id].ok ? "text-signal" : "text-red-400")}>
                    {userMsgs[user.id].msg}
                  </p>
                )}
              </div>
            ))}
            {filteredUsers.length === 0 && userSearch && (
              <p className="text-sm text-foreground-dim py-4 text-center">No users match "{userSearch}"</p>
            )}
            </div>
          </div>
        )}

        {activeTab === "invites" && (
          <div>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Regular invite codes */}
              <div className="rounded-2xl border border-border bg-surface p-5">
                <h2 className="font-medium mb-1">Generate invite codes</h2>
                <p className="text-xs text-foreground-dim mb-4">Single-use codes for app registration only.</p>
                <div className="flex gap-3 items-center">
                  <label className="text-sm text-foreground-dim">Count:</label>
                  <input type="number" min={1} max={20} value={genCount} onChange={e => setGenCount(Number(e.target.value))} className="w-16 px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none"/>
                  <button onClick={generateInvites} disabled={generating} className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{generating ? "Generating..." : "Generate"}</button>
                </div>
                {newCodes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs text-foreground-dim mb-2">New codes — click to copy signup link</p>
                    <div className="flex flex-wrap gap-2">
                      {newCodes.map(code => <button key={code} onClick={() => copyCode(code)} className="px-3 py-1.5 rounded-xl bg-background border border-signal text-sm font-mono">{copied===code?"Copied!":code}</button>)}
                    </div>
                  </div>
                )}
              </div>

              {/* Team invite link */}
              <div className="rounded-2xl border border-signal/30 bg-signal/5 p-5">
                <h2 className="font-medium mb-1">Generate team invite link</h2>
                <p className="text-xs text-foreground-dim mb-4">Reusable link — anyone who signs up with it is automatically added to the team.</p>
                {!showTeamInviteForm ? (
                  <button onClick={() => setShowTeamInviteForm(true)} className="px-4 py-2 rounded-full border border-signal/50 text-signal text-sm hover:bg-signal/10">+ Create team link</button>
                ) : (
                  <div className="space-y-3">
                    <select value={teamInviteTeamId} onChange={e => setTeamInviteTeamId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                      <option value="">— Select a team —</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.members.length} member{t.members.length !== 1 ? "s" : ""})</option>)}
                    </select>
                    <div>
                      <label className="text-xs text-foreground-dim block mb-1">Expires (optional)</label>
                      <input type="datetime-local" value={teamInviteExpiry} onChange={e => setTeamInviteExpiry(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none"/>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={generateTeamInvite} disabled={generatingTeamInvite || !teamInviteTeamId} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">{generatingTeamInvite ? "Generating…" : "Generate link"}</button>
                      <button onClick={() => { setShowTeamInviteForm(false); setTeamInviteTeamId(""); setTeamInviteExpiry(""); }} className="px-4 py-2 rounded-full border border-border text-sm">Cancel</button>
                    </div>
                  </div>
                )}
                {recentTeamCodes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-foreground-dim">Generated links — click to copy</p>
                    {recentTeamCodes.map((tc, i) => (
                      <div key={i} className="rounded-xl bg-background border border-border px-3 py-2">
                        <p className="text-xs text-foreground-dim mb-1">{tc.teamName}</p>
                        <button onClick={() => copyTeamCode(tc.code)} className="text-sm font-mono text-signal hover:underline">
                          {copiedTeamCode === tc.code ? "Link copied!" : `…/signup?invite=${tc.code}`}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Team invite codes (reusable) */}
            {unusedCodes.filter(c => c.reusable).length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium mb-2">Active team invite links ({unusedCodes.filter(c => c.reusable).length})</h3>
                <div className="space-y-2">
                  {unusedCodes.filter(c => c.reusable).map(invite => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-signal/20 bg-signal/5 px-4 py-3">
                      <div className="flex items-center gap-3 flex-wrap min-w-0">
                        <span className="font-mono text-sm">{invite.code}</span>
                        {invite.note && <span className="text-xs text-signal">{invite.note}</span>}
                        <button onClick={() => copyCode(invite.code)} className="text-xs text-foreground-dim">{copied===invite.code?"Copied!":"Copy link"}</button>
                      </div>
                      <button onClick={() => deleteInvite(invite.id)} disabled={deletingId===invite.id} className="text-xs text-red-400 shrink-0">Revoke</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Regular unused codes */}
            {unusedCodes.filter(c => !c.reusable).length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-foreground-dim mb-2">Unused invite codes ({unusedCodes.filter(c => !c.reusable).length})</h3>
                <div className="space-y-2">
                  {unusedCodes.filter(c => !c.reusable).map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{invite.code}</span>
                        <button onClick={() => copyCode(invite.code)} className="text-xs text-foreground-dim">{copied===invite.code?"Copied!":"Copy"}</button>
                      </div>
                      <button onClick={() => deleteInvite(invite.id)} disabled={deletingId===invite.id} className="text-xs text-red-400">Delete</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {usedCodes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-foreground-dim mb-2">Used ({usedCodes.length})</h3>
                <div className="space-y-2">
                  {usedCodes.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sm text-foreground-dim line-through">{invite.code}</span>
                        {invite.note && <span className="text-xs text-foreground-dim">{invite.note}</span>}
                        <div className="text-xs text-foreground-dim">
                          {invite.usedByUser ? (
                            <span>{invite.usedByUser.name || "No name"} &middot; {invite.usedByUser.email}</span>
                          ) : (
                            <span>Unknown user</span>
                          )}
                        </div>
                      </div>
                      {invite.usedAt && <span className="text-xs text-foreground-dim shrink-0">{new Date(invite.usedAt).toLocaleDateString()}</span>}
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
                  { id: "active", label: `All races (${allRaces.filter(r => r.status === "active").length || "..."})` },
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
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <p className="text-sm text-foreground-dim">
                    {pendingFilter !== "all"
                      ? `${displayedPending.length} / ${data?.pendingRaces?.length || 0} pending`
                      : `${data?.pendingRaces?.length || 0} pending`}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <button onClick={refreshData} className="text-xs text-signal hover:underline">Refresh</button>
                    <button onClick={discoverRaces} disabled={discovering || rediscovering} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{discovering ? "Discovering…" : "Discover races now"}</button>
                    <button onClick={rediscoverRaces} disabled={rediscovering || discovering} className="text-xs px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 disabled:opacity-50" title="Clears all pending auto-discovered races and re-runs discovery with corrected distance parsing">{rediscovering ? "Re-running…" : "Fix & Rediscover ↺"}</button>
                  </div>
                </div>
                {discoverResult && (
                  <div className={"mb-3 text-xs rounded-xl px-3 py-2 border " + (discoverResult.errors?.length ? "border-yellow-700/40 bg-yellow-900/10 text-yellow-300" : "border-signal/30 bg-signal/5 text-signal")}>
                    {discoverResult.cleared != null && <span className="mr-2 opacity-70">Cleared {discoverResult.cleared} · </span>}
                    {discoverResult.created > 0 ? `Added ${discoverResult.created} new race${discoverResult.created !== 1 ? "s" : ""}` : "No new races found"} · {discoverResult.skipped} skipped
                    {discoverResult.errors?.length > 0 && <span className="ml-2 text-red-400">· {discoverResult.errors.length} error(s)</span>}
                  </div>
                )}
                {data?.pendingRaces?.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="flex gap-1">
                        <button onClick={() => setPendingFilter("all")}
                          className={"text-xs px-2.5 py-1 rounded-full border " + (pendingFilter === "all" ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                          All
                        </button>
                        <button onClick={() => setPendingFilter("major_city")}
                          className={"text-xs px-2.5 py-1 rounded-full border " + (pendingFilter === "major_city" ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                          Major cities
                        </button>
                      </div>
                      <button
                        onClick={() => setPendingSort(s => s === "date_asc" ? "date_desc" : "date_asc")}
                        className="text-xs px-2.5 py-1 rounded-full border border-border hover:bg-surface ml-auto">
                        Date {pendingSort === "date_asc" ? "↑ Soonest first" : "↓ Latest first"}
                      </button>
                    </div>
                    <div className="mb-3">
                      {bulkConfirm ? (
                        <div className="rounded-xl border border-yellow-700/40 bg-yellow-900/10 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                          <p className="text-sm text-yellow-200">
                            {bulkConfirm === "approve"
                              ? `Approve ${bulkTargetRaces.length} race${bulkTargetRaces.length !== 1 ? "s" : ""}? This will make them visible to all users.`
                              : `Reject ${bulkTargetRaces.length} race${bulkTargetRaces.length !== 1 ? "s" : ""}?`}
                          </p>
                          <div className="flex gap-2 shrink-0">
                            <button onClick={() => bulkAction(bulkConfirm)} disabled={bulkProcessing}
                              className={"px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-50 " + (bulkConfirm === "approve" ? "bg-signal text-background" : "bg-red-600 text-white")}>
                              {bulkProcessing ? "Processing…" : "Confirm"}
                            </button>
                            <button onClick={() => { setBulkConfirm(null); setBulkTargetRaces([]); }} className="px-3 py-1.5 rounded-full border border-border text-xs">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button onClick={() => initBulkConfirm("approve", displayedPending)}
                            className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium">
                            Approve All ({displayedPending.length})
                          </button>
                          <button onClick={() => initBulkConfirm("reject", displayedPending)}
                            className="px-3 py-1.5 rounded-full border border-red-500/40 text-red-400 text-xs">
                            Reject All ({displayedPending.length})
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {displayedPending.length === 0 ? (
                  <p className="text-sm text-foreground-dim">
                    {data?.pendingRaces?.length ? "No races match the current filter." : "No pending submissions."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {displayedPending.map((race) => (
                      <div key={race.id} className="rounded-2xl border border-yellow-700/40 bg-surface p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                              <p className="font-medium">{race.name}</p>
                              {race.source === "runsignup" && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-300 border border-blue-700/40">Auto-discovered</span>}
                            </div>
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
                <div className="space-y-2 mb-3">
                  <input
                    value={raceSearch} onChange={e => setRaceSearch(e.target.value)}
                    placeholder="Search by name or city..."
                    className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {[["all","All"],["5K","5K"],["10K","10K"],["half","Half"],["marathon","Marathon"],["ultra","Ultra"],["tri","Triathlon"]].map(([v,l]) => (
                      <button key={v} onClick={() => setRaceDistFilter(v)} className={"text-xs px-2.5 py-1 rounded-full border transition-colors " + (raceDistFilter === v ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>{l}</button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[["all","Any year"],["2026","2026"],["2027","2027"]].map(([v,l]) => (
                      <button key={v} onClick={() => setRaceYearFilter(v)} className={"text-xs px-2.5 py-1 rounded-full border transition-colors " + (raceYearFilter === v ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>{l}</button>
                    ))}
                  </div>
                </div>
                {!allRacesLoaded ? (
                  <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
                ) : (() => {
                  const activeRaces = allRaces.filter(r => {
                    if (r.status !== "active") return false;
                    if (raceSearch) {
                      const q = raceSearch.toLowerCase();
                      if (!r.name.toLowerCase().includes(q) && !r.city?.toLowerCase().includes(q)) return false;
                    }
                    if (raceYearFilter !== "all" && new Date(r.raceDate).getFullYear() !== parseInt(raceYearFilter)) return false;
                    if (raceDistFilter !== "all") {
                      if (raceDistFilter === "tri") { if (!r.isTriathlon) return false; }
                      else if (raceDistFilter === "5K") { if (r.distanceM < 4000 || r.distanceM > 7000 || r.isTriathlon) return false; }
                      else if (raceDistFilter === "10K") { if (r.distanceM < 7000 || r.distanceM > 15000 || r.isTriathlon) return false; }
                      else if (raceDistFilter === "half") { if (r.distanceM < 15000 || r.distanceM > 30000 || r.isTriathlon) return false; }
                      else if (raceDistFilter === "marathon") { if (r.distanceM < 30000 || r.distanceM > 50000 || r.isTriathlon) return false; }
                      else if (raceDistFilter === "ultra") { if (r.distanceM < 50000 || r.isTriathlon) return false; }
                    }
                    return true;
                  });
                  return activeRaces.length === 0 ? (
                  <p className="text-sm text-foreground-dim">No races match these filters.</p>
                ) : (
                  <>
                  <p className="text-xs text-foreground-dim mb-2">{activeRaces.length} races</p>
                  <div className="space-y-3">
                    {activeRaces.map((race) => (
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
                  </>
                );
                })()}
              </div>
            )}
          </div>
        )}

        {activeTab === "challenges" && (
          <div>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-medium">All Challenges ({filteredChallengesSearched.length})</h2>
              <button onClick={() => { setShowCreateChallenge(v => !v); setCreateChMsg(""); }} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium">+ Create challenge</button>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <input
                value={challengeSearch}
                onChange={e => setChallengeSearch(e.target.value)}
                placeholder="Search by title or team..."
                className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none"
              />
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { v: "all", l: "All" },
                  { v: "pending", l: "Pending" + (allChallenges.filter(c=>c.status==="pending").length > 0 ? ` (${allChallenges.filter(c=>c.status==="pending").length})` : "") },
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
            {showCreateChallenge && (
              <div className="rounded-2xl border border-signal/30 bg-surface p-4 mb-4 space-y-3">
                <p className="text-sm font-medium">Create public challenge (goes live immediately)</p>
                <div className="grid grid-cols-2 gap-2">
                  <select value={newChTeamId} onChange={e => setNewChTeamId(e.target.value)} className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                    <option value="">— Select team —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={newChTitle} onChange={e => setNewChTitle(e.target.value)} placeholder="Challenge title" className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <select value={newChType} onChange={e => { const t = e.target.value; setNewChType(t); if (newChMetric === "count") setNewChUnit(t === "walk" ? "steps" : "sessions"); }} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                    <option value="run">Run</option><option value="walk">Walk</option><option value="swim">Swim</option><option value="bike">Bike</option><option value="custom">Custom</option>
                  </select>
                  <select value={newChMetric} onChange={e => { const m = e.target.value; setNewChMetric(m); setNewChUnit(m === "distance" ? "mi" : m === "duration" ? "min" : newChType === "walk" ? "steps" : "sessions"); setNewChGoalPerDay(false); }} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                    <option value="distance">Distance</option><option value="duration">Duration</option><option value="count">Count</option>
                  </select>
                  <select value={newChUnit} onChange={e => setNewChUnit(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                    {(newChMetric === "distance" ? ["mi","km"] : newChMetric === "duration" ? ["min"] : newChType === "walk" ? ["steps"] : ["sessions"]).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" value={newChGoal} onChange={e => setNewChGoal(e.target.value)} placeholder="Goal (required)" className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <label className="flex items-center gap-2 text-sm col-span-2"><input type="checkbox" checked={newChGoalPerDay} onChange={e => setNewChGoalPerDay(e.target.checked)} /> Per day goal</label>
                  <input type="date" value={newChStart} onChange={e => setNewChStart(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input type="date" value={newChEnd} onChange={e => setNewChEnd(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                  <input value={newChDesc} onChange={e => setNewChDesc(e.target.value)} placeholder="Description (optional)" className="col-span-2 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                </div>
                {createChMsg && <p className="text-xs text-red-400">{createChMsg}</p>}
                <div className="flex gap-2">
                  <button onClick={createPublicChallenge} disabled={creatingCh || !newChTeamId || !newChTitle || !newChGoal || !newChStart || !newChEnd} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{creatingCh ? "Creating..." : "Create"}</button>
                  <button onClick={() => { setShowCreateChallenge(false); setCreateChMsg(""); }} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                </div>
              </div>
            )}
            {!challengesLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : filteredChallengesSearched.length === 0 ? (
              <p className="text-sm text-foreground-dim">No challenges found.</p>
            ) : (
              <div className="space-y-3">
                {filteredChallengesSearched.map((c) => {
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
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="font-medium">Support Tickets</h2>
              {ticketsLoaded && <span className="text-xs text-foreground-dim">{filteredTickets.length} shown · {tickets.filter(t=>t.status==="open").length} open</span>}
            </div>
            {ticketsLoaded && (
              <div className="flex gap-1.5 flex-wrap mb-4">
                {[
                  { v: "open", l: "Open" + (tickets.filter(t=>t.status==="open").length > 0 ? ` (${tickets.filter(t=>t.status==="open").length})` : "") },
                  { v: "in_progress", l: "In progress" },
                  { v: "resolved", l: "Resolved" },
                  { v: "closed", l: "Closed" },
                  { v: "all", l: "All" },
                ].map(f => (
                  <button key={f.v} onClick={() => setTicketStatusFilter(f.v)} className={"text-xs px-3 py-1 rounded-full border transition-colors " + (ticketStatusFilter === f.v ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                    {f.l}
                  </button>
                ))}
              </div>
            )}
            {!ticketsLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : filteredTickets.length === 0 ? <p className="text-sm text-foreground-dim">{tickets.length === 0 ? "No tickets yet." : `No ${ticketStatusFilter === "all" ? "" : ticketStatusFilter.replace("_"," ")+" "}tickets.`}</p> : (
              <div className="space-y-3">
                {filteredTickets.map((t)=>{
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
            {teams.length > 0 && (
              <div className="flex gap-2 mb-4">
                <input
                  value={teamSearch}
                  onChange={e => setTeamSearch(e.target.value)}
                  placeholder="Search teams by name..."
                  className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none"
                />
                <select value={teamSort} onChange={e => setTeamSort(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none">
                  <option value="members">Most members</option>
                  <option value="name">Name A–Z</option>
                  <option value="newest">Newest first</option>
                </select>
              </div>
            )}
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
            ) : filteredTeams.length === 0 ? (
              <p className="text-sm text-foreground-dim">No teams match "{teamSearch}"</p>
            ) : (
              <div className="space-y-4">
                {filteredTeams.map(t => {
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

        {activeTab === "communities" && (
          <div>
            {commRequestsLoaded && commRequests.length > 0 && (
              <div className="mb-6">
                <h2 className="font-medium mb-3">Community Requests ({commRequests.filter(r => r.status === "pending").length} pending)</h2>
                <div className="space-y-3">
                  {commRequests.map(r => (
                    <div key={r.id} className={"rounded-2xl border p-4 " + (r.status === "approved" ? "border-signal/30 bg-signal/5" : r.status === "rejected" ? "border-red-700/20 bg-red-900/5" : "border-yellow-600/30 bg-yellow-900/5")}>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-medium text-sm">{r.name}</p>
                            <span className={"text-xs px-2 py-0.5 rounded-full " + (r.status === "approved" ? "bg-signal/20 text-signal" : r.status === "rejected" ? "bg-red-700/20 text-red-400" : "bg-yellow-700/20 text-yellow-400")}>
                              {r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending"}
                            </span>
                          </div>
                          <p className="text-xs text-foreground-dim">From: {r.user?.name || "?"} ({r.user?.email})</p>
                          {r.description && <p className="text-xs text-foreground-dim mt-1">{r.description}</p>}
                          {r.message && <p className="text-xs text-foreground-dim mt-0.5 italic">&quot;{r.message}&quot;</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {r.status === "pending" && (
                            <>
                              <button onClick={() => approveRequest(r.id)} disabled={approvingReqId === r.id} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">
                                {approvingReqId === r.id ? "Approving…" : "Approve"}
                              </button>
                              <button onClick={() => rejectRequest(r.id)} disabled={rejectingReqId === r.id} className="text-xs px-3 py-1.5 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 disabled:opacity-50">
                                {rejectingReqId === r.id ? "Rejecting…" : "Reject"}
                              </button>
                            </>
                          )}
                          {r.status === "approved" && r.teamId && (
                            <a href={`/dashboard/teams/${r.teamId}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-signal hover:text-signal transition-colors">View →</a>
                          )}
                          {confirmDeleteReqId === r.id ? (
                            <>
                              <button onClick={() => deleteRequest(r.id)} disabled={deletingReqId === r.id} className="text-xs px-3 py-1.5 rounded-full bg-red-600 text-white disabled:opacity-50">{deletingReqId === r.id ? "…" : "Confirm delete"}</button>
                              <button onClick={() => setConfirmDeleteReqId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteReqId(r.id)} className="text-xs px-3 py-1.5 rounded-full border border-border text-foreground-dim hover:text-foreground transition-colors">Delete</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Community Events ({communities.length})</h2>
              <button onClick={() => setShowCreateComm(v => !v)} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium">+ Create community</button>
            </div>
            {communities.length > 0 && (
              <input value={commSearch} onChange={e => setCommSearch(e.target.value)} placeholder="Search communities..." className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none mb-4" />
            )}
            {showCreateComm && (
              <div className="rounded-2xl border border-signal/30 bg-surface p-4 mb-4 space-y-3">
                <p className="text-sm font-medium">New community event</p>
                <p className="text-xs text-foreground-dim">Community events are public groups that any member can join and browse. They have the same tabs as teams: Bulletin, Chat, Challenges, Events, Activity, Members, Contact.</p>
                <input value={newCommName} onChange={e => setNewCommName(e.target.value)} placeholder="Community name" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" />
                <textarea value={newCommDesc} onChange={e => setNewCommDesc(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none resize-none" />
                <div className="flex gap-2">
                  <button onClick={createCommunity} disabled={creatingComm || !newCommName.trim()} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{creatingComm ? "Creating..." : "Create"}</button>
                  <button onClick={() => { setShowCreateComm(false); setNewCommName(""); setNewCommDesc(""); }} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                </div>
              </div>
            )}
            {!communitiesLoaded ? (
              <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-20 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : communities.length === 0 ? (
              <p className="text-sm text-foreground-dim">No community events yet. Create the first one above.</p>
            ) : (
              <div className="space-y-4">
                {communities.filter(c => !commSearch || c.name.toLowerCase().includes(commSearch.toLowerCase()) || (c.description||"").toLowerCase().includes(commSearch.toLowerCase())).map(c => (
                  <div key={c.id} className="rounded-2xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        {editingCommId === c.id ? (
                          <div className="space-y-2 mb-2">
                            <input value={editCommName} onChange={e => setEditCommName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none" autoFocus />
                            <textarea value={editCommDesc} onChange={e => setEditCommDesc(e.target.value)} rows={2} placeholder="Description (optional)" className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm focus:border-signal outline-none resize-none" />
                            <div className="flex gap-2">
                              <button onClick={() => saveCommEdit(c.id)} disabled={savingCommEdit || !editCommName.trim()} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-50">{savingCommEdit ? "Saving..." : "Save"}</button>
                              <button onClick={() => setEditingCommId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium">{c.name}</p>
                            {c.description && <p className="text-xs text-foreground-dim mt-0.5">{c.description}</p>}
                            <p className="text-xs text-foreground-dim mt-1">{c.members.length} member{c.members.length !== 1 ? "s" : ""} · Created {new Date(c.createdAt).toLocaleDateString()}</p>
                          </>
                        )}
                      </div>
                      {editingCommId !== c.id && (
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end ml-4">
                          <a href={`/dashboard/teams/${c.id}`} target="_blank" rel="noopener noreferrer" className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-signal hover:text-signal transition-colors">View →</a>
                          <button onClick={() => { setEditingCommId(c.id); setEditCommName(c.name); setEditCommDesc(c.description || ""); }} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-signal hover:text-signal transition-colors">Edit</button>
                          {confirmDeleteCommId === c.id ? (
                            <>
                              <button onClick={() => deleteCommunity(c.id)} disabled={deletingCommId === c.id} className="text-xs px-2.5 py-1 rounded-full bg-red-600 text-white disabled:opacity-50">{deletingCommId === c.id ? "..." : "Confirm delete"}</button>
                              <button onClick={() => setConfirmDeleteCommId(null)} className="text-xs px-2.5 py-1 rounded-full border border-border">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteCommId(c.id)} className="text-xs px-2.5 py-1 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                    {c.members.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-foreground-dim mb-2">Members ({c.members.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {c.members.slice(0, 12).map(m => (
                            <span key={m.userId} className="text-xs px-2 py-0.5 rounded-full bg-background border border-border">{m.name}</span>
                          ))}
                          {c.members.length > 12 && <span className="text-xs text-foreground-dim">+{c.members.length - 12} more</span>}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="max-w-lg space-y-6">
            {/* Create accounts */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-medium mb-1">Create account</h2>
              <p className="text-xs text-foreground-dim mb-5">Create admin or test accounts directly without an invite code.</p>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {[{ v: "admin", l: "Admin account" }, { v: "test", l: "Test account" }].map(r => (
                    <button key={r.v} onClick={() => setNewUserRole(r.v)} className={"flex-1 py-2 rounded-full text-sm font-medium transition-colors border " + (newUserRole === r.v ? "bg-signal text-background border-signal" : "border-border hover:bg-surface-raised")}>
                      {r.l}
                    </button>
                  ))}
                </div>
                {newUserRole === "admin" && <p className="text-xs text-foreground-dim">Admin accounts can access this admin panel by logging in with their account — no shared password needed.</p>}
                {newUserRole === "test" && <p className="text-xs text-foreground-dim">Test accounts are regular app users marked with a Test badge. Use them to try out features without affecting real data.</p>}
                <input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Full name" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                <input type="email" value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} placeholder="Email address" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                <input type="text" value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} placeholder="Password (min 8 characters)" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                {createUserMsg.text && <p className={"text-sm " + (createUserMsg.ok ? "text-signal" : "text-red-400")}>{createUserMsg.text}</p>}
                <button onClick={createUser} disabled={creatingUser || !newUserName.trim() || !newUserEmail.trim() || newUserPassword.length < 8} className="w-full py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">
                  {creatingUser ? "Creating…" : `Create ${newUserRole} account`}
                </button>
              </div>
            </div>

            {/* Change admin password */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-medium mb-1">Change admin password</h2>
              <p className="text-xs text-foreground-dim mb-5">This changes the shared password used to log into this admin panel.</p>
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

        {activeTab === "messages" && (
          <div className="space-y-8">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {[{ id: "dm", label: "DM a user" }, { id: "announce", label: "Post announcement" }, { id: "history", label: "History" }].map(t => (
                <button key={t.id} onClick={() => setMsgTab(t.id)} className={"px-3 py-1.5 rounded-full text-sm transition-colors " + (msgTab === t.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                  {t.label}
                </button>
              ))}
            </div>

            {msgTab === "dm" && (
              <div className="space-y-4 max-w-lg">
                <h2 className="font-medium">Send a direct message to a user</h2>
                <p className="text-xs text-foreground-dim">The message will appear on the user's today page as a notification from Train2Race. They can dismiss it once read.</p>
                <div>
                  <label className="text-xs text-foreground-dim uppercase tracking-wide block mb-1">Select user</label>
                  <select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={dmUserId} onChange={e => setDmUserId(e.target.value)}>
                    <option value="">— choose a user —</option>
                    {(data?.users || []).map(u => <option key={u.id} value={u.id}>{u.name || u.email} {u.email ? `(${u.email})` : ""}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-foreground-dim uppercase tracking-wide block mb-1">Message</label>
                  <textarea rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Write your message…" value={dmContent} onChange={e => setDmContent(e.target.value)} />
                </div>
                {dmMsg.text && <p className={"text-sm " + (dmMsg.ok ? "text-signal" : "text-red-400")}>{dmMsg.text}</p>}
                <button onClick={sendDm} disabled={sendingDm || !dmUserId || !dmContent.trim()} className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">
                  {sendingDm ? "Sending…" : "Send message"}
                </button>
              </div>
            )}

            {msgTab === "announce" && (
              <div className="space-y-4 max-w-lg">
                <h2 className="font-medium">Post an announcement to all users</h2>
                <p className="text-xs text-foreground-dim">Shown as a banner on the today page for all users until they dismiss it.</p>
                <div>
                  <label className="text-xs text-foreground-dim uppercase tracking-wide block mb-1">Title (optional)</label>
                  <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="e.g. New feature live" value={annTitle} onChange={e => setAnnTitle(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-foreground-dim uppercase tracking-wide block mb-1">Message</label>
                  <textarea rows={4} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" placeholder="Write your announcement…" value={annContent} onChange={e => setAnnContent(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-foreground-dim uppercase tracking-wide block mb-1">Post at (optional)</label>
                    <input type="datetime-local" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={annScheduledFor} onChange={e => setAnnScheduledFor(e.target.value)} />
                    <p className="text-xs text-foreground-dim mt-1">Leave blank to post immediately</p>
                  </div>
                  <div>
                    <label className="text-xs text-foreground-dim uppercase tracking-wide block mb-1">Expires (optional)</label>
                    <input type="datetime-local" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" value={annExpiry} onChange={e => setAnnExpiry(e.target.value)} />
                    <p className="text-xs text-foreground-dim mt-1">Auto-remove after this time</p>
                  </div>
                </div>
                {annMsg.text && <p className={"text-sm " + (annMsg.ok ? "text-signal" : "text-red-400")}>{annMsg.text}</p>}
                <button onClick={postAnnouncement} disabled={postingAnn || !annContent.trim()} className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">
                  {postingAnn ? "Posting…" : "Post announcement"}
                </button>
              </div>
            )}

            {msgTab === "history" && (
              <div className="space-y-6">
                {/* Announcements */}
                <div>
                  <h2 className="font-medium mb-3">Announcements ({adminAnns.length})</h2>
                  {adminAnns.length === 0 ? <p className="text-sm text-foreground-dim">No announcements yet.</p> : (
                    <div className="space-y-2">
                      {adminAnns.map((a) => (
                        <div key={a.id} className="rounded-xl border border-yellow-700/30 bg-yellow-900/10 p-3 flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-foreground-dim mb-1">
                              Posted {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              {" · "}{new Date(a.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              {a.scheduledFor && <span className="ml-2 text-yellow-400">Scheduled: {new Date(a.scheduledFor).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {new Date(a.scheduledFor).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>}
                              {a.expiresAt && <span className="ml-2 text-foreground-dim">Expires: {new Date(a.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                            </p>
                            {a.title && <p className="text-sm font-medium mb-0.5">{a.title}</p>}
                            <p className="text-sm text-foreground-dim">{a.content}</p>
                          </div>
                          <button onClick={() => deleteAdminMsg(a.id, "announce")} className="text-xs text-red-400 shrink-0">Delete</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DMs */}
                <div>
                  <h2 className="font-medium mb-3">Direct messages ({adminMsgs.length})</h2>
                  {adminMsgs.length === 0 ? <p className="text-sm text-foreground-dim">No DMs sent yet.</p> : (
                    <div className="space-y-2">
                      {adminMsgs.map((m) => (
                        <div key={m.id} className="rounded-xl border border-border bg-surface p-3 flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-foreground-dim mb-1">
                              To: {m.toUser?.name || m.toUser?.email || "Unknown"}
                              {" · "}{new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              {" · "}{new Date(m.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              {!m.isRead && <span className="ml-2 text-signal">Unread</span>}
                            </p>
                            <p className="text-sm">{m.content}</p>
                          </div>
                          <button onClick={() => deleteAdminMsg(m.id, "dm")} className="text-xs text-red-400 shrink-0">Delete</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "requests" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium">Invite Code Requests ({inviteRequests.filter(r => r.status === "pending").length} pending)</h2>
              <button onClick={() => { setInviteRequestsLoaded(false); loadInviteRequests(); }} className="text-xs text-foreground-dim hover:text-foreground">Refresh</button>
            </div>
            {!inviteRequestsLoaded ? (
              <p className="text-sm text-foreground-dim">Loading…</p>
            ) : inviteRequests.length === 0 ? (
              <p className="text-sm text-foreground-dim">No requests yet.</p>
            ) : (
              <div className="space-y-2">
                {inviteRequests.map(r => (
                  <div key={r.id} className={"rounded-xl border p-4 " + (r.status === "pending" ? "border-signal/30 bg-signal/5" : "border-border bg-surface opacity-60")}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium">{r.name}</span>
                          <span className="text-xs text-foreground-dim">{r.email}</span>
                          <span className={"text-xs px-2 py-0.5 rounded-full " + (r.status === "pending" ? "bg-signal/15 text-signal" : r.status === "sent" ? "bg-green-900/30 text-green-400" : "bg-red-900/20 text-red-400")}>{r.status}</span>
                        </div>
                        <p className="text-xs text-foreground-dim">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        {r.message && <p className="text-sm mt-1 italic text-foreground-dim">"{r.message}"</p>}
                        {fulfillCodes[r.id] && (
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-foreground-dim">Invite code:</span>
                              <code className="text-sm font-mono font-bold text-signal bg-signal/10 px-2 py-0.5 rounded">{fulfillCodes[r.id].code}</code>
                              <button onClick={() => navigator.clipboard.writeText(fulfillCodes[r.id].code)} className="text-xs text-foreground-dim hover:text-foreground">Copy</button>
                            </div>
                            {fulfillCodes[r.id].emailError ? (
                              <p className="text-xs text-red-400">Email failed: {fulfillCodes[r.id].emailError}. Copy the code above and send it manually.</p>
                            ) : (
                              <p className="text-xs text-signal">Email sent to {r.email}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0 items-start flex-wrap justify-end">
                        {r.status === "pending" && (
                          <>
                            <button onClick={() => fulfillRequest(r.id, "fulfill")} disabled={fulfillingId === r.id} className="px-3 py-1.5 rounded-full text-xs font-medium bg-signal text-background disabled:opacity-50">
                              {fulfillingId === r.id ? "Sending…" : "Send invite"}
                            </button>
                            <button onClick={() => declineRequest(r.id)} disabled={decliningId === r.id} className="px-3 py-1.5 rounded-full text-xs font-medium border border-red-600/40 text-red-400 disabled:opacity-50">
                              {decliningId === r.id ? "…" : "Decline"}
                            </button>
                          </>
                        )}
                        {r.status === "sent" && (
                          <button onClick={() => fulfillRequest(r.id, "resend")} disabled={fulfillingId === r.id} className="px-3 py-1.5 rounded-full text-xs font-medium border border-signal/40 text-signal hover:bg-signal/10 disabled:opacity-50">
                            {fulfillingId === r.id ? "Resending…" : "Resend"}
                          </button>
                        )}
                        <button onClick={() => deleteInviteRequest(r.id)} className="px-3 py-1.5 rounded-full text-xs font-medium border border-border text-foreground-dim hover:text-red-400 hover:border-red-600/40">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "stats" && (
          <div>
            {statsLoading && <p className="text-sm text-foreground-dim py-8 text-center">Loading stats…</p>}
            {!statsLoading && stats && (
              <div className="space-y-8">

                {/* Metric tiles */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total users", value: stats.totalUsers },
                    { label: "Teams", value: stats.totalTeams },
                    { label: "Workouts logged", value: stats.totalActivities },
                    { label: "Training plans", value: stats.totalPlans },
                  ].map(m => (
                    <div key={m.label} className="rounded-2xl border border-border bg-surface p-4">
                      <p className="text-2xl font-bold">{m.value.toLocaleString()}</p>
                      <p className="text-xs text-foreground-dim mt-0.5">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Signups per week */}
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-sm font-medium mb-4">Signups per week — last 8 weeks</p>
                  {(() => {
                    const max = Math.max(...stats.signupsPerWeek.map(w => w.count), 1);
                    return (
                      <div className="flex items-end gap-2 h-32">
                        {stats.signupsPerWeek.map((w, i) => {
                          const pct = Math.round((w.count / max) * 100);
                          const label = new Date(w.week).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                          return (
                            <div key={i} className="flex flex-col items-center flex-1 gap-1 h-full justify-end">
                              <span className="text-xs text-foreground-dim">{w.count > 0 ? w.count : ""}</span>
                              <div className="w-full bg-signal rounded-t" style={{ height: pct + "%" }} />
                              <span className="text-xs text-foreground-dim whitespace-nowrap" style={{ fontSize: "10px" }}>{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Daily active users */}
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-sm font-medium mb-1">Daily active users — last 7 days</p>
                  <p className="text-xs text-foreground-dim mb-4">Users who logged at least one workout</p>
                  {(() => {
                    const max = Math.max(...stats.dailyActiveUsers.map(d => d.count), 1);
                    return (
                      <div className="flex items-end gap-2 h-24">
                        {stats.dailyActiveUsers.map((d, i) => {
                          const pct = Math.round((d.count / max) * 100);
                          const label = new Date(d.day).toLocaleDateString(undefined, { weekday: "short" });
                          return (
                            <div key={i} className="flex flex-col items-center flex-1 gap-1 h-full justify-end">
                              <span className="text-xs text-foreground-dim">{d.count > 0 ? d.count : ""}</span>
                              <div className="w-full bg-signal/60 rounded-t" style={{ height: pct + "%" }} />
                              <span className="text-xs text-foreground-dim">{label}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                <div className="grid md:grid-cols-3 gap-4">

                  {/* Avg workouts per user */}
                  <div className="rounded-2xl border border-border bg-surface p-5">
                    <p className="text-sm font-medium mb-3">Avg workouts per user</p>
                    <p className="text-4xl font-bold text-signal">{stats.avgWorkoutsPerUser}</p>
                    <p className="text-xs text-foreground-dim mt-1">across all {stats.totalUsers} users</p>
                  </div>

                  {/* Top 5 most active users */}
                  <div className="rounded-2xl border border-border bg-surface p-5 md:col-span-2">
                    <p className="text-sm font-medium mb-3">Top 5 most active users</p>
                    {stats.topUsers.length === 0 && <p className="text-xs text-foreground-dim">No data yet.</p>}
                    <div className="space-y-2">
                      {stats.topUsers.map((u, i) => {
                        const max = stats.topUsers[0]?.count || 1;
                        const pct = Math.round((u.count / max) * 100);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm truncate max-w-xs">{u.name}</span>
                              <span className="text-xs text-foreground-dim shrink-0 ml-2">{u.count} workouts</span>
                            </div>
                            <div className="w-full h-1.5 bg-border rounded-full">
                              <div className="h-1.5 bg-signal rounded-full" style={{ width: pct + "%" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Tickets by status */}
                <div className="rounded-2xl border border-border bg-surface p-5">
                  <p className="text-sm font-medium mb-4">Support ticket volume by status</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {["open", "in_progress", "resolved", "closed"].map(status => (
                      <div key={status} className="rounded-xl bg-background border border-border px-4 py-3">
                        <p className="text-xl font-bold">{stats.tickets[status] || 0}</p>
                        <p className="text-xs text-foreground-dim mt-0.5 capitalize">{status.replace("_", " ")}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {activeTab === "email" && (
          <div className="max-w-xl space-y-10">

            {/* ── Scheduled emails ── */}
            <div>
              <h2 className="font-medium mb-1">Scheduled emails</h2>
              <p className="text-xs text-foreground-dim mb-5">No emails go out automatically unless enabled here.</p>

              <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Weekly team summary</p>
                    <p className="text-xs text-foreground-dim mt-0.5">Sends each team's weekly miles, MVP, and days-to-race to all members.</p>
                  </div>
                  <div onClick={() => setWeeklySummaryEnabled(v => !v)} className={"relative w-10 h-5 shrink-0 rounded-full cursor-pointer transition-colors " + (weeklySummaryEnabled ? "bg-signal" : "bg-border")}>
                    <div className={"absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform " + (weeklySummaryEnabled ? "left-5" : "left-0.5")} />
                  </div>
                </div>

                {weeklySummaryEnabled && (
                  <div>
                    <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Send on</label>
                    <select value={weeklySummaryDay} onChange={e => setWeeklySummaryDay(e.target.value)} className="px-3 py-2 rounded-xl bg-background border border-border text-sm outline-none focus:border-signal">
                      {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map((d, i) => (
                        <option key={i} value={String(i)}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button onClick={saveEmailSchedule} disabled={savingSchedule || !emailScheduleLoaded} className="px-4 py-1.5 rounded-full text-sm font-medium bg-signal text-background disabled:opacity-40">
                    {savingSchedule ? "Saving…" : "Save schedule"}
                  </button>
                  {scheduleMsg.text && <p className={"text-sm " + (scheduleMsg.ok ? "text-signal" : "text-red-400")}>{scheduleMsg.text}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-border" />

            {/* ── Send now ── */}
            <div className="space-y-5">
              <h2 className="font-medium">Send now</h2>

              <div>
                <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Recipients</label>
                <div className="flex gap-2">
                  {["all", "team"].map(t => (
                    <button key={t} onClick={() => { setEmailTarget(t); setEmailTeamId(""); }} className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (emailTarget === t ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                      {t === "all" ? "All users" : "Specific team"}
                    </button>
                  ))}
                </div>
              </div>

              {emailTarget === "team" && (
                <div>
                  <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Team</label>
                  {!teamsLoaded ? (
                    <p className="text-sm text-foreground-dim">Loading teams…</p>
                  ) : (
                    <select value={emailTeamId} onChange={e => setEmailTeamId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal">
                      <option value="">Select a team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name} ({t.members?.length ?? ""} members)</option>)}
                    </select>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Subject</label>
                <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="e.g. Important update from Train2Race" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal" />
              </div>

              <div>
                <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Message</label>
                <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8} placeholder="Write your message here…" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-signal resize-y leading-relaxed" />
              </div>

              <div className="flex items-center gap-4">
                <button onClick={sendEmailBroadcast} disabled={sendingEmail || !emailSubject.trim() || !emailBody.trim() || (emailTarget === "team" && !emailTeamId)} className="px-5 py-2 rounded-full text-sm font-medium bg-signal text-background disabled:opacity-40 transition-opacity">
                  {sendingEmail ? "Sending…" : "Send email"}
                </button>
                {emailMsg.text && (
                  <p className={"text-sm " + (emailMsg.ok ? "text-signal" : "text-red-400")}>{emailMsg.text}</p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
