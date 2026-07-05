"use client";
import { useState, useEffect } from "react";

export function DailyAIMessage() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/daily-message")
      .then(r => r.json())
      .then(d => { if (d.message) setMessage(d.message); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !message) return null;

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface px-5 py-4 flex items-start gap-3">
      <span className="text-xl shrink-0 mt-0.5">✨</span>
      <p className="text-sm text-foreground-dim leading-relaxed flex-1 italic">{message}</p>
    </div>
  );
}
