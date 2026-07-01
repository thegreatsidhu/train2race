"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";

function fmtGoal(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function milesLabel(distanceM: number) {
  const mi = distanceM / 1609.34;
  if (distanceM >= 200000) return "140.6 Ironman";
  if (distanceM >= 100000) return "70.3 Half Ironman";
  return mi >= 26 ? "Marathon" : mi >= 13 ? "Half Marathon" : `${mi.toFixed(0)} mi`;
}

function CommunityPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preselectedRaceId = searchParams.get("race");

  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [comm, setComm] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [myUserId, setMyUserId] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [eventTab, setEventTab] = useState("athletes");
  const [sending, setSending] = useState(false);

  // Community groups
  const [commEvents, setCommEvents] = useState<any[]>([]);
  const [commEventsLoading, setCommEventsLoading] = useState(true);
  const [joiningCommId, setJoiningCommId] = useState<string | null>(null);
  const [leavingCommId, setLeavingCommId] = useState<string | null>(null);
  const [confirmLeaveCommId, setConfirmLeaveCommId] = useState<string | null>(null);
  const [commGroupQ, setCommGroupQ] = useState("");

  // Race search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [exiting, setExiting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadCommEvents() {
    const d = await fetch("/api/community-events").then(r => r.json()).catch(() => ({}));
    setCommEvents(d.events || []);
    setCommEventsLoading(false);
  }

  async function joinCommEvent(teamId: string) {
    setJoiningCommId(teamId);
    await fetch("/api/community-events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId }) });
    setJoiningCommId(null);
    setCommEvents(prev => prev.map(e => e.id === teamId ? { ...e, isMember: true, memberCount: e.memberCount + 1 } : e));
  }

  async function leaveCommEvent(teamId: string) {
    setLeavingCommId(teamId);
    await fetch("/api/community-events", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ teamId }) });
    setLeavingCommId(null);
    setConfirmLeaveCommId(null);
    setCommEvents(prev => prev.map(e => e.id === teamId ? { ...e, isMember: false, memberCount: Math.max(0, e.memberCount - 1) } : e));
  }

  async function loadMyRegs(autoOpenId?: string) {
    const d = await fetch("/api/major-races/register").then(r => r.json());
    const regs = d.registrations || [];
    setMyRegs(regs);
    setLoading(false);
    const targetId = autoOpenId || preselectedRaceId;
    if (targetId) {
      const found = regs.find((r: any) => r.majorRaceId === targetId);
      if (found) { loadEvent(found.majorRace); return; }
    }
    if (!autoOpenId && regs.length === 1) loadEvent(regs[0].majorRace);
  }

  useEffect(() => { loadMyRegs(); loadCommEvents(); }, []);

  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      const d = await fetch(`/api/major-races?search=${encodeURIComponent(searchQ)}&upcoming=1`).then(r => r.json());
      setSearchResults(d.races || []);
      setSearchLoading(false);
    }, 320);
  }, [searchQ]);

  async function loadEvent(race: any) {
    setSel(race);
    setEventTab("athletes");
    setDataLoading(true);
    setComm([]);
    setMessages([]);
    const [cr, mr] = await Promise.all([
      fetch("/api/major-races/community?raceId=" + race.id),
      fetch("/api/major-races/messages?raceId=" + race.id),
    ]);
    const cd = await cr.json();
    const md = await mr.json();
    setComm(cd.community || []);
    setMessages(md.messages || []);
    setIsAdmin(md.isAdmin || false);
    setMyUserId(cd.community?.find((a: any) => a.isMe)?.userId || "");
    setDataLoading(false);
  }

  async function joinCommunity(race: any) {
    setJoiningId(race.id);
    await fetch("/api/major-races/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId: race.id, isPublic: true }),
    });
    setJoiningId(null);
    setSearchQ("");
    setSearchResults([]);
    await loadMyRegs(race.id);
  }

  async function exitCommunity() {
    if (!sel) return;
    setExiting(true);
    await fetch("/api/major-races/register", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId: sel.id }),
    });
    setExiting(false);
    setConfirmExit(false);
    setSel(null);
    setComm([]);
    setMessages([]);
    await loadMyRegs();
  }

  async function sendMessage(content: string, replyToId?: string) {
    if (!sel) return;
    setSending(true);
    const res = await fetch("/api/major-races/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId: sel.id, content, replyToId }),
    });
    const data = await res.json();
    if (res.ok) setMessages(prev => [...prev, data.message]);
    setSending(false);
  }

  async function deleteMessage(messageId: string) {
    await fetch("/api/major-races/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId }),
    });
    setMessages(prev => prev.filter((m: any) => m.id !== messageId));
  }

  async function deleteAllMessages() {
    if (!sel) return;
    await fetch("/api/major-races/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId: sel.id, deleteAll: true }),
    });
    setMessages([]);
  }

  const isJoined = (raceId: string) => myRegs.some((r: any) => r.majorRaceId === raceId);

  // Create community form state
  const [pageTab, setPageTab] = useState<"groups"|"races"|"create">("groups");
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ok: boolean; text: string}|null>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myRequestsLoaded, setMyRequestsLoaded] = useState(false);

  async function loadMyRequests() {
    if (myRequestsLoaded) return;
    const d = await fetch("/api/community-requests").then(r => r.json()).catch(() => ({}));
    setMyRequests(d.requests || []);
    setMyRequestsLoaded(true);
  }

  async function submitCommunityRequest() {
    if (!createName.trim()) return;
    setSubmitting(true); setSubmitResult(null);
    const res = await fetch("/api/community-requests", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() || null, message: createMsg.trim() || null }),
    });
    const d = await res.json();
    setSubmitting(false);
    if (res.ok) {
      setSubmitResult({ ok: true, text: "Request submitted! We'll review it and get back to you." });
      setMyRequests(prev => [d.request, ...prev]);
      setCreateName(""); setCreateDesc(""); setCreateMsg("");
    } else {
      setSubmitResult({ ok: false, text: d.error || "Failed to submit request." });
    }
  }

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Community</h1>
        <p className="text-foreground-dim text-sm">Connect and train with athletes across groups and races.</p>
      </header>

      {/* Your communities */}
      {!loading && !commEventsLoading && (myRegs.length > 0 || commEvents.some((e: any) => e.isMember)) && (
        <section className="mb-6">
          <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-3">Your communities</p>
          <div className="space-y-2">
            {myRegs.map((reg: any) => (
              <div key={reg.id} className="rounded-2xl border border-signal/30 bg-signal/5 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{reg.majorRace.name}</p>
                  <p className="text-xs text-foreground-dim mt-0.5">
                    Race community · {reg.majorRace.raceDate ? new Date(reg.majorRace.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Date TBD"}
                  </p>
                </div>
                <button
                  onClick={() => { setPageTab("races"); loadEvent(reg.majorRace); }}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-signal/40 text-signal hover:bg-signal/10 transition-colors"
                >
                  Open →
                </button>
              </div>
            ))}
            {commEvents.filter((e: any) => e.isMember).map((e: any) => (
              <div key={e.id} className="rounded-2xl border border-signal/30 bg-signal/5 p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{e.name}</p>
                  <p className="text-xs text-foreground-dim mt-0.5">{e.memberCount} member{e.memberCount !== 1 ? "s" : ""}{e.description ? ` · ${e.description}` : ""}</p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/teams/${e.id}`)}
                  className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-signal/40 text-signal hover:bg-signal/10 transition-colors"
                >
                  View →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {(["groups", "create", "races"] as const).map(t => (
          <button key={t} onClick={() => { setPageTab(t); if (t === "create") loadMyRequests(); }}
            className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (pageTab === t ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
            {t === "groups" ? "Groups" : t === "create" ? "Create a Community" : "Races"}
          </button>
        ))}
      </div>

      {/* Groups tab */}
      {pageTab === "groups" && (
        <div>
          <input
            type="text"
            placeholder="Search communities…"
            value={commGroupQ}
            onChange={e => setCommGroupQ(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm placeholder:text-foreground-dim focus:outline-none focus:border-signal/50 mb-4"
          />
          {commEventsLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-surface border border-border animate-pulse"/>)}</div>
          ) : (() => {
            const filtered = commEvents.filter(e => !commGroupQ.trim() || e.name.toLowerCase().includes(commGroupQ.toLowerCase()));
            return filtered.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-foreground-dim">
                {commGroupQ.trim() ? `No communities found for "${commGroupQ}"` : "No communities yet."}
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(e => (
                  <div key={e.id} className={"rounded-2xl border p-4 flex items-center justify-between gap-4 " + (e.isMember ? "border-signal/30 bg-signal/5" : "border-border bg-surface")}>
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{e.name}</p>
                      <p className="text-xs text-foreground-dim mt-0.5">{e.memberCount} member{e.memberCount !== 1 ? "s" : ""}{e.description ? ` · ${e.description}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {e.isMember ? (
                        <>
                          <button onClick={() => router.push(`/dashboard/teams/${e.id}`)} className="px-3 py-1.5 rounded-full text-xs font-medium border border-signal/40 text-signal hover:bg-signal/10 transition-colors">
                            View →
                          </button>
                          {confirmLeaveCommId === e.id ? (
                            <>
                              <button onClick={() => leaveCommEvent(e.id)} disabled={leavingCommId === e.id} className="px-3 py-1.5 rounded-full text-xs bg-red-600/80 text-white disabled:opacity-50">
                                {leavingCommId === e.id ? "Leaving…" : "Confirm leave"}
                              </button>
                              <button onClick={() => setConfirmLeaveCommId(null)} className="px-3 py-1.5 rounded-full text-xs border border-border">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmLeaveCommId(e.id)} className="px-3 py-1.5 rounded-full text-xs border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">Leave</button>
                          )}
                        </>
                      ) : (
                        <button onClick={() => joinCommEvent(e.id)} disabled={joiningCommId === e.id} className="px-3 py-1.5 rounded-full text-xs font-medium bg-signal text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
                          {joiningCommId === e.id ? "Joining…" : "Join"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Create a Community tab */}
      {pageTab === "create" && (
        <div className="max-w-lg">
          {myRequests.length > 0 && (
            <div className="mb-6 space-y-2">
              <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-2">Your requests</p>
              {myRequests.map(r => (
                <div key={r.id} className={"rounded-2xl border p-4 " + (r.status === "approved" ? "border-signal/30 bg-signal/5" : r.status === "rejected" ? "border-red-700/30 bg-red-900/10" : "border-border bg-surface")}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm">{r.name}</p>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + (r.status === "approved" ? "bg-signal/20 text-signal" : r.status === "rejected" ? "bg-red-700/20 text-red-400" : "bg-yellow-700/20 text-yellow-400")}>
                      {r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending review"}
                    </span>
                  </div>
                  {r.description && <p className="text-xs text-foreground-dim mt-1">{r.description}</p>}
                  {r.status === "approved" && r.teamId && (
                    <button onClick={() => router.push(`/dashboard/teams/${r.teamId}`)} className="mt-2 text-xs text-signal hover:underline">
                      Go to community →
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {myRequests.some(r => r.status === "pending") ? (
            <div className="rounded-2xl border border-border bg-surface p-6 text-center text-sm text-foreground-dim">
              You have a pending request. We&apos;ll notify you once it&apos;s reviewed.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6">
              <h2 className="font-semibold mb-1">Start a community</h2>
              <p className="text-sm text-foreground-dim mb-5">Tell us about the community you&apos;d like to create. Our team will review and set it up for you.</p>
              {submitResult && (
                <div className={"mb-4 rounded-xl px-4 py-3 text-sm " + (submitResult.ok ? "bg-signal/10 text-signal border border-signal/20" : "bg-red-900/20 text-red-400 border border-red-700/30")}>
                  {submitResult.text}
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground-dim mb-1">Community name *</label>
                  <input type="text" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="e.g. Chicago Tri Club" maxLength={80}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-foreground-dim focus:outline-none focus:border-signal/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-dim mb-1">Description</label>
                  <textarea value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="What&apos;s this community about?" rows={3} maxLength={300}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-foreground-dim focus:outline-none focus:border-signal/50 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground-dim mb-1">Message to admin (optional)</label>
                  <textarea value={createMsg} onChange={e => setCreateMsg(e.target.value)} placeholder="Anything else you'd like us to know?" rows={2} maxLength={300}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-foreground-dim focus:outline-none focus:border-signal/50 resize-none" />
                </div>
                <button onClick={submitCommunityRequest} disabled={submitting || !createName.trim()}
                  className="w-full py-2.5 rounded-xl bg-signal text-background text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {submitting ? "Submitting…" : "Submit request"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Races tab */}
      {pageTab === "races" && (
        <div>
          <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-semibold mb-4">Find a race community</h2>
            <input
              type="text"
              placeholder="Search by race name…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-foreground-dim focus:outline-none focus:border-signal/50 mb-4"
            />
            {searchLoading && (
              <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-background animate-pulse" />)}</div>
            )}
            {!searchLoading && searchQ.trim() && searchResults.length === 0 && (
              <p className="text-sm text-foreground-dim text-center py-4">No upcoming races found for &quot;{searchQ}&quot;</p>
            )}
            {!searchLoading && searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((race: any) => {
                  const joined = isJoined(race.id);
                  return (
                    <div key={race.id} className={"rounded-xl border p-3.5 flex items-center justify-between gap-3 " + (joined ? "border-signal/40 bg-signal/5" : "border-border bg-background")}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{race.name}</p>
                          {race.isTriathlon && <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-700/40">Triathlon</span>}
                          {joined && <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">Joined</span>}
                        </div>
                        <p className="text-xs text-foreground-dim mt-0.5">
                          {[race.city, race.country].filter(Boolean).join(", ")}
                          {" · "}{new Date(race.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {" · "}{milesLabel(race.distanceM)}
                          {" · "}{race._count.registrations} athletes
                        </p>
                      </div>
                      {joined ? (
                        <button onClick={() => { setSearchQ(""); setSearchResults([]); loadEvent(myRegs.find((r: any) => r.majorRaceId === race.id)?.majorRace || race); }}
                          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-signal/40 text-signal hover:bg-signal/10 transition-colors">
                          View →
                        </button>
                      ) : (
                        <button onClick={() => joinCommunity(race)} disabled={joiningId === race.id}
                          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-signal text-background hover:opacity-90 disabled:opacity-50 transition-opacity">
                          {joiningId === race.id ? "Joining…" : "Join"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {!searchQ.trim() && (
              <p className="text-sm text-foreground-dim text-center py-2">Type a race name to search upcoming events</p>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}</div>
          ) : myRegs.length > 0 ? (
            <div>
              {myRegs.length > 1 && (
                <div className="flex gap-2 flex-wrap mb-5">
                  {myRegs.map((reg: any) => (
                    <button key={reg.id} onClick={() => loadEvent(reg.majorRace)}
                      className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (sel?.id === reg.majorRaceId ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                      {reg.majorRace.name}
                    </button>
                  ))}
                </div>
              )}
              {sel ? (
                <div>
                  <div className="mb-4">
                    <h2 className="font-semibold text-lg">{sel.name}</h2>
                    <p className="text-sm text-foreground-dim">
                      {sel.city}, {sel.country} · {new Date(sel.raceDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mb-5 flex-wrap">
                    <button onClick={() => setEventTab("athletes")}
                      className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (eventTab === "athletes" ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                      Athletes {!dataLoading && `(${comm.length})`}
                    </button>
                    <button onClick={() => setEventTab("chat")}
                      className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (eventTab === "chat" ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                      Chat {!dataLoading && `(${messages.length})`}
                    </button>
                    <div className="ml-auto">
                      {confirmExit ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-foreground-dim">Leave this community?</span>
                          <button onClick={exitCommunity} disabled={exiting}
                            className="text-xs px-3 py-1.5 rounded-full bg-red-600/80 text-white disabled:opacity-50">
                            {exiting ? "Leaving…" : "Yes, leave"}
                          </button>
                          <button onClick={() => setConfirmExit(false)}
                            className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-surface">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmExit(true)}
                          className="text-xs px-3 py-1.5 rounded-full border border-red-700/40 text-red-400 hover:border-red-500 transition-colors">
                          Exit community
                        </button>
                      )}
                    </div>
                  </div>
                  {eventTab === "athletes" && (
                    dataLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />)}</div>
                    ) : comm.length === 0 ? (
                      <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-foreground-dim">
                        No public athletes yet — be the first!
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {comm.map((a: any, i: number) => (
                          <div key={a.userId} className={"rounded-xl border p-3.5 " + (a.isMe ? "border-signal bg-signal/5" : "border-border bg-surface")}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold text-foreground-dim w-7 shrink-0">#{i + 1}</span>
                                <span className={"text-sm font-medium " + (a.isMe ? "text-signal" : "")}>{a.name}{a.isMe ? " (you)" : ""}</span>
                              </div>
                              <div className="flex gap-3 text-xs text-foreground-dim">
                                {a.goalTimeSec && <span>Goal {fmtGoal(a.goalTimeSec)}</span>}
                                {a.weeklyMiles > 0 && <span>{a.weeklyMiles}mi/wk</span>}
                                <span className="font-semibold text-foreground">{a.pct}%</span>
                              </div>
                            </div>
                            {a.totalWorkouts > 0 && (
                              <div>
                                <p className="text-xs text-foreground-dim mb-1">{a.doneWorkouts}/{a.totalWorkouts} workouts</p>
                                <div className="w-full h-1 bg-border rounded-full">
                                  <div className={"h-1 rounded-full " + (a.isMe ? "bg-signal" : "bg-foreground-dim")} style={{ width: a.pct + "%" }} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  )}
                  {eventTab === "chat" && (
                    dataLoading ? (
                      <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-2xl bg-surface animate-pulse" />)}</div>
                    ) : (
                      <ChatPanel
                        messages={messages}
                        myUserId={myUserId}
                        isAdmin={isAdmin}
                        height="460px"
                        onSend={sendMessage}
                        onDelete={deleteMessage}
                        onDeleteAll={isAdmin ? deleteAllMessages : undefined}
                        sending={sending}
                      />
                    )
                  )}
                </div>
              ) : myRegs.length > 1 ? (
                <div className="rounded-2xl border border-border bg-surface p-8 text-center text-foreground-dim text-sm">
                  Select a race above to connect with your group
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return <Suspense fallback={null}><CommunityPageInner /></Suspense>;
}
