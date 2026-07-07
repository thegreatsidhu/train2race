"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const LS_KEY = "hf_dismissed_at";

interface HighFive {
  id: string;
  fromUserId: string;
  fromName: string;
  activityId: string;
  activityTitle: string;
  createdAt: string;
}

function buildMessage(highFives: HighFive[]): string {
  const seen = new Set<string>();
  const giverNames: string[] = [];
  let singleActivityTitle = "";

  for (const hf of highFives) {
    if (!seen.has(hf.fromUserId)) {
      seen.add(hf.fromUserId);
      giverNames.push(hf.fromName);
      if (giverNames.length === 1) singleActivityTitle = hf.activityTitle;
    }
  }

  if (giverNames.length === 1) {
    return `🙌 ${giverNames[0]} high fived your ${singleActivityTitle}`;
  }

  const shown = giverNames.slice(0, 2);
  const others = giverNames.length - shown.length;
  const namesPart =
    others === 0
      ? `${shown[0]} and ${shown[1]}`
      : `${shown.join(", ")} and ${others} other${others > 1 ? "s" : ""}`;
  return `🙌 ${namesPart} high fived your workouts today`;
}

export function HighFiveStrip() {
  const [visibleHighFives, setVisibleHighFives] = useState<HighFive[]>([]);
  const [linkTeamId, setLinkTeamId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/me/high-fives-today")
      .then(r => r.json())
      .then(d => {
        const all: HighFive[] = d.highFives || [];

        // Read persisted dismissal timestamp
        let dismissedAt = 0;
        try {
          const raw = localStorage.getItem(LS_KEY);
          if (raw) dismissedAt = JSON.parse(raw).dismissedAt ?? 0;
        } catch {}

        // Only show high fives received AFTER the last dismissal
        const fresh = dismissedAt > 0
          ? all.filter(hf => new Date(hf.createdAt).getTime() > dismissedAt)
          : all;

        setVisibleHighFives(fresh);
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

  if (!loaded || dismissed || visibleHighFives.length === 0) return null;

  const message = buildMessage(visibleHighFives);
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
