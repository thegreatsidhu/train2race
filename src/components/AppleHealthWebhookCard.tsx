"use client";
import { useState, useEffect } from "react";

export function AppleHealthWebhookCard() {
  const [loaded, setLoaded] = useState(false);
  const [connected, setConnected] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);

  async function load() {
    const res = await fetch("/api/connectors/apple-health/setup");
    const d = await res.json().catch(() => ({}));
    setConnected(!!d.connected);
    setWebhookUrl(d.webhookUrl || null);
    setLastSyncedAt(d.lastSyncedAt || null);
    setLastError(d.lastError || null);
    setLoaded(true);
  }

  useEffect(() => { load(); }, []);

  async function handleSetup() {
    setSettingUp(true);
    try {
      const res = await fetch("/api/connectors/apple-health/setup", { method: "POST" });
      const d = await res.json();
      setWebhookUrl(d.webhookUrl);
      setConnected(true);
      setExpanded(true);
      setLastError(null);
    } finally {
      setSettingUp(false);
    }
  }

  async function handleDisconnect() {
    await fetch("/api/connectors/apple-health/setup", { method: "DELETE" });
    setConnected(false);
    setWebhookUrl(null);
    setConfirmingDisconnect(false);
    setExpanded(false);
  }

  function copyUrl() {
    if (!webhookUrl) return;
    navigator.clipboard?.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!loaded) return <div className="rounded-2xl border border-border bg-surface p-5 h-[92px] animate-pulse" />;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">Health Auto Export (webhook)</h3>
            {connected && <span className="text-xs px-2 py-0.5 rounded-full bg-signal/15 text-signal">Connected</span>}
          </div>
          <p className="text-sm text-foreground-dim">
            {connected
              ? lastSyncedAt
                ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}`
                : "Set up — waiting for your first export."
              : "For richer history than the app's live sync: use a REST-automation export app (like Health Auto Export on iOS) to push data on a schedule."}
          </p>
          {lastError && <p className="text-xs text-alert mt-1">Last sync error: {lastError}</p>}
        </div>
        {!connected && (
          <button onClick={handleSetup} disabled={settingUp} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60 shrink-0">
            {settingUp ? "Setting up…" : "Set up"}
          </button>
        )}
        {connected && (
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setExpanded((e) => !e)} className="text-xs text-signal hover:underline">
              {expanded ? "Hide URL" : "Show URL"}
            </button>
            <button onClick={() => setConfirmingDisconnect(true)} className="text-xs text-foreground-dim hover:text-alert transition-colors">
              Disconnect
            </button>
          </div>
        )}
      </div>
      {connected && expanded && webhookUrl && (
        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-xs text-foreground-dim">
            Paste this URL into your export app's REST API / webhook automation (e.g. Health Auto Export → Automations → REST API):
          </p>
          <div className="flex items-center gap-2">
            <input readOnly value={webhookUrl} onFocus={(e) => e.target.select()}
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono outline-none" />
            <button onClick={copyUrl} className="text-xs px-3 py-2 rounded-xl border border-border hover:bg-surface-raised shrink-0">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <p className="text-xs text-foreground-dim/70">
            This URL is a secret — anyone with it can post data to your account.{" "}
            <button onClick={handleSetup} disabled={settingUp} className="text-signal hover:underline disabled:opacity-60">Regenerate it</button>{" "}
            if it's ever shared, which invalidates the old one.
          </p>
        </div>
      )}
      {confirmingDisconnect && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm mb-3">Disconnect Health Auto Export? Your export app will no longer be able to send data — its saved URL will stop working.</p>
          <div className="flex gap-2">
            <button onClick={handleDisconnect} className="text-xs px-3 py-1.5 rounded-full bg-alert text-background font-medium">Disconnect</button>
            <button onClick={() => setConfirmingDisconnect(false)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
