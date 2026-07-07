"use client";
import { useState, useEffect, useRef } from "react";

const TYPE_LABELS: Record<string, string> = {
  most_workouts: "Most Workouts",
  most_miles: "Most Miles",
  most_active_days: "Most Active Days",
  most_steps: "Most Steps",
};

const FILTER_LABELS: Record<string, string> = {
  run: "Running only",
  walk: "Walking only",
  swim: "Swimming only",
  ride: "Cycling only",
  strength: "Strength only",
};

const RANK_MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function daysLeft(endDate: string): number {
  return Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000));
}

function daysAgo(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

interface Challenge {
  id: string;
  title: string;
  description?: string;
  type: string;
  activityFilter?: string;
  badgeName?: string;
  startDate: string;
  endDate: string;
  status: string;
  participantCount: number;
  isJoined: boolean;
  enrollmentLocked: boolean;
  dailyAwards?: { date: string; awards: { rank: number; userId: string; name: string; stat: string; text: string }[] } | null;
  finalAnnouncement?: { intro: string; top5: { rank: number; userId: string; name: string; stat: string; tribute: string }[] } | null;
  finalAnnouncedAt?: string | null;
}

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  stat: string;
  isMe: boolean;
  dateOfBirth?: string | null;
}

function ageGroup(dob: string | null): string {
  if (!dob) return "Unknown";
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600000));
  if (age < 30) return "Under 30";
  if (age < 40) return "30–39";
  if (age < 50) return "40–49";
  if (age < 60) return "50–59";
  return "60+";
}

