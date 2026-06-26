"use client";
import { useState, useEffect } from "react";

interface Ann { id: string; title?: string | null; content: string }

export function DashboardAnnouncement({ announcements }: { announcements: Ann[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("t2r-dismissed-ann") || "[]");
      setDismissed(new Set(saved));
    } catch {}
  }, []);

  function dismiss(id: string) {
    setDismissed(prev => {
      const next = new Set(prev).add(id);
      try { localStorage.setItem("t2r-dismissed-ann", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="mb-6 space-y-2">
      {visible.map(a => (
        <div key={a.id} className="flex items-start gap-3 rounded-2xl border border-yellow-700/40 bg-yellow-900/20 px-4 py-3">
          <span className="text-base shrink-0 mt-0.5">📢</span>
          <div className="flex-1 min-w-0">
            {a.title && <p className="text-sm font-medium mb-0.5">{a.title}</p>}
            <p className="text-sm text-foreground-dim">{a.content}</p>
          </div>
          <button
            onClick={() => dismiss(a.id)}
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
