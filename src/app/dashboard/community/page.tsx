"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

  // Search
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [exiting, setExiting] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (regs.length === 0) setShowSearch(true);
  }

  useEffect(() => { loadMyRegs(); }, []);

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
    setShowSearch(false);
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

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight mb-1">Community</h1>
          <p className="text-foreground-dim text-sm">Chat and train with people racing the same events as you.</p>
        </div>
        {!loading && !showSearch && (
          <button
            onClick={() => setShowSearch(true)}
            className="shrink-0 mt-1 px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:opacity-90 transition-opacity"
          >
            + Find a race
          </button>
        )}
      </header>

      {/* Search panel */}
      {showSearch && (
        <div className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Find a race community</h2>
            {myRegs.length > 0 && (
              <button onClick={() => { setShowSearch(false); setSearchQ(""); setSearchResults([]); }}
                className="text-xs text-foreground-dim hover:text-foreground">
                Cancel
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Search by race name…"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-foreground-dim focus:outline-none focus:border-signal/50 mb-4"
          />

          {searchLoading && (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-background animate-pulse" />)}
            </div>
          )}

          {!searchLoading && searchQ.trim() && searchResults.length === 0 && (
            <p className="text-sm text-foreground-dim text-center py-4">No upcoming races found for "{searchQ}"</p>
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
                      <button onClick={() => { setShowSearch(false); setSearchQ(""); setSearchResults([]); loadEvent(myRegs.find((r: any) => r.majorRaceId === race.id)?.majorRace || race); }}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border border-signal/40 text-signal hover:bg-signal/10 transition-colors">
                        View →
                      </button>
                    ) : (
                      <button
                        onClick={() => joinCommunity(race)}
                        disabled={joiningId === race.id}
                        className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-signal text-background hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
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
      )}

      {/* My races */}
      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}</div>
      ) : myRegs.length === 0 && !showSearch ? null : myRegs.length === 0 ? null : (
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
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />)}</div>
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
                  <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 rounded-2xl bg-surface animate-pulse" />)}</div>
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
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-8 text-center text-foreground-dim text-sm">
              Select a race above to connect with your group
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommunityPage() {
  return <Suspense fallback={null}><CommunityPageInner /></Suspense>;
}
