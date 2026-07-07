"use client";
import { useState, useEffect } from "react";

const CATEGORIES = ["general", "bug", "feature", "account", "billing", "other"];
const STATUS_COLORS: Record<string, string> = {
  open: "bg-yellow-900/30 text-yellow-300 border-yellow-700/40",
  in_progress: "bg-blue-900/30 text-blue-300 border-blue-700/40",
  resolved: "bg-green-900/30 text-green-300 border-green-700/40",
  closed: "bg-surface text-foreground-dim border-border",
};
const ALLOWED_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/gif"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function SupportPage() {
  const [form, setForm] = useState({ subject: "", description: "", category: "general" });
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitOk, setSubmitOk] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    fetch("/api/support")
      .then(r => r.json())
      .then(d => { setTickets(d.tickets || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError("");
    const incoming = Array.from(e.target.files || []);
    e.target.value = "";
    if (images.length + incoming.length > 3) {
      setImageError("Maximum 3 screenshots allowed.");
      return;
    }
    for (const f of incoming) {
      if (!ALLOWED_TYPES.has(f.type)) {
        setImageError("Only JPG, PNG, or GIF files are allowed.");
        return;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setImageError("Each image must be under 5 MB.");
        return;
      }
    }
    const combined = [...images, ...incoming].slice(0, 3);
    setImages(combined);
    setImagePreviews(combined.map(f => URL.createObjectURL(f)));
  }

  function removeImage(index: number) {
    const newFiles = images.filter((_, i) => i !== index);
    setImages(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  }

  async function submit() {
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);
    setSubmitMsg("");

    const imageUrls: string[] = [];
    for (const file of images) {
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/support/upload", { method: "POST", body: fd });
        if (res.ok) {
          const d = await res.json();
          imageUrls.push(d.url);
        }
      } catch {}
    }

    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, ticketImages: imageUrls }),
    });
    setSubmitting(false);
    if (res.ok) {
      const d = await res.json();
      setSubmitOk(true);
      setSubmitMsg("Ticket submitted — we'll get back to you soon.");
      setTickets(prev => [d.ticket, ...prev]);
      setForm({ subject: "", description: "", category: "general" });
      setImages([]);
      setImagePreviews([]);
      setImageError("");
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

        {/* Screenshot upload */}
        <div>
          <label className="text-xs text-foreground-dim uppercase tracking-wide mb-2 block">
            Screenshots{" "}
            <span className="normal-case text-foreground-dim/60">
              (optional · JPG / PNG / GIF · max 5 MB each · up to 3)
            </span>
          </label>
          {imagePreviews.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {imagePreviews.map((url, i) => (
                <div key={i} className="relative group">
                  <img
                    src={url}
                    alt={`Screenshot ${i + 1}`}
                    className="h-20 w-auto rounded-lg border border-border object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                    aria-label="Remove screenshot"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < 3 && (
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-sm text-signal hover:underline">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif"
                multiple
                className="hidden"
                onChange={handleImages}
              />
              + Add screenshot
            </label>
          )}
          {imageError && <p className="text-xs text-red-400 mt-1">{imageError}</p>}
        </div>

        {submitMsg && (
          <p className={"text-sm " + (submitOk ? "text-signal" : "text-red-400")}>{submitMsg}</p>
        )}

        <button
          onClick={submit}
          disabled={submitting || !form.subject.trim() || !form.description.trim()}
          className="px-5 py-2.5 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-50"
        >
          {submitting ? (images.length > 0 ? "Uploading…" : "Submitting…") : "Submit ticket"}
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
                    {t.ticketImages && t.ticketImages.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {t.ticketImages.map((url: string, i: number) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                            <img src={url} alt={`Screenshot ${i + 1}`} className="h-12 w-auto rounded border border-border object-cover hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    )}
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
