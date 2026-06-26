"use client";
import { useState } from "react";

export default function FeatureRequestPage() {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: subject.trim(), description: description.trim(), category: "feature" }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      setError("Failed to submit. Please try again.");
    }
  }

  return (
    <div className="max-w-2xl px-4 md:px-8 py-6 md:py-10 space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Request a Feature</h1>
        <p className="text-sm text-foreground-dim mt-1">Have an idea that would make Train2Race better? Tell us about it — we read every suggestion.</p>
      </header>

      {done ? (
        <div className="rounded-2xl border border-signal/30 bg-signal/5 p-6 text-center">
          <p className="font-semibold text-signal mb-1">Request submitted!</p>
          <p className="text-sm text-foreground-dim">Thanks for sharing your idea. We'll review it and reach out if we have questions.</p>
          <button
            onClick={() => { setDone(false); setSubject(""); setDescription(""); }}
            className="mt-4 text-sm text-signal hover:underline"
          >
            Submit another request
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Feature title</label>
              <input
                required
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:border-signal outline-none"
                placeholder="e.g. Dark mode calendar, Strava sync, pace zones…"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-foreground-dim uppercase tracking-wide mb-1 block">Describe the feature</label>
              <textarea
                required
                className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:border-signal outline-none resize-none"
                rows={6}
                placeholder="What would it do? Who would it help? How would you use it?"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !subject.trim() || !description.trim()}
              className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
