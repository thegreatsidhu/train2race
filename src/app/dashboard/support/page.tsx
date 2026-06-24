"use client";
import { useState, useEffect } from "react";

const CATEGORIES = ["general", "bug", "feature", "account", "billing", "other"];
const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-900/30 text-yellow-300 border-yellow-700/40",
  in_progress: "bg-blue-900/30 text-blue-300 border-blue-700/40",
  resolved: "bg-green-900/30 text-green-300 border-green-700/40",
  closed: "bg-surface text-foreground-dim border-border",
};

export default function SupportPage() {
  const [form, setForm] = useState({ subject: "", description: "", category: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitOk, setSubmitOk] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/support")
      .then(r => r.json())
      .then(d => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function submit() {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    setSubmitMsg("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (res.ok) {
      const d = await res.json();
      setSubmitOk(true);
      setSubmitMsg("Ticket submitted — we'll get back to you soon.");
      setTickets(prev => [d.ticket, ...prev]);
      setForm({ subject: "", description: "", category: "general" });
    } else {
      setSubmitOk(false);
      setSubmitMsg("Failed to submit. Please try again.");
    }
  }

  return (
    <div className="max-w-2xl px-4 md:px-8 py-6 md:py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Help & Support</h1>
        <p className="text-sm text-foreground-dim mt-1">Submit a ticket — we review and respond to every one.</p>
        <p className="text-sm text-foreground-dim mt-0.5">You can also email us at <a href="mailto:support@train2race.com" className="text-signal hover:underline">support@train2race.com</a></p>
      </header>

      {/* Submit form */}
      <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Category</label>
          <select
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map(c => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Subject</label>
          <input
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
            placeholder="Brief summary of the issue"
            value={form.subject}
            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Description</label>
          <textarea
            className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm"
            rows={5}
            placeholder="Describe what happened, what you expected, and any steps to reproduce…"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>

        {submitMsg && (
          <p className={"text-sm " + (submitOk ? "text-signal" : "text-red-400")}>{submitMsg}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting || !form.subject.trim() || !form.description.trim()}
          className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit ticket"}
        </button>
      </div>

      {/* Ticket history */}
      <div>
        <h2 className="text-sm font-medium text-foreground-dim mb-3">Your tickets</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-16 rounded-xl bg-surface border border-border animate-pulse" />)}
          </div>
        ) : tickets.length === 0 ? (
          <p className="text-sm text-foreground-dim">No tickets yet.</p>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => (
              <div key={t.id} className="rounded-xl border border-border bg-surface px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-foreground-dim capitalize mt-0.5">
                      {t.category} · {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
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
  );
}
