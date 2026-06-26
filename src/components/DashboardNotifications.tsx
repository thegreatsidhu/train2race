"use client";
import { useState } from "react";
import Link from "next/link";

interface NotifGroup {
  teamId: string;
  teamName: string;
  count: number;
  senderName: string;
  preview: string;
}

interface AdminDm {
  id: string;
  content: string;
  createdAt: string;
}

export function DashboardNotifications({
  teamMessageGroups,
  dmGroups,
  adminDms = [],
}: {
  teamMessageGroups: NotifGroup[];
  dmGroups: NotifGroup[];
  adminDms?: AdminDm[];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  function dismissTeam(teamId: string, key: string) {
    setDismissed(prev => new Set(prev).add(key));
    fetch(`/api/teams/${teamId}/messages`, { method: "GET" }).catch(() => {});
  }

  function dismissAdminDm(id: string) {
    setDismissed(prev => new Set(prev).add("adm-" + id));
    fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }).catch(() => {});
  }

  const visibleDms = dmGroups.filter(g => !dismissed.has("dm-" + g.teamId));
  const visibleTeam = teamMessageGroups.filter(g => !dismissed.has("team-" + g.teamId));
  const visibleAdmin = adminDms.filter(m => !dismissed.has("adm-" + m.id));

  if (visibleDms.length === 0 && visibleTeam.length === 0 && visibleAdmin.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {visibleAdmin.map(m => (
        <div key={"adm-" + m.id} className="flex items-start gap-3 rounded-2xl border border-blue-700/40 bg-blue-900/20 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">🔔</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-400 font-medium mb-0.5">Message from Train2Race</p>
            <p className="text-sm">{m.content}</p>
          </div>
          <button
            onClick={() => dismissAdminDm(m.id)}
            className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
      {visibleDms.map(g => (
        <div key={"dm-" + g.teamId} className="flex items-start gap-3 rounded-2xl border border-signal/50 bg-signal/10 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">✉️</span>
          <Link
            href={`/dashboard/teams/${g.teamId}?tab=chat`}
            onClick={() => dismissTeam(g.teamId, "dm-" + g.teamId)}
            className="min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <p className="text-sm font-medium">{g.count} new private {g.count === 1 ? "message" : "messages"} from {g.senderName}</p>
            <p className="text-xs text-foreground-dim truncate">{g.teamName} · "{g.preview.length > 60 ? g.preview.slice(0, 60) + "…" : g.preview}"</p>
          </Link>
          <button
            onClick={() => dismissTeam(g.teamId, "dm-" + g.teamId)}
            className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
      {visibleTeam.map(g => (
        <div key={"team-" + g.teamId} className="flex items-start gap-3 rounded-2xl border border-signal/30 bg-signal/5 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">💬</span>
          <Link
            href={`/dashboard/teams/${g.teamId}?tab=chat`}
            onClick={() => dismissTeam(g.teamId, "team-" + g.teamId)}
            className="min-w-0 flex-1 hover:opacity-80 transition-opacity"
          >
            <p className="text-sm font-medium">{g.count} new {g.count === 1 ? "message" : "messages"} in {g.teamName}</p>
            <p className="text-xs text-foreground-dim truncate">{g.senderName}: "{g.preview.length > 60 ? g.preview.slice(0, 60) + "…" : g.preview}"</p>
          </Link>
          <button
            onClick={() => dismissTeam(g.teamId, "team-" + g.teamId)}
            className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-foreground transition-colors text-sm leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