function Leaderboard({ challengeId, onClose }: { challengeId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [ageFilter, setAgeFilter] = useState("All");

  useEffect(() => {
    fetch(`/api/platform-challenges/${challengeId}/leaderboard`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [challengeId]);

  const ageGroups = ["All", "Under 30", "30–39", "40–49", "50–59", "60+"];
  const filtered = ageFilter === "All"
    ? entries
    : entries.filter(e => ageGroup(e.dateOfBirth ?? null) === ageFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h3 className="font-medium text-sm">Leaderboard</h3>
          <button onClick={onClose} className="text-foreground-dim hover:text-foreground text-xs">✕</button>
        </div>
        <div className="px-4 py-2 border-b border-border flex gap-1.5 flex-wrap shrink-0">
          {ageGroups.map(g => (
            <button key={g} onClick={() => setAgeFilter(g)}
              className={"text-xs px-2.5 py-1 rounded-full border transition-colors " + (ageFilter === g ? "bg-signal text-background border-signal" : "border-border hover:bg-surface")}>
              {g}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-3 space-y-2">
          {!loaded ? (
            <p className="text-sm text-foreground-dim animate-pulse">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-foreground-dim">No entries in this age group yet.</p>
          ) : filtered.map((e, i) => (
            <div key={e.userId} className={"flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 border " + (e.isMe ? "border-signal/40 bg-signal/10" : "border-border bg-surface")}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm shrink-0">{RANK_MEDAL[i + 1] || `#${i + 1}`}</span>
                <span className={"text-sm font-medium truncate " + (e.isMe ? "text-signal" : "")}>{e.isMe ? "You" : e.name}</span>
              </div>
              <span className="text-xs text-foreground-dim shrink-0">{e.stat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareSheet({ challenge, onClose }: { challenge: Challenge; onClose: () => void }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://train2race.com";
  const shareUrl = `${origin}/challenge/${challenge.id}`;

  const [copied, setCopied] = useState(false);
  const [nameQuery, setNameQuery] = useState("");
  const [nameResults, setNameResults] = useState<{ id: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentUserIds, setSentUserIds] = useState<Set<string>>(new Set());
  const [sendingUser, setSendingUser] = useState<string | null>(null);

  const [emailVal, setEmailVal] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");

  const nameRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nameRef.current) clearTimeout(nameRef.current);
    if (nameQuery.length < 2) { setNameResults([]); return; }
    nameRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(nameQuery)}`).catch(() => null);
      const d = res ? await res.json().catch(() => ({})) : {};
      setNameResults(d.users || []);
      setSearching(false);
    }, 280);
  }, [nameQuery]);

  async function copyLink() {
    try { await navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function inviteUser(userId: string) {
    if (sentUserIds.has(userId)) return;
    setSendingUser(userId);
    const res = await fetch(`/api/platform-challenges/${challenge.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "user", userId }),
    }).catch(() => null);
    if (res?.ok) {
      setSentUserIds(prev => new Set(prev).add(userId));
      setNameQuery("");
      setNameResults([]);
    }
    setSendingUser(null);
  }

  async function sendEmailInvite() {
    if (!emailVal.includes("@")) { setEmailMsg("Enter a valid email address."); return; }
    setEmailSending(true);
    setEmailMsg("");
    const res = await fetch(`/api/platform-challenges/${challenge.id}/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "email", email: emailVal }),
    }).catch(() => null);
    if (res?.ok) {
      setEmailMsg("Invite sent!");
      setEmailVal("");
    } else {
      setEmailMsg("Something went wrong. Try again.");
    }
    setEmailSending(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border border-border rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-sm">Invite friends</h3>
          <button onClick={onClose} className="text-foreground-dim hover:text-foreground text-xs">✕</button>
        </div>

        <div className="p-4 space-y-5">
          {/* Copy link */}
          <div>
            <p className="text-xs text-foreground-dim mb-2">Share link</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-xs bg-surface rounded-lg border border-border px-3 py-2 text-foreground-dim truncate">{shareUrl}</div>
              <button
                onClick={copyLink}
                className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-surface transition-colors shrink-0 font-medium"
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          {/* Invite Train2Race member by name */}
          <div>
            <p className="text-xs text-foreground-dim mb-2">Invite a Train2Race member</p>
            <input
              type="text"
              value={nameQuery}
              onChange={e => setNameQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full text-sm bg-surface rounded-lg border border-border px-3 py-2 outline-none focus:border-signal/60 placeholder:text-foreground-dim/50"
            />
            {searching && <p className="text-xs text-foreground-dim mt-1 animate-pulse">Searching…</p>}
            {!searching && nameResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {nameResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                    <span className="text-sm">{u.name}</span>
                    {sentUserIds.has(u.id) ? (
                      <span className="text-xs text-signal">Invited ✓</span>
                    ) : (
                      <button
                        onClick={() => inviteUser(u.id)}
                        disabled={sendingUser === u.id}
                        className="text-xs px-2.5 py-1 rounded-full bg-signal/10 border border-signal/30 text-signal hover:bg-signal/20 transition-colors disabled:opacity-50"
                      >
                        {sendingUser === u.id ? "…" : "Invite"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Email invite for non-members */}
          <div>
            <p className="text-xs text-foreground-dim mb-2">Invite by email (for non-members)</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={emailVal}
                onChange={e => { setEmailVal(e.target.value); setEmailMsg(""); }}
                onKeyDown={e => e.key === "Enter" && sendEmailInvite()}
                placeholder="friend@example.com"
                className="flex-1 text-sm bg-surface rounded-lg border border-border px-3 py-2 outline-none focus:border-signal/60 placeholder:text-foreground-dim/50"
              />
              <button
                onClick={sendEmailInvite}
                disabled={emailSending || !emailVal}
                className="text-xs px-3 py-2 rounded-lg bg-signal text-background font-medium disabled:opacity-50 shrink-0 hover:bg-signal/90 transition-colors"
              >
                {emailSending ? "…" : "Send"}
              </button>
            </div>
            {emailMsg && (
              <p className={"text-xs mt-1 " + (emailMsg.includes("sent") ? "text-signal" : "text-red-400")}>{emailMsg}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlatformChallengeSection() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [joining, setJoining] = useState<Set<string>>(new Set());
  const [leaderboardId, setLeaderboardId] = useState<string | null>(null);
  const [shareChallenge, setShareChallenge] = useState<Challenge | null>(null);
  const [alertSet, setAlertSet] = useState<Set<string>>(new Set());
  const [alertSending, setAlertSending] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/platform-challenges")
      .then(r => r.json())
      .then(d => { setChallenges(d.challenges || []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function toggleJoin(challenge: Challenge) {
    if (joining.has(challenge.id)) return;
    setJoining(prev => new Set(prev).add(challenge.id));
    const action = challenge.isJoined ? "leave" : "join";
    try {
      const res = await fetch("/api/platform-challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.id, action }),
      });
      if (res.ok) {
        setChallenges(prev => prev.map(c =>
          c.id === challenge.id
            ? { ...c, isJoined: !challenge.isJoined, participantCount: challenge.participantCount + (challenge.isJoined ? -1 : 1) }
            : c
        ));
      }
    } finally {
      setJoining(prev => { const next = new Set(prev); next.delete(challenge.id); return next; });
    }
  }

  async function requestAlert(challengeType: string) {
    if (alertSending.has(challengeType)) return;
    setAlertSending(prev => new Set(prev).add(challengeType));
    const res = await fetch("/api/platform-challenges/alert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ challengeType }),
    }).catch(() => null);
    if (res?.ok) setAlertSet(prev => new Set(prev).add(challengeType));
    setAlertSending(prev => { const n = new Set(prev); n.delete(challengeType); return n; });
  }

  if (!loaded || challenges.length === 0) return null;

  return (
    <>
      {leaderboardId && (
        <Leaderboard challengeId={leaderboardId} onClose={() => setLeaderboardId(null)} />
      )}
      {shareChallenge && (
        <ShareSheet challenge={shareChallenge} onClose={() => setShareChallenge(null)} />
      )}

      <section className="mb-6">
        <h2 className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-3">Platform Challenge 🌍</h2>
        <div className="space-y-3">
          {challenges.map(ch => {
            const now = new Date();
            const isUpcoming = new Date(ch.startDate) > now;
            const isActive = ch.status === "active" && !isUpcoming && new Date(ch.endDate) > now;
            const isEnded = ch.status === "ended" || (!isUpcoming && new Date(ch.endDate) <= now);
            const remaining = daysLeft(ch.endDate);
            const startsIn = isUpcoming ? Math.ceil((new Date(ch.startDate).getTime() - now.getTime()) / 86400000) : 0;
            const enrollmentUrgent = isUpcoming && startsIn <= 7;
            const missedEnrollment = isActive && !ch.isJoined;

            return (
              <div key={ch.id} className="rounded-2xl border border-border bg-surface overflow-hidden">
                {/* Header */}
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm">{ch.title}</h3>
                        {isUpcoming && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-700/40 text-blue-300">Upcoming</span>}
                        {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 border border-green-700/40 text-green-300">{remaining}d left</span>}
                        {isEnded && <span className="text-xs px-2 py-0.5 rounded-full bg-surface-raised border border-border text-foreground-dim">Ended</span>}
                      </div>
                      <p className="text-xs text-foreground-dim">
                        {TYPE_LABELS[ch.type] ?? ch.type}
                        {ch.activityFilter && ch.activityFilter !== "all" ? ` · ${FILTER_LABELS[ch.activityFilter] ?? ch.activityFilter}` : ""}
                        {" · "}{ch.participantCount} athlete{ch.participantCount !== 1 ? "s" : ""}
                      </p>
                      {isUpcoming && (
                        <p className="text-xs text-blue-400 mt-0.5">
                          Starts {new Date(ch.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                          {" · "}Ends {new Date(ch.endDate).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                        </p>
                      )}
                      {enrollmentUrgent && (
                        <p className="text-xs text-amber-400 mt-0.5 font-medium">
                          ⏰ Enrollment closes in {startsIn} day{startsIn !== 1 ? "s" : ""}
                        </p>
                      )}
                      {ch.description && <p className="text-xs text-foreground-dim mt-1">{ch.description}</p>}
                      {ch.badgeName && <p className="text-xs text-foreground-dim mt-0.5">Badge: {ch.badgeName}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {(isActive || isUpcoming) && (
                        <button
                          onClick={() => toggleJoin(ch)}
                          disabled={joining.has(ch.id)}
                          className={"text-xs px-3 py-1.5 rounded-full font-medium border transition-colors disabled:opacity-50 " + (ch.isJoined ? "bg-signal/10 border-signal/40 text-signal" : "bg-signal text-background border-signal hover:bg-signal/90")}
                        >
                          {joining.has(ch.id) ? "…" : ch.isJoined ? "✓ Joined" : isUpcoming ? "Join early" : "Join"}
                        </button>
                      )}
                      {isUpcoming && (
                        <button
                          onClick={() => setShareChallenge(ch)}
                          className="text-xs text-foreground-dim hover:text-signal transition-colors flex items-center gap-1"
                        >
                          ↗ Invite friends
                        </button>
                      )}
                      {isActive && (
                        <button onClick={() => setLeaderboardId(ch.id)} className="text-xs text-foreground-dim hover:text-signal transition-colors">
                          Leaderboard →
                        </button>
                      )}
                      {isEnded && (
                        <button onClick={() => setLeaderboardId(ch.id)} className="text-xs text-foreground-dim hover:text-signal transition-colors">
                          Final standings →
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* FOMO enrollment closed notice */}
                {missedEnrollment && (
                  <div className="border-t border-border px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-foreground-dim">Enrollment closed when this challenge started.</p>
                    </div>
                    {alertSet.has(ch.type) ? (
                      <span className="text-xs text-signal shrink-0">✓ You'll be notified</span>
                    ) : (
                      <button
                        onClick={() => requestAlert(ch.type)}
                        disabled={alertSending.has(ch.type)}
                        className="text-xs px-3 py-1.5 rounded-full border border-signal/40 text-signal hover:bg-signal/10 transition-colors shrink-0 disabled:opacity-50"
                      >
                        {alertSending.has(ch.type) ? "…" : "🔔 Alert me next time"}
                      </button>
                    )}
                  </div>
                )}

                {/* Daily awards */}
                {ch.dailyAwards?.awards?.length > 0 && isActive && (
                  <div className="border-t border-border px-4 py-3 bg-surface-raised/50">
                    <p className="text-xs font-medium text-foreground-dim uppercase tracking-wide mb-2">Today's leaders</p>
                    <div className="space-y-1.5">
                      {ch.dailyAwards.awards.map(award => (
                        <div key={award.rank} className="flex items-baseline gap-2">
                          <span className="text-sm shrink-0">{RANK_MEDAL[award.rank] ?? `#${award.rank}`}</span>
                          <p className="text-xs text-foreground-dim flex-1">
                            <span className="text-foreground font-medium">{award.name}</span>
                            {" — "}{award.text}
                            <span className="text-foreground-dim/60 ml-1">({award.stat})</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Final announcement */}
                {ch.finalAnnouncement && isEnded && (
                  <div className="border-t border-border px-4 py-3">
                    <p className="text-xs font-medium mb-2">🏆 Final Results</p>
                    <p className="text-xs text-foreground-dim mb-3">{ch.finalAnnouncement.intro}</p>
                    <div className="space-y-2">
                      {ch.finalAnnouncement.top5.map(e => (
                        <div key={e.rank} className="flex items-start gap-2">
                          <span className="text-sm shrink-0 mt-0.5">{RANK_MEDAL[e.rank] ?? `#${e.rank}`}</span>
                          <div>
                            <p className="text-xs font-medium">{e.name} <span className="text-foreground-dim font-normal">— {e.stat}</span></p>
                            <p className="text-xs text-foreground-dim mt-0.5">{e.tribute}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
