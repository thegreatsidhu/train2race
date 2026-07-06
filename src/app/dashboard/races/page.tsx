"use client";
import { useState, useEffect } from "react";
import { ChatPanel } from "@/components/ChatPanel";

const DFILTERS = [
  { label: "All" },
  { label: "5K/10K", min: 0, max: 15000 },
  { label: "Half", min: 15000, max: 30000 },
  { label: "Marathon", min: 30000, max: 50000 },
  { label: "Ultra", min: 50000, max: 999999, tri: false },
  { label: "Triathlon", tri: true },
  { label: "Ironman", min: 100000, tri: true },
];
const DISTS: Record<string, number> = { "5K":5000,"10K":10000,"Half Marathon":21097,"Marathon":42195,"Ultra 50K":50000,"Ultra 50M":80467,"Ultra 100K":100000,"Ultra 100M":160934,"Sprint Triathlon":25750,"Olympic Triathlon":51500,"70.3 Half Ironman":113000,"140.6 Full Ironman":226000 };
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
  const [tab, setTab] = useState(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("tab") === "events") return "events";
    }
    return "myevents";
  });
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);

  // Events
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [myRegs, setMyRegs] = useState<any[]>([]);
  const [selEvent, setSelEvent] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [df, setDf] = useState(0);
  const [yearF, setYearF] = useState("all");
  const [countryF, setCountryF] = useState("all");
  const [goalH, setGoalH] = useState("");
  const [goalM, setGoalM] = useState("");
  const [pub, setPub] = useState(true);
  const [reging, setReging] = useState(false);

  // My events — inline community
  const [expandedReg, setExpandedReg] = useState<string | null>(null);
  const [commData, setCommData] = useState<Record<string, { comm: any[]; messages: any[]; loading: boolean; isAdmin: boolean; myUserId: string }>>({});
  const [commTab, setCommTab] = useState<Record<string, string>>({});
  const [sendingMap, setSendingMap] = useState<Record<string, boolean>>({});

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

  // My pending submissions
  const [mySubmissions, setMySubmissions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsLoaded, setSubsLoaded] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
  const [editSubDate, setEditSubDate] = useState("");
  const [editSubDist, setEditSubDist] = useState("Marathon");
  const [editSubCity, setEditSubCity] = useState("");
  const [editSubCountry, setEditSubCountry] = useState("USA");
  const [editSubWeb, setEditSubWeb] = useState("");
  const [savingSub, setSavingSub] = useState(false);
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<string | null>(null);
  const [deletingSub, setDeletingSub] = useState(false);

  // Report inaccuracy
  const [reportingRaceId, setReportingRaceId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [racePage, setRacePage] = useState(1);
  const [reportDone, setReportDone] = useState(false);
  const [showPast, setShowPast] = useState(false);

  useEffect(() => {
    fetch("/api/major-races/register").then(r => r.json()).then(d => setMyRegs(d.registrations || []));
  }, []);

  useEffect(() => {
    if (tab === "events") {
      setEventsLoading(true);
      setEvents([]);
      const url = showPast ? "/api/major-races" : "/api/major-races?upcoming=1";
      fetch(url).then(r => r.json()).then(d => { setEvents(d.races || []); setEventsLoading(false); });
    }
    if (tab === "submit") { setSubsLoaded(false); loadMySubmissions(); }
  }, [tab, showPast]);

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
      setCommData(prev => ({ ...prev, [majorRaceId]: { comm: [], messages: [], loading: true, isAdmin: false, myUserId: "" } }));
      setCommTab(prev => ({ ...prev, [majorRaceId]: "leaderboard" }));
      const [cr, mr] = await Promise.all([
        fetch("/api/major-races/community?raceId=" + majorRaceId),
        fetch("/api/major-races/messages?raceId=" + majorRaceId),
      ]);
      const cd = await cr.json();
      const md = await mr.json();
      const myUserId = cd.community?.find((a: any) => a.isMe)?.userId || "";
      setCommData(prev => ({ ...prev, [majorRaceId]: { comm: cd.community || [], messages: md.messages || [], loading: false, isAdmin: md.isAdmin || false, myUserId } }));
    }
  }

  async function sendMsg(majorRaceId: string, content: string, replyToId?: string) {
    setSendingMap(prev => ({ ...prev, [majorRaceId]: true }));
    const res = await fetch("/api/major-races/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ majorRaceId, content, replyToId }),
    });
    const data = await res.json();
    if (res.ok) {
      setCommData(prev => ({ ...prev, [majorRaceId]: { ...prev[majorRaceId], messages: [...prev[majorRaceId].messages, data.message] } }));
    }
    setSendingMap(prev => ({ ...prev, [majorRaceId]: false }));
  }

  async function deleteMsg(majorRaceId: string, messageId: string) {
    await fetch("/api/major-races/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId }) });
    setCommData(prev => ({ ...prev, [majorRaceId]: { ...prev[majorRaceId], messages: prev[majorRaceId].messages.filter((m: any) => m.id !== messageId) } }));
  }

  async function deleteAllMsgs(majorRaceId: string) {
    await fetch("/api/major-races/messages", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ majorRaceId, deleteAll: true }) });
    setCommData(prev => ({ ...prev, [majorRaceId]: { ...prev[majorRaceId], messages: [] } }));
  }

  async function handleSub() {
    if (!rName.trim() || !rDate || !rCity.trim() || !rCountry) { setSubResult({ error: "Please fill in all required fields." }); return; }
    const rd = new Date(rDate);
    if (isNaN(rd.getTime())) { setSubResult({ error: "Invalid race date." }); return; }
    setSubbing(true); setSubResult(null);
    const res = await fetch("/api/major-races/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: rName, raceDate: rDate, distanceM: DISTS[rDist], city: rCity, country: rCountry, website: rWeb || null, isTriathlon: rTri }) });
    const result = await res.json();
    setSubResult(result);
    setSubbing(false);
    if (!result.duplicate) {
      fetch("/api/major-races/submit").then(r => r.json()).then(d => { setMySubmissions(d.submissions || []); setSubsLoaded(true); });
    }
  }

  async function loadMySubmissions() {
    setSubsLoading(true);
    const res = await fetch("/api/major-races/submit");
    const d = await res.json();
    setMySubmissions(d.submissions || []);
    setSubsLoading(false);
    setSubsLoaded(true);
  }

  async function saveSubEdit(raceId: string) {
    setSavingSub(true);
    const distM = DISTS[editSubDist] || DISTS["Marathon"];
    const res = await fetch("/api/major-races/submit", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raceId, name: editSubName, raceDate: editSubDate, distanceM: distM, city: editSubCity, country: editSubCountry, website: editSubWeb || null, isTriathlon: TRIS.includes(editSubDist) }),
    });
    setSavingSub(false);
    if (res.ok) {
      const d = await res.json();
      setMySubmissions(prev => prev.map(s => s.id === raceId ? d.race : s));
      setEditingSubId(null);
    }
  }

  async function deleteSubmission(raceId: string) {
    setDeletingSub(true);
    await fetch("/api/major-races/submit", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raceId }) });
    setMySubmissions(prev => prev.filter(s => s.id !== raceId));
    setConfirmDeleteSubId(null);
    setDeletingSub(false);
  }

  async function submitReport(raceId: string) {
    setReporting(true);
    await fetch(`/api/major-races/${raceId}/report`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reportReason }),
    });
    setReporting(false);
    setReportDone(true);
    setReportingRaceId(null);
    setReportReason("");
  }

  useEffect(() => { setRacePage(1); }, [search, df, yearF, countryF, showPast]);

  const isReg = (id: string) => myRegs.some((r: any) => r.majorRaceId === id);
  const f = DFILTERS[df] as any;
  const filtered = events.filter((r: any) => {
    const ms = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.city?.toLowerCase().includes(search.toLowerCase());
    let md: boolean;
    if (f.tri === true) md = r.isTriathlon;
    else if (f.tri === false) md = !r.isTriathlon && (f.min == null || (r.distanceM >= f.min && r.distanceM <= f.max));
    else md = f.min == null || (r.distanceM >= f.min && r.distanceM <= f.max);
    const yr = yearF === "all" || new Date(r.raceDate).getFullYear() === parseInt(yearF);
    const ct = countryF === "all" || (countryF === "USA" ? r.country === "USA" : r.country !== "USA");
    return ms && md && yr && ct;
  });

  const TABS = [
    { id: "myevents", label: `My events${myRegs.length > 0 ? ` (${myRegs.length})` : ""}` },
    { id: "events", label: "Browse events" },
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

      {/* ── Events ── */}
      {tab === "events" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <input placeholder="Search by name or city..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border focus:border-signal outline-none text-sm mb-3" />
            <div className="flex gap-1.5 flex-wrap mb-2">
              {DFILTERS.map((fi, i) => (
                <button key={fi.label} onClick={() => setDf(i)}
                  className={"text-xs px-3 py-1 rounded-full border transition-colors " + (df === i ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                  {fi.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap mb-2 items-center">
              {(showPast ? ["all","2024","2025","2026","2027"] : ["all","2026","2027"]).map(y => (
                <button key={y} onClick={() => setYearF(y)}
                  className={"text-xs px-3 py-1 rounded-full border transition-colors " + (yearF === y ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                  {y === "all" ? "Any year" : y}
                </button>
              ))}
              <button onClick={() => { setShowPast(p => !p); setYearF("all"); }}
                className={"text-xs px-3 py-1 rounded-full border transition-colors ml-auto " + (showPast ? "bg-surface-raised border-border" : "border-border hover:bg-surface")}>
                {showPast ? "Hide past races" : "Show past races"}
              </button>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {[["all","All countries"],["USA","USA"],["international","International"]].map(([v,l]) => (
                <button key={v} onClick={() => setCountryF(v)}
                  className={"text-xs px-3 py-1 rounded-full border transition-colors " + (countryF === v ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                  {l}
                </button>
              ))}
            </div>
            {eventsLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-surface animate-pulse" />)}</div>
            ) : (
              <>
                <p className="text-xs text-foreground-dim mb-2">{filtered.length} events</p>
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filtered.slice(0, racePage * 30).map((race: any) => {
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
                {filtered.length > racePage * 30 && (
                  <button onClick={() => setRacePage(p => p + 1)} className="w-full mt-2 py-2 text-xs text-foreground-dim hover:text-foreground border border-border rounded-xl hover:bg-surface transition-colors">
                    Show more ({filtered.length - racePage * 30} remaining)
                  </button>
                )}
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
                    {confirmLeave === selEvent.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-foreground-dim">Leave this event?</span>
                        <button onClick={() => { handleUnreg(selEvent.id); setConfirmLeave(null); }} className="text-sm text-red-400 hover:text-red-300">Yes, leave</button>
                        <button onClick={() => setConfirmLeave(null)} className="text-sm text-foreground-dim hover:text-foreground">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmLeave(selEvent.id)} className="text-sm text-red-400 hover:text-red-300">Leave this event</button>
                    )}
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

            {selEvent && (
              <div className="mt-3 px-1">
                {reportingRaceId === selEvent.id ? (
                  <div className="rounded-xl border border-border bg-surface p-3 space-y-2">
                    <p className="text-xs font-medium">Report inaccuracy</p>
                    <textarea value={reportReason} onChange={e => setReportReason(e.target.value)} placeholder="Describe the issue (wrong date, distance, location...)" rows={3}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-xs resize-none" />
                    <div className="flex gap-2">
                      <button onClick={() => submitReport(selEvent.id)} disabled={reporting || !reportReason.trim()} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-60">{reporting ? "Sending..." : "Send report"}</button>
                      <button onClick={() => { setReportingRaceId(null); setReportReason(""); }} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                    </div>
                  </div>
                ) : reportDone ? (
                  <p className="text-xs text-signal">Report submitted — thank you!</p>
                ) : (
                  <button onClick={() => { setReportingRaceId(selEvent.id); setReportDone(false); }} className="text-xs text-foreground-dim hover:text-foreground underline">Report inaccuracy</button>
                )}
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
                      {confirmLeave === reg.majorRaceId ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-foreground-dim">Leave?</span>
                          <button onClick={() => { handleUnreg(reg.majorRaceId); setConfirmLeave(null); }} className="text-xs text-red-400 hover:text-red-300">Yes</button>
                          <button onClick={() => setConfirmLeave(null)} className="text-xs text-foreground-dim hover:text-foreground">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmLeave(reg.majorRaceId)} className="text-xs text-red-400 hover:text-red-300">Leave</button>
                      )}
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
                      <ChatPanel
                        messages={data.messages}
                        myUserId={data.myUserId}
                        isAdmin={data.isAdmin}
                        height="320px"
                        onSend={(content, replyToId) => sendMsg(reg.majorRaceId, content, replyToId)}
                        onDelete={(messageId) => deleteMsg(reg.majorRaceId, messageId)}
                        onDeleteAll={data.isAdmin ? () => deleteAllMsgs(reg.majorRaceId) : undefined}
                        sending={sendingMap[reg.majorRaceId]}
                      />
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

          {/* My pending submissions */}
          <div className="mt-6">
            <h3 className="font-medium mb-3 text-sm">My pending submissions</h3>
            {subsLoading ? (
              <div className="space-y-2">{[1,2].map(i=><div key={i} className="h-14 rounded-xl bg-surface border border-border animate-pulse"/>)}</div>
            ) : mySubmissions.length === 0 ? (
              <p className="text-sm text-foreground-dim">No pending submissions.</p>
            ) : (
              <div className="space-y-3">
                {mySubmissions.map((s: any) => (
                  <div key={s.id} className="rounded-xl border border-border bg-surface p-4">
                    {editingSubId === s.id ? (
                      <div className="space-y-3">
                        <input value={editSubName} onChange={e => setEditSubName(e.target.value)} placeholder="Race name" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                        <input type="date" value={editSubDate} onChange={e => setEditSubDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                        <select value={editSubDist} onChange={e => setEditSubDist(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm">
                          {Object.keys(DISTS).map(d => <option key={d}>{d}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                          <input value={editSubCity} onChange={e => setEditSubCity(e.target.value)} placeholder="City" className="px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                          <input value={editSubCountry} onChange={e => setEditSubCountry(e.target.value)} placeholder="Country" className="px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                        </div>
                        <input value={editSubWeb} onChange={e => setEditSubWeb(e.target.value)} placeholder="Website (optional)" className="w-full px-3 py-2 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm" />
                        <div className="flex gap-2">
                          <button onClick={() => saveSubEdit(s.id)} disabled={savingSub} className="text-xs px-3 py-1.5 rounded-full bg-signal text-background font-medium disabled:opacity-60">{savingSub ? "Saving..." : "Save"}</button>
                          <button onClick={() => setEditingSubId(null)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-foreground-dim">{s.city}, {s.country} · {(s.distanceM/1609.34).toFixed(1)}mi</p>
                          <p className="text-xs text-foreground-dim">{new Date(s.raceDate).toLocaleDateString()} · Pending review</p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <button onClick={() => {
                            setEditingSubId(s.id);
                            setEditSubName(s.name);
                            setEditSubDate(new Date(s.raceDate).toISOString().split("T")[0]);
                            setEditSubCity(s.city);
                            setEditSubCountry(s.country);
                            setEditSubWeb(s.website || "");
                            const distKey = Object.entries(DISTS).find(([,v]) => Math.abs(v - s.distanceM) < 100)?.[0] || "Marathon";
                            setEditSubDist(distKey);
                          }} className="text-xs text-signal hover:underline">Edit</button>
                          {confirmDeleteSubId === s.id ? (
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => deleteSubmission(s.id)} disabled={deletingSub} className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50">{deletingSub ? "..." : "Confirm"}</button>
                              <button onClick={() => setConfirmDeleteSubId(null)} className="text-xs text-foreground-dim hover:text-foreground">Cancel</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDeleteSubId(s.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
