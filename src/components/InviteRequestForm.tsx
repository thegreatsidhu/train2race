"use client";
import { useState } from "react";

export function InviteRequestForm({ label = "Request an invite code" }: { label?: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/invite-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json();
      setError(d.error || "Something went wrong");
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-foreground-dim hover:text-foreground transition-colors underline-offset-2 hover:underline"
      >
        {label}
      </button>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-signal/30 bg-signal/5 px-5 py-4 text-sm">
        <p className="font-medium text-signal mb-1">Request sent!</p>
        <p className="text-foreground-dim">We'll reach out to {email} with your invite code.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <p className="font-medium text-sm">Request an invite code</p>
        <button onClick={() => setOpen(false)} className="text-foreground-dim hover:text-foreground text-xs">Cancel</button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
        />
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm"
        />
        <textarea
          placeholder="Why do you want to join? (optional)"
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-background border border-border focus:border-signal outline-none text-sm resize-none"
        />
        {error && <p className="text-alert text-xs">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-2.5 rounded-xl bg-signal text-background font-medium text-sm hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {submitting ? "Sending…" : "Send request"}
        </button>
      </form>
    </div>
  );
}
