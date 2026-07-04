"use client";
import { useState, useEffect } from "react";

export function DailyAIMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch("/api/me/daily-message")
      .then(r => r.json())
      .then(d => { if (d.message) setMessage(d.message); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/me/daily-message", { method: "POST" });
      const d = await res.json();
      if (d.message) setMessage(d.message);
    } catch {}
    setRefreshing(false);
  }

  if (loading || !message) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface px-5 py-4 flex items-start gap-3">
      <span className="text-xl shrink-0 mt-0.5">✨</span>
      <p className="text-sm text-foreground-dim leading-relaxed flex-1 italic">{message}</p>
      <button
        onClick={refresh}
        disabled={refreshing}
        title="Get a new message"
        className="shrink-0 self-start mt-0.5 text-foreground-dim hover:text-signal transition-colors disabled:opacity-40 text-xs"
        aria-label="Refresh daily message"
      >
        {refreshing ? "…" : "↻"}
      </button>
    </div>
  );
}
