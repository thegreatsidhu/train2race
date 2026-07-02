"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface NotifGroup { teamId: string; teamName: string; count: number; senderName: string; preview: string; }
interface AdminDm    { id: string; content: string; createdAt: string; }
interface GroupAlert { id: string; type: "event" | "challenge"; teamId: string; teamName: string; title: string; createdAt: string; }

export function DashboardNotifications() {
  const [data, setData] = useState<{ teamMessageGroups: NotifGroup[]; dmGroups: NotifGroup[]; adminDms: AdminDm[]; groupAlerts: GroupAlert[] } | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved: Record<string, number> = JSON.parse(localStorage.getItem("t2r-dismissed-notifs") || "{}");
      const cutoff = Date.now() - 7 * 86400000;
      const valid = Object.keys(saved).filter(k => saved[k] > cutoff);
      if (valid.length) setDismissed(new Set(valid));
    } catch {}
    fetch("/api/me/notifications")
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {});
  }, []);

  function persistDismiss(key: string) {
    setDismissed(prev => {
      const next = new Set(prev).add(key);
      try {
        const saved: Record<string, number> = JSON.parse(localStorage.getItem("t2r-dismissed-notifs") || "{}");
        saved[key] = Date.now();
        localStorage.setItem("t2r-dismissed-notifs", JSON.stringify(saved));
      } catch {}
      return next;
    });
  }

  function dismissTeam(teamId: string, key: string) {
    persistDismiss(key);
    fetch(`/api/teams/${teamId}/mark-read`, { method: "POST" }).catch(() => {});
  }

  function dismissAdminDm(id: string) {
    persistDismiss("adm-" + id);
    fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  if (!data) return null;

  const { teamMessageGroups = [], dmGroups = [], adminDms = [], groupAlerts = [] } = data;
  const visibleDms   = dmGroups.filter(g => !dismissed.has("dm-" + g.teamId));
  const visibleTeam  = teamMessageGroups.filter(g => !dismissed.has("team-" + g.teamId));
  const visibleAdmin = adminDms.filter(m => !dismissed.has("adm-" + m.id));
  const visibleAlerts = groupAlerts.filter(a => !dismissed.has("ga-" + a.id));

  if (!visibleDms.length && !visibleTeam.length && !visibleAdmin.length && !visibleAlerts.length) return null;

  return (
    <div className="mb-6 space-y-2">
      {visibleAlerts.map(a => (
        <div key={"ga-" + a.id} className={"flex items-start gap-3 rounded-2xl border px-4 py-3 " + (a.type === "event" ? "border-purple-700/40 bg-purple-900/15" : "border-orange-700/40 bg-orange-900/15")}>
          <span className="text-base shrink-0 mt-0.5">{a.type === "event" ? "📅" : "🏆"}</span>
          <Link href={`/dashboard/teams/${a.teamId}?tab=${a.type === "event" ? "events" : "challenges"}`} onClick={() => persistDismiss("ga-" + a.id)} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium">New {a.type} in {a.teamName}</p>
            <p className="text-xs text-foreground-dim truncate">{a.title}</p>
          </Link>
          <button onClick={() => persistDismiss("ga-" + a.id)} className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none" aria-label="Dismiss">✕</button>
        </div>
      ))}
      {visibleAdmin.map(m => (
        <div key={"adm-" + m.id} className="flex items-start gap-3 rounded-2xl border border-blue-700/40 bg-blue-900/20 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">🔔</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-400 font-medium mb-0.5">Message from Train2Race</p>
            <p className="text-sm">{m.content}</p>
          </div>
          <button onClick={() => dismissAdminDm(m.id)} className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none" aria-label="Dismiss">✕</button>
        </div>
      ))}
      {visibleDms.map(g => (
        <div key={"dm-" + g.teamId} className="flex items-start gap-3 rounded-2xl border border-signal/50 bg-signal/10 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">✉️</span>
          <Link href={`/dashboard/teams/${g.teamId}?tab=chat`} onClick={() => dismissTeam(g.teamId, "dm-" + g.teamId)} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium">{g.count} new private {g.count === 1 ? "message" : "messages"} from {g.senderName}</p>
            <p className="text-xs text-foreground-dim truncate">{g.teamName} · "{g.preview.length > 60 ? g.preview.slice(0, 60) + "…" : g.preview}"</p>
          </Link>
          <button onClick={() => dismissTeam(g.teamId, "dm-" + g.teamId)} className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none" aria-label="Dismiss">✕</button>
        </div>
      ))}
      {visibleTeam.map(g => (
        <div key={"team-" + g.teamId} className="flex items-start gap-3 rounded-2xl border border-signal/30 bg-signal/5 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">💬</span>
          <Link href={`/dashboard/teams/${g.teamId}?tab=chat`} onClick={() => dismissTeam(g.teamId, "team-" + g.teamId)} className="min-w-0 flex-1 hover:opacity-80 transition-opacity">
            <p className="text-sm font-medium">{g.count} new {g.count === 1 ? "message" : "messages"} in {g.teamName}</p>
            <p className="text-xs text-foreground-dim truncate">{g.senderName}: "{g.preview.length > 60 ? g.preview.slice(0, 60) + "…" : g.preview}"</p>
          </Link>
          <button onClick={() => dismissTeam(g.teamId, "team-" + g.teamId)} className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none" aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  );
}
