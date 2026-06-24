"use client";
import { useState, useEffect, useRef } from "react";
import { NewRaceForm } from "@/components/NewRaceForm";

const DFILTERS = [
  { label: "All" },
  { label: "5K/10K", min: 0, max: 15000 },
  { label: "Half", min: 15000, max: 30000 },
  { label: "Marathon", min: 30000, max: 50000 },
  { label: "Ultra", min: 50000, max: 150000 },
  { label: "Triathlon", tri: true },
  { label: "Ironman", min: 100000, tri: true },
] as const;
const DISTS: Record<string, number> = { "5K":5000,"10K":10000,"Half Marathon":21097,"Marathon":42195,"Ultra (50K)":50000,"Sprint Triathlon":25750,"Olympic Triathlon":51500,"70.3 Half Ironman":113000,"140.6 Full Ironman":226000 };
const TRIS = ["Sprint Triathlon","Olympic Triathlon","70.3 Half Ironman","140.6 Full Ironman"];

function distLabel(m: number) {
  if (m >= 200000) return "140.6 Ironman";
  if (m >= 100000) return "70.3";
  if (m >= 40000) return "Marathon";
  if (m >= 20000) return "Half Marathon";
  if (m >= 9000) return "10K";
  if (m >= 4500) return "5K";
  return (m / 1609.34).toFixed(1) + "mi";
}
function fmtGoal(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function RacesPage() {
  const [tab, setTab] = useState("plans");

  // Plans
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Events
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [selEvent, setSelEvent] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [df, setDf] = useState(0);
  const [goalH, setGoalH] = useState("");
  const [goalM, setGoalM] = useState("");
  const [pub, setPub] = useState(true);
  const [reging, setReging] = useState(false);

  // My events — inline community
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [commData, setCommData] = useState<Record<string, { comm: any[]; messages: any[]; loading: boolean }>>({});
  const [commTab, setCommTab] = useState<Record<string, string>>({});
  const [newMsgMap, setNewMsgMap] = useState<Record<string, string>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});
  const msgEndRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Submit
  const [rName, setRName] = useState("");
  const [rDate, setRDate] = useState("");
  const [rDist, setRDist] = useState("Marathon");
  const [rCity, setRCity] = useState("");
  const [rCountry, setRCountry] = useState("USA");
  const [rWeb, setRWeb] = useState("");
  const [rTri, setRTri] = useState(false);
  const [subbing, setSubbing] = useState(false);
  const [subResult, setSubResult] = useState<any>(null);

  useEffect(() => {
    fetch("/api/races").then(r => r.json()).then(d => { setPlans(d.races || []); setPlansLoading(false); });
    fetch("/api/major-races/register").then(r => r.json()).then(d => setMyRegs(d.registrations || []));
  }, []);

  useEffect(() => {
    if (tab === "events" && events.length === 0 && !eventsLoading) {
      setEventsLoading(true);
      fetch("/api/major-races?upcoming=1").then(r => r.json()).then(d => { setEvents(d.races || []); setEventsLoading(false); });
    }
  }, [tab]);

  async function deleteRace(id: string) {
    setDeleting(true);
    const res = await fetch(`/api/races?id=${id}`, { method: "DELETE" });
    if (res.ok) { setPlans(prev => prev.filter(r => r.id !== id)); setConfirmDel(null); }
    setDeleting(false);
  }

  async function handleReg(race: any) {
    setReging(true);
    const sec = (goalH || goalM) ? parseInt(goalH || "0") * 3600 + parseInt(goalM || "0") * 60 : null;
    await fetch("/api/major-races/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ majorRaceId: race.id, goalTimeSec: sec, isPublic: pub }) });
    const d = await fetch("/api/major-races/register").then(r => r.json());
    setMyRegs(d.registrations || []);
    setReging(false);
  }

  async function handleUnreg(majorRaceId: string) {
    await fetch("/api/major-races/register", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ majorRaceId }) });
    const d = await fetch("/api/major-races/register").then(r => r.json());
    setMyRegs(d.registrations || []);
  }

  async function toggleCommunity(majorRaceId: string) {
    if (expandedReg === majorRaceId) { setExpandedReg(null); return; }
    setExpandedReg(majorRaceId);
    if (!commData[majorRaceId]) {
      setCommData(prev => ({ ...prev, [majorRaceId]: { comm: [], messages: [], loading: true } }));
      setCommTab(prev => ({ ...prev, [majorRaceId]: "leaderboard" }));
      const [cr, mr] = await Promise.all([
        fetch("/api/major-races/community?raceId=" + majorRaceId),
        fetch("/api/major-races/messages?raceId=" + majorRaceId),
      ]);
      const cd = await cr.json();
      const md = await mr.json();
      setCommData(prev => ({ ...prev, [majorRaceId]: { comm: cd.community || [], messages: md.messages || [], loading: false } }));
    }
  }

  async function sendMsg(majorRaceId: string) {
    const content = (newMsgMap[majorRaceId] || "").trim();
    if (!content) return;
    setSendingMap(prev => ({ ...prev, [majorRaceId]: true }));
    const res = await fetch("/api/major-races/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId, content }),
    });
    const data = await res.json();
    if (res.ok) {
      setCommData(prev => ({ ...prev, [majorRaceId]: { ...prev[majorRaceId], messages: [...prev[majorRaceId].messages, data.message] } }));
      setNewMsgMap(prev => ({ ...prev, [majorRaceId]: "" }));
      setTimeout(() => msgEndRefs.current[majorRaceId]?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSendingMap(prev => ({ ...prev, [majorRaceId]: false }));
  }

  async function deleteMsg(majorRaceId: string, messageId: string) {
    await fetch("/api/major-races/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId }) });
    setCommData(prev => ({ ...prev, [majorRaceId]: { ...prev[majorRaceId], messages: prev[majorRaceId].messages.filter((m: any) => m.id !== messageId) } }));
  }

  async function handleSub() {
    setSubbing(true); setSubResult(null);
    const res = await fetch("/api/major-races/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: rName, raceDate: rDate, distanceM: DISTS[rDist], city: rCity, country: rCountry, website: rWeb || null, isTriathlon: rTri }) });
    setSubResult(await res.json());
    setSubbing(false);
  }

  const isReg = (id: string) => myRegs.some((r: any) => r.majorRaceId === id);
  const f = DFILTERS[df] as any;
  const filtered = events.filter((r: any) => {
    const ms = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const md = f.tri ? r.isTriathlon : (!f.min || (r.distanceM >= f.min && r.distanceM <= f.max));
    return ms && md;
  });
  const hasActivePlan = plans.some((r: any) => r.trainingPlan && r.trainingPlan._count?.workouts > 0);

  const TABS = [
    { id: "plans", label: "My plans" },
    { id: "events", label: "Browse events" },
    { id: "myevents", label: `My events${myRegs.length > 0 ? ` (${myRegs.length})` : ""}` },
    { id: "submit", label: "Submit a race" },
  ];

  return (
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1">Races</h1>
        <p className="text-foreground-dim text-sm">Manage your training plans and discover community race events.</p>
      </header>

      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"px-4 py-2 rounded-full text-sm font-medium transition-colors " + (tab === t.id ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Plans ── */}
      {tab === "plans" && (
        <div>
          {hasActivePlan ? (
            <div className="rounded-2xl border border-border bg-surface p-5 mb-6">
              <p className="text-sm font-medium mb-1">You have an active training plan</p>
              <p className="text-xs text-foreground-dim">Complete your current race plan before adding a new one.</p>
            </div>
          ) : (
            <div className="mb-6"><NewRaceForm /></div>
          )}
          <div className="space-y-3">
            {plansLoading && [1, 2].map(i => <div key={i} className="h-24 rounded-2xl bg-surface animate-pulse" />)}
            {!plansLoading && plans.length === 0 && <p className="text-sm text-foreground-dim">No races added yet.</p>}
            {plans.map((r: any) => {
              const due = r.trainingPlan?.workouts ?? [];
              const total = due.length;
              const done = due.filter((w: any) => w.completed).length;
              const totalPlan = r.trainingPlan?._count?.workouts ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium">{r.raceName}</h3>
                    <span className="text-xs text-foreground-dim">{new Date(r.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <p className="text-sm text-foreground-dim">{(r.distanceM / 1609.34).toFixed(1)} mi{r.goalTimeSec ? ` · goal ${fmtGoal(r.goalTimeSec)}` : ""}</p>
                  {totalPlan > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-foreground-dim mb-1">
                        <span>{done}/{total} scheduled workouts done{total < totalPlan ? ` · ${totalPlan} total` : ""}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-border rounded-full"><div className="h-1.5 bg-signal rounded-full" style={{ width: `${pct}%` }} /></div>
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <a href={`/dashboard/races/${r.id}`} className="text-sm text-signal hover:underline">View training plan →</a>
                    {confirmDel === r.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-dim">Delete race?</span>
                        <button onClick={() => deleteRace(r.id)} disabled={deleting} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-60">Yes</button>
                        <button onClick={() => setConfirmDel(null)} className="text-xs text-foreground-dim hover:text-foreground">No</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(r.id)} className="text-xs text-foreground-dim hover:text-red-400 transition-colors">Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Events ── */}
      {tab === "events" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <input placeholder="Search events..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm mb-3" />
            <div className="flex gap-1.5 flex-wrap mb-3">
              {DFILTERS.map((fi, i) => (
                <button key={fi.label} onClick={() => setDf(i)}
                  className={"text-xs px-3 py-1 rounded-full border transition-colors " + (df === i ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                  {fi.label}
                </button>
              ))}
            </div>
            {eventsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />)}</div>
            ) : (
              <>
                <p className="text-xs text-foreground-dim mb-2">{filtered.length} events</p>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filtered.map((race: any) => {
                    const d = Math.ceil((new Date(race.raceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const count = race._count?.registrations || 0;
                    return (
                      <button key={race.id} onClick={() => { setSelEvent(race); setGoalH(""); setGoalM(""); setPub(true); }}
                        className={"w-full text-left rounded-xl border p-3 transition-colors " + (selEvent?.id === race.id ? "border-signal bg-signal/5" : "border-border bg-surface hover:bg-surface-raised")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{race.name}</p>
                            <p className="text-xs text-foreground-dim">{race.city}, {race.country} · {distLabel(race.distanceM)}</p>
                            <p className="text-xs text-foreground-dim">{new Date(race.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {d > 0 ? `${d}d away` : "past"}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isReg(race.id) && <span className="text-xs bg-signal/20 text-signal px-2 py-0.5 rounded-full">Joined</span>}
                            {count > 0 && <span className="text-xs text-foreground-dim">{count} athletes</span>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-foreground-dim mb-2">No events found.</p>
                      <button onClick={() => setTab("submit")} className="text-sm text-signal hover:underline">Submit this race</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div>
            {selEvent ? (
              <div className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-start justify-between mb-1">
                  <h2 className="font-semibold">{selEvent.name}</h2>
                  {selEvent.website && <a href={selEvent.website} target="_blank" rel="noopener noreferrer" className="text-xs text-signal hover:underline ml-2 shrink-0">Website</a>}
                </div>
                <p className="text-sm text-foreground-dim mb-0.5">{selEvent.city}, {selEvent.country} · {distLabel(selEvent.distanceM)}</p>
                <p className="text-sm text-foreground-dim mb-4">{new Date(selEvent.raceDate).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
                {isReg(selEvent.id) ? (
                  <div className="space-y-3">
                    <p className="text-xs text-signal font-medium">You are registered for this event</p>
                    <a href={`/dashboard/community?race=${selEvent.id}`}
                      className="block w-full py-2 rounded-full bg-signal text-background text-sm font-medium text-center">View community →</a>
                    <button onClick={() => handleUnreg(selEvent.id)} className="text-sm text-red-400 hover:text-red-300">Leave this event</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-foreground-dim uppercase tracking-wide">Join to see the leaderboard and chat</p>
                    <div className="flex gap-4">
                      <div>
                        <label className="text-xs text-foreground-dim mb-1 block">Goal time (optional)</label>
                        <div className="flex gap-2">
                          <input type="number" placeholder="h" value={goalH} onChange={e => setGoalH(e.target.value)} className="w-14 px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                          <input type="number" placeholder="m" value={goalM} onChange={e => setGoalM(e.target.value)} className="w-14 px-2 py-1.5 rounded-lg bg-background border border-border text-sm outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-foreground-dim mb-1 block">Visibility</label>
                        <button onClick={() => setPub(!pub)} className={"px-3 py-1.5 rounded-lg border text-xs " + (pub ? "bg-signal text-background border-signal" : "border-border")}>{pub ? "Public" : "Private"}</button>
                      </div>
                    </div>
                    <button onClick={() => handleReg(selEvent)} disabled={reging}
                      className="w-full py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">
                      {reging ? "Joining..." : "Join event"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-surface p-8 text-center text-foreground-dim text-sm">
                Select an event to join and see participants
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My events ── */}
      {tab === "myevents" && (
        <div className="space-y-3">
          {myRegs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-foreground-dim mb-3">No events joined yet.</p>
              <button onClick={() => setTab("events")} className="text-sm text-signal hover:underline">Browse events</button>
            </div>
          ) : myRegs.map((reg: any) => {
            const isOpen = expandedReg === reg.majorRaceId;
            const data = commData[reg.majorRaceId];
            const cTab = commTab[reg.majorRaceId] || "leaderboard";
            const myUserId = data?.comm.find((a: any) => a.isMe)?.userId;
            return (
              <div key={reg.id} className={"rounded-2xl border bg-surface overflow-hidden transition-colors " + (isOpen ? "border-signal/40" : "border-border")}>
                {/* Card header */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{reg.majorRace.name}</h3>
                      <p className="text-sm text-foreground-dim">{reg.majorRace.city}, {reg.majorRace.country}</p>
                      <p className="text-sm text-foreground-dim">{new Date(reg.majorRace.raceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      {reg.goalTimeSec && <p className="text-xs text-foreground-dim mt-0.5">Goal: {fmtGoal(reg.goalTimeSec)}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button onClick={() => toggleCommunity(reg.majorRaceId)}
                        className={"text-xs font-medium px-3 py-1.5 rounded-full transition-colors " + (isOpen ? "bg-signal text-background" : "border border-signal text-signal hover:bg-signal/10")}>
                        {isOpen ? "Close" : "Find community"}
                      </button>
                      <button onClick={() => handleUnreg(reg.majorRaceId)} className="text-xs text-red-400 hover:text-red-300">Leave</button>
                    </div>
                  </div>
                </div>

                {/* Inline community panel */}
                {isOpen && (
                  <div className="border-t border-border/60 p-5">
                    <div className="flex gap-2 mb-4">
                      {["leaderboard", "chat"].map(t => (
                        <button key={t} onClick={() => setCommTab(prev => ({ ...prev, [reg.majorRaceId]: t }))}
                          className={"px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors " + (cTab === t ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
                          {t}{!data?.loading && t === "leaderboard" ? ` (${data?.comm.length ?? 0})` : ""}
                          {!data?.loading && t === "chat" ? ` (${data?.messages.length ?? 0})` : ""}
                        </button>
                      ))}
                    </div>

                    {data?.loading ? (
                      <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-border animate-pulse" />)}</div>
                    ) : cTab === "leaderboard" ? (
                      data.comm.length === 0 ? (
                        <p className="text-sm text-foreground-dim text-center py-4">No public athletes yet — be the first!</p>
                      ) : (
                        <div className="space-y-2">
                          {data.comm.map((a: any, i: number) => (
                            <div key={a.userId} className={"rounded-xl border p-3 " + (a.isMe ? "border-signal bg-signal/5" : "border-border bg-background")}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-foreground-dim w-6">#{i + 1}</span>
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
                    ) : (
                      <div className="flex flex-col" style={{ height: "320px" }}>
                        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
                          {data.messages.length === 0 ? (
                            <div className="text-center py-6"><p className="text-sm text-foreground-dim">No messages yet. Start the conversation!</p></div>
                          ) : data.messages.map((msg: any) => {
                            const isMe = msg.user.id === myUserId;
                            return (
                              <div key={msg.id} className={"flex gap-2 " + (isMe ? "flex-row-reverse" : "")}>
                                <div className={"max-w-xs rounded-2xl px-3 py-2 text-sm " + (isMe ? "bg-signal text-background" : "bg-background border border-border")}>
                                  {!isMe && <p className="text-xs font-medium mb-0.5 opacity-70">{msg.user.name}</p>}
                                  <p>{msg.content}</p>
                                  <div className="flex items-center justify-between gap-2 mt-1">
                                    <p className="text-xs opacity-50">{new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                                    {isMe && <button onClick={() => deleteMsg(reg.majorRaceId, msg.id)} className="text-xs opacity-50 hover:opacity-100">Delete</button>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          <div ref={el => { msgEndRefs.current[reg.majorRaceId] = el; }} />
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={newMsgMap[reg.majorRaceId] || ""}
                            onChange={e => setNewMsgMap(prev => ({ ...prev, [reg.majorRaceId]: e.target.value }))}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMsg(reg.majorRaceId)}
                            placeholder="Message the group..."
                            className="flex-1 px-3 py-2 rounded-full bg-background border border-border focus:border-signal outline-none text-sm"
                          />
                          <button onClick={() => sendMsg(reg.majorRaceId)} disabled={sendingMap[reg.majorRaceId] || !newMsgMap[reg.majorRaceId]?.trim()}
                            className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">Send</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Submit ── */}
      {tab === "submit" && (
        <div className="max-w-lg">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="font-semibold mb-1">Submit a race</h2>
            <p className="text-sm text-foreground-dim mb-5">Submit a race and we will review and add it within 24 hours.</p>
            {subResult ? (
              subResult.duplicate ? (
                <div className="rounded-xl border border-signal/30 bg-signal/5 p-4">
                  <p className="text-sm font-medium text-signal mb-1">This race already exists!</p>
                  <p className="text-sm text-foreground-dim">Found: {subResult.race.name}</p>
                  <button onClick={() => { setTab("events"); setSearch(subResult.race.name); setSubResult(null); }} className="text-xs text-signal hover:underline mt-2">Find it in events</button>
                </div>
              ) : (
                <div className="rounded-xl border border-signal/30 bg-signal/5 p-4">
                  <p className="text-sm font-medium text-signal mb-1">Race submitted!</p>
                  <p className="text-sm text-foreground-dim">We will review {subResult.race?.name} and add it within 24 hours.</p>
                  <button onClick={() => { setSubResult(null); setRName(""); setRDate(""); setRCity(""); setRWeb(""); }} className="text-xs text-signal hover:underline mt-2">Submit another</button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div><label className="block text-xs text-foreground-dim mb-1">Race name *</label><input value={rName} onChange={e => setRName(e.target.value)} placeholder="e.g. Austin Marathon" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" /></div>
                <div><label className="block text-xs text-foreground-dim mb-1">Race date *</label><input type="date" value={rDate} onChange={e => setRDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" /></div>
                <div><label className="block text-xs text-foreground-dim mb-1">Distance *</label><select value={rDist} onChange={e => { setRDist(e.target.value); setRTri(TRIS.includes(e.target.value)); }} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm">{Object.keys(DISTS).map(d => <option key={d}>{d}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-foreground-dim mb-1">City *</label><input value={rCity} onChange={e => setRCity(e.target.value)} placeholder="Boston" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" /></div>
                  <div><label className="block text-xs text-foreground-dim mb-1">Country *</label><input value={rCountry} onChange={e => setRCountry(e.target.value)} placeholder="USA" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" /></div>
                </div>
                <div><label className="block text-xs text-foreground-dim mb-1">Website (optional)</label><input value={rWeb} onChange={e => setRWeb(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" /></div>
                <button onClick={handleSub} disabled={subbing || !rName || !rDate || !rCity || !rCountry} className="w-full py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60">{subbing ? "Checking..." : "Submit race"}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
