"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const CATEGORIES = ["general", "bug", "feature", "account", "billing", "other"];
const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-900/30 text-yellow-300 border-yellow-700/40",
  in_progress: "bg-blue-900/30 text-blue-300 border-blue-700/40",
  resolved: "bg-green-900/30 text-green-300 border-green-700/40",
  closed: "bg-surface text-foreground-dim border-border",
};
const METRIC_UNITS: Record<string, string[]> = {
  distance: ["mi", "km"],
  duration: ["min"],
  count: ["sessions", "steps"],
};

function daysLeft(end: string) {
  const d = Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  return d <= 0 ? "Ended" : d === 1 ? "1 day left" : `${d} days left`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChallengesPage() {
  const [tab, setTab] = useState<"discover" | "create" | "help">("discover");

  // ── Discover state ──────────────────────────────────────────────────────────
  const [challenges, setChallenges] = useState<any[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinMsg, setJoinMsg] = useState<Record<string, string>>({});

  // ── Create state ────────────────────────────────────────────────────────────
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [form, setForm] = useState({
    title: "", type: "run", metric: "distance", unit: "mi",
    goal: "", startDate: "", endDate: "", description: "", isPublic: true,
  });
  const [saving, setSaving] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [createOk, setCreateOk] = useState(false);

  // ── Help state ──────────────────────────────────────────────────────────────
  const [ticketForm, setTicketForm] = useState({ subject: "", description: "", category: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitOk, setSubmitOk] = useState(false);
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // ── Load challenges on mount / filter change ────────────────────────────────
  useEffect(() => {
    setLoadingChallenges(true);
    fetch(`/api/challenges?active=${activeOnly ? "1" : "0"}`)
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges || []); setLoadingChallenges(false); })
      .catch(() => setLoadingChallenges(false));
  }, [activeOnly]);

  // ── Load teams when Create tab opens ───────────────────────────────────────
  useEffect(() => {
    if (tab !== "create" || myTeams.length > 0) return;
    setLoadingTeams(true);
    fetch("/api/teams")
      .then(r => r.json())
      .then(d => { setMyTeams(d.teams || []); setLoadingTeams(false); })
      .catch(() => setLoadingTeams(false));
  }, [tab]);

  // ── Load tickets when Help tab opens ───────────────────────────────────────
  useEffect(() => {
    if (tab !== "help" || myTickets.length > 0) return;
    setLoadingTickets(true);
    fetch("/api/support")
      .then(r => r.json())
      .then(d => { setMyTickets(d.tickets || []); setLoadingTickets(false); })
      .catch(() => setLoadingTickets(false));
  }, [tab]);

  async function joinTeam(teamId: string, challengeId: string) {
    setJoiningId(challengeId);
    const res = await fetch(`/api/teams/${teamId}/join`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setJoiningId(null);
    if (res.ok || d.teamId) {
      setChallenges(prev => prev.map(c => c.id === challengeId ? { ...c, isMember: true } : c));
      setJoinMsg(prev => ({ ...prev, [challengeId]: "Joined! Go to the team page to log your progress." }));
    } else {
      setJoinMsg(prev => ({ ...prev, [challengeId]: d.error || "Failed to join." }));
    }
  }

  function onMetricChange(metric: string) {
    const unit = METRIC_UNITS[metric]?.[0] ?? "mi";
    setForm(f => ({ ...f, metric, unit }));
  }

  async function createChallenge() {
    if (!selectedTeam || !form.title || !form.startDate || !form.endDate) return;
    setSaving(true); setCreateMsg("");
    const res = await fetch(`/api/teams/${selectedTeam}/challenges`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, goal: form.goal || null }),
    });
    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      setCreateOk(true);
      const isPending = d.challenge?.status === "pending";
      setCreateMsg(isPending
        ? "Challenge submitted for approval. This can take up to 5 days — you'll see it on your team page with a Pending badge."
        : "Challenge created!" + (form.isPublic ? " It will appear in Discover." : ""));
      setForm({ title: "", type: "run", metric: "distance", unit: "mi", goal: "", startDate: "", endDate: "", description: "", isPublic: true });
      setSelectedTeam("");
    } else {
      const d = await res.json().catch(() => ({}));
      setCreateOk(false);
      setCreateMsg(d.error || "Failed to create challenge.");
    }
  }

  async function submitTicket() {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) return;
    setSubmitting(true); setSubmitMsg("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticketForm),
    });
    setSubmitting(false);
    if (res.ok) {
      const d = await res.json();
      setSubmitOk(true);
      setSubmitMsg("Ticket submitted — we'll get back to you soon.");
      setMyTickets(prev => [d.ticket, ...prev]);
      setTicketForm({ subject: "", description: "", category: "general" });
    } else {
      setSubmitOk(false);
      setSubmitMsg("Failed to submit. Please try again.");
    }
  }

  return (
    <div className="max-w-3xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Challenges</h1>
        <p className="text-sm text-foreground-dim mt-1">Compete with your team or the wider community</p>
      </header>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["discover", "create", "help"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={"px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize " +
              (tab === t ? "bg-signal text-background" : "border border-border hover:bg-surface")}>
            {t === "help" ? "Help & Support" : t}
          </button>
        ))}
      </div>

      {/* ── DISCOVER ── */}
      {tab === "discover" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-foreground-dim">{challenges.length} public challenge{challenges.length !== 1 ? "s" : ""}</p>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)}
                className="accent-signal" />
              <span className="text-foreground-dim">Active only</span>
            </label>
          </div>

          {loadingChallenges ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-28 rounded-2xl bg-surface border border-border animate-pulse" />)}
            </div>
          ) : challenges.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <p className="text-sm font-medium mb-1">No public challenges yet</p>
              <p className="text-xs text-foreground-dim mb-4">Be the first — create one from the Create tab and make it public.</p>
              <button onClick={() => setTab("create")} className="text-xs text-signal hover:underline">Create a challenge →</button>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map(c => {
                const active = c.isActive;
                const msg = joinMsg[c.id];
                return (
                  <div key={c.id} className={"rounded-2xl border bg-surface p-5 " + (active ? "border-border" : "border-border opacity-70")}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="font-medium text-sm">{c.title}</p>
                          {!active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-surface-raised border border-border text-foreground-dim">Ended</span>}
                          {active && <span className="text-xs px-1.5 py-0.5 rounded-full bg-signal/10 text-signal border border-signal/20">Active</span>}
                        </div>
                        <p className="text-xs text-foreground-dim capitalize">{c.type} · {c.metric} · {c.unit}{c.goal ? ` · Goal: ${c.goal} ${c.unit}` : ""}</p>
                        <p className="text-xs text-foreground-dim mt-0.5">{fmtDate(c.startDate)} – {fmtDate(c.endDate)} · {active ? daysLeft(c.endDate) : "Ended"}</p>
                        {c.description && <p className="text-xs text-foreground-dim mt-1 line-clamp-1">{c.description}</p>}
                        <p className="text-xs text-foreground-dim mt-1">{c.teamName} · {c.participants} participant{c.participants !== 1 ? "s" : ""}</p>
                        {msg && <p className="text-xs text-signal mt-1">{msg}</p>}
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        {c.isMember ? (
                          <Link href={`/dashboard/teams/${c.teamId}`}
                            className="px-3 py-1.5 rounded-full border border-signal text-signal text-xs font-medium hover:bg-signal/10 transition-colors">
                            Go to team →
                          </Link>
                        ) : active ? (
                          <button onClick={() => joinTeam(c.teamId, c.id)} disabled={joiningId === c.id}
                            className="px-3 py-1.5 rounded-full bg-signal text-background text-xs font-medium disabled:opacity-50">
                            {joiningId === c.id ? "Joining…" : "Join to participate"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── CREATE ── */}
      {tab === "create" && (
        <div>
          {loadingTeams ? (
            <p className="text-sm text-foreground-dim">Loading your teams…</p>
          ) : myTeams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center">
              <p className="text-sm font-medium mb-1">You're not in any teams yet</p>
              <p className="text-xs text-foreground-dim mb-4">Challenges belong to a team. Join or create one first.</p>
              <Link href="/dashboard/teams" className="text-xs text-signal hover:underline">Go to Teams →</Link>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Team picker */}
              <div>
                <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">Team</label>
                <div className="flex flex-wrap gap-2">
                  {myTeams.map((t: any) => (
                    <button key={t.id} onClick={() => setSelectedTeam(t.id)}
                      className={"px-4 py-2 rounded-full text-sm font-medium border transition-colors " +
                        (selectedTeam === t.id ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTeam && (
                <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
                  <h3 className="font-medium text-sm">Challenge details</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Title</label>
                      <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        placeholder="e.g. July Miles Challenge"
                        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Activity</label>
                      <select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                        {["run", "walk", "swim", "bike", "steps", "custom"].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Track by</label>
                      <select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        value={form.metric} onChange={e => onMetricChange(e.target.value)}>
                        {["distance", "duration", "count"].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Unit</label>
                      <select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                        {(METRIC_UNITS[form.metric] || ["mi"]).map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Goal (optional)</label>
                      <input type="number" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        placeholder={`e.g. 100`}
                        value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Start date</label>
                      <input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">End date</label>
                      <input type="date" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                        value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Description (optional)</label>
                      <textarea className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={2}
                        value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>
                  </div>

                  {/* Approval notice */}
                  <div className="rounded-xl border border-yellow-700/40 bg-yellow-900/10 px-4 py-3">
                    <p className="text-xs text-yellow-300">Challenges require admin approval and can take up to 5 days to go live. Team admins can approve challenges on the team page.</p>
                  </div>

                  {/* Public toggle */}
                  <label className="flex items-center gap-3 cursor-pointer rounded-xl border border-border bg-background px-4 py-3">
                    <input type="checkbox" checked={form.isPublic} onChange={e => setForm(f => ({ ...f, isPublic: e.target.checked }))}
                      className="accent-signal w-4 h-4" />
                    <div>
                      <p className="text-sm font-medium">Make this challenge public</p>
                      <p className="text-xs text-foreground-dim">Visible in the Discover tab — anyone can join your team to participate</p>
                    </div>
                  </label>

                  {createMsg && (
                    <p className={"text-sm " + (createOk ? "text-signal" : "text-red-400")}>{createMsg}</p>
                  )}

                  <button onClick={createChallenge} disabled={saving || !form.title || !form.startDate || !form.endDate}
                    className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">
                    {saving ? "Creating…" : "Create challenge"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── HELP ── */}
      {tab === "help" && (
        <div className="space-y-6">
          {/* Report form */}
          <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
            <div>
              <h2 className="font-semibold text-sm">Report an issue</h2>
              <p className="text-xs text-foreground-dim mt-0.5">We'll review and respond to every ticket</p>
            </div>

            <div>
              <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Category</label>
              <select className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                value={ticketForm.category} onChange={e => setTicketForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Subject</label>
              <input className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
                placeholder="Brief summary of the issue"
                value={ticketForm.subject} onChange={e => setTicketForm(f => ({ ...f, subject: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Description</label>
              <textarea className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm" rows={4}
                placeholder="Describe what happened, what you expected, and any steps to reproduce…"
                value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {submitMsg && (
              <p className={"text-sm " + (submitOk ? "text-signal" : "text-red-400")}>{submitMsg}</p>
            )}

            <button onClick={submitTicket}
              disabled={submitting || !ticketForm.subject.trim() || !ticketForm.description.trim()}
              className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50">
              {submitting ? "Submitting…" : "Submit ticket"}
            </button>
          </div>

          {/* Ticket history */}
          <div>
            <h2 className="text-sm font-medium text-foreground-dim mb-3">Your tickets</h2>
            {loadingTickets ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse" />)}
              </div>
            ) : myTickets.length === 0 ? (
              <p className="text-sm text-foreground-dim">No tickets yet.</p>
            ) : (
              <div className="space-y-2">
                {myTickets.map((t: any) => (
                  <div key={t.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.subject}</p>
                        <p className="text-xs text-foreground-dim capitalize mt-0.5">{t.category} · {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                        {t.adminNote && <p className="text-xs text-signal mt-1">Admin: {t.adminNote}</p>}
                      </div>
                      <span className={"text-xs px-2 py-0.5 rounded-full border shrink-0 " + (STATUS_COLORS[t.status] || STATUS_COLORS.open)}>
                        {t.status.replace("_", " ")}
                      </span>
                    </div>
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
