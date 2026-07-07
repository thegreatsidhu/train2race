"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const LS_KEY = "hf_dismissed_at";

interface HFEvent {
  id: string;
  fromUserId: string;
  fromName: string;
  activityId: string;
  activityTitle: string;
  createdAt: string;
  preview?: string; // comments only
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ago`;
  if (h >= 1) return `${h}h ago`;
  if (m >= 1) return `${m}m ago`;
  return "just now";
}

function dedupeByUser<T extends { fromUserId: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.fromUserId)) return false;
    seen.add(item.fromUserId);
    return true;
  });
}

function buildMessage(hfs: HFEvent[], cmts: HFEvent[]): string {
  const uniqueHF = dedupeByUser(hfs);
  const uniqueCmt = dedupeByUser(cmts);

  // Single high five, no comments
  if (uniqueHF.length === 1 && uniqueCmt.length === 0) {
    return `🙌 ${uniqueHF[0].fromName} high fived your ${uniqueHF[0].activityTitle} · ${timeAgo(uniqueHF[0].createdAt)}`;
  }

  // Single comment, no high fives
  if (uniqueHF.length === 0 && uniqueCmt.length === 1) {
    const c = uniqueCmt[0];
    return `💬 ${c.fromName} commented on your ${c.activityTitle} · ${timeAgo(c.createdAt)}${c.preview ? ` → "${c.preview}"` : ""}`;
  }

  // Exactly one of each
  if (uniqueHF.length === 1 && uniqueCmt.length === 1) {
    return `🙌 ${uniqueHF[0].fromName} high fived your ${uniqueHF[0].activityTitle} · 💬 ${uniqueCmt[0].fromName} commented on your ${uniqueCmt[0].activityTitle}`;
  }

  // Multiple — summary
  const parts: string[] = [];
  if (uniqueHF.length > 0) parts.push(`${uniqueHF.length} high five${uniqueHF.length > 1 ? "s" : ""}`);
  if (uniqueCmt.length > 0) parts.push(`${uniqueCmt.length} comment${uniqueCmt.length > 1 ? "s" : ""}`);
  return `You have ${parts.join(" and ")} on your workouts today 🔥`;
}

export function HighFiveStrip() {
  const [highFives, setHighFives] = useState<HFEvent[]>([]);
  const [comments, setComments] = useState<HFEvent[]>([]);
  const [linkTeamId, setLinkTeamId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/me/high-fives-today")
      .then(r => r.json())
      .then(d => {
        let dismissedAt = 0;
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) dismissedAt = JSON.parse(raw).dismissedAt ?? 0;
        } catch {}

        const filterFresh = (items: HFEvent[]) =>
          dismissedAt > 0
            ? items.filter(e => new Date(e.createdAt).getTime() > dismissedAt)
            : items;

        setHighFives(filterFresh(d.highFives || []));
        setComments(filterFresh(d.comments || []));
        setLinkTeamId(d.linkTeamId || null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ dismissedAt: Date.now() }));
    } catch {}
    setDismissed(true);
  }

  if (!loaded || dismissed || (highFives.length === 0 && comments.length === 0)) return null;

  const message = buildMessage(highFives, comments);
  const href = linkTeamId ? `/dashboard/teams/${linkTeamId}` : "/dashboard/teams";

  return (
    <div className="relative">
      <Link
        href={href}
        className="block rounded-2xl border border-teal-500/40 bg-teal-500/10 px-4 py-3 hover:bg-teal-500/15 transition-colors"
      >
        <p className="text-sm text-teal-200 leading-snug pr-5">{message}</p>
      </Link>
      <button
        onClick={dismiss}
        className="absolute top-2.5 right-3 text-teal-400/50 hover:text-teal-300 text-xs leading-none transition-colors"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
