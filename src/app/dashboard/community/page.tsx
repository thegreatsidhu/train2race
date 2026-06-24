"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ChatPanel } from "@/components/ChatPanel";

function fmtGoal(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
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

  useEffect(() => {
    fetch("/api/major-races/register").then(r => r.json()).then(d => {
      const regs = d.registrations || [];
      setMyRegs(regs);
      setLoading(false);
      if (preselectedRaceId) {
        const found = regs.find((r: any) => r.majorRaceId === preselectedRaceId);
        if (found) loadEvent(found.majorRace);
      } else if (regs.length === 1) {
        loadEvent(regs[0].majorRace);
      }
    });
  }, []);

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

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Community</h1>
        <p className="text-foreground-dim text-sm">Chat and train with people racing the same events as you.</p>
      </header>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-surface animate-pulse" />)}</div>
      ) : myRegs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-10 text-center">
          <p className="font-medium mb-2">You haven't joined any race events yet</p>
          <p className="text-sm text-foreground-dim">Join a race event from the Races page to connect with other athletes training for the same goal.</p>
        </div>
      ) : (
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

              <div className="flex gap-2 mb-5">
                <button onClick={() => setEventTab("athletes")}
                  className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (eventTab === "athletes" ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                  Athletes {!dataLoading && `(${comm.length})`}
                </button>
                <button onClick={() => setEventTab("chat")}
                  className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (eventTab === "chat" ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                  Chat {!dataLoading && `(${messages.length})`}
                </button>
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
