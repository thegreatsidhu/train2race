"use client";

import { useEffect, useState } from "react";

interface InviteCode {
  id: string;
  code: string;
  note: string | null;
  usedBy: string | null;
  usedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadCodes() {
    const res = await fetch("/api/invites");
    if (!res.ok) {
      setError("Not authorized. Make sure ADMIN_EMAIL is set and you're logged in with that account.");
      return;
    }
    const data = await res.json();
    setCodes(data.codes);
  }

  useEffect(() => { loadCodes(); }, []);

  async function handleGenerate() {
    setLoading(true);
    await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: note || null }),
    });
    setNote("");
    setLoading(false);
    loadCodes();
  }

  async function handleDelete(id: string) {
    if (!confirm("Revoke this invite code?")) return;
    await fetch("/api/invites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadCodes();
  }

  function handleCopy(code: string) {
    const signupUrl = `${window.location.origin}/signup?invite=${code}`;
    navigator.clipboard.writeText(signupUrl);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  }

  const used = codes.filter((c) => c.usedBy).length;
  const available = codes.filter((c) => !c.usedBy).length;

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <header className="mb-8">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-2">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Invite codes</h1>
        <p className="text-foreground-dim text-sm mt-2">
          Generate codes to share with testers. Each code is single-use.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-alert/40 bg-alert/10 text-alert text-sm px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs text-foreground-dim mb-1">Total codes</p>
          <p className="font-data text-2xl">{codes.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs text-foreground-dim mb-1">Used</p>
          <p className="font-data text-2xl text-signal">{used}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3">
          <p className="text-xs text-foreground-dim mb-1">Available</p>
          <p className="font-data text-2xl">{available}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-5 mb-8">
        <h2 className="text-sm font-medium mb-3">Generate a new code</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Label (optional — e.g. 'for Sarah')"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-surface-raised border border-border focus:border-signal outline-none text-sm"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-5 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors disabled:opacity-60"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {codes.length === 0 && (
          <p className="text-sm text-foreground-dim">No invite codes yet — generate one above.</p>
        )}
        {codes.map((c) => (
          <div key={c.id}
            className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${
              c.usedBy ? "border-border opacity-60" : "border-border bg-surface"
            }`}>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className="font-data text-lg tracking-widest">{c.code}</span>
                {c.usedBy && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-signal/15 text-signal">Used</span>
                )}
              </div>
              <p className="text-xs text-foreground-dim">
                {c.note && <span className="mr-3">{c.note}</span>}
                {c.usedAt ? `Used ${new Date(c.usedAt).toLocaleDateString()}`
                  : c.expiresAt ? `Expires ${new Date(c.expiresAt).toLocaleDateString()}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!c.usedBy && (
                <button
                  onClick={() => handleCopy(c.code)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs hover:border-foreground-dim transition-colors"
                >
                  {copied === c.code ? "Copied!" : "Copy link"}
                </button>
              )}
              <button
                onClick={() => handleDelete(c.id)}
                className="text-xs text-foreground-dim hover:text-alert transition-colors"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}