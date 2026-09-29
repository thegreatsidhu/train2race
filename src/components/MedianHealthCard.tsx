"use client";
import { useState, useEffect, useCallback } from "react";
import { isMedianApp, requestHealthPermissions, getHealthData, openAppSettings, extractHealthValue, invalidateHealthSyncCache } from "@/lib/median";

type Status = "checking" | "connected" | "not-connected" | "disconnected";

async function hasHealthData(): Promise<boolean> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const result = await getHealthData(start.toISOString(), end.toISOString());
  const d = result?.data;
  return !!(d && Object.values(d).some((point) => extractHealthValue(point) !== null));
}

export function MedianHealthCard() {
  const [inMedianApp, setInMedianApp] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>("checking");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [confirmingDisconnect, setConfirmingDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    setStatus("checking");
    const statusRes = await fetch("/api/health/status").then((r) => r.json()).catch(() => ({}));
    if (statusRes?.healthSyncDisabled) { setStatus("disconnected"); return false; }
    const found = await hasHealthData().catch((e) => { console.error("[health] status check failed", e); return false; });
    setStatus(found ? "connected" : "not-connected");
    return found;
  }, []);

  useEffect(() => {
    const native = isMedianApp();
    setInMedianApp(native);
    if (native) checkStatus();
  }, [checkStatus]);

  async function handleConnect() {
    setConnecting(true);
    setConnectError("");
    try {
      const permResult = await requestHealthPermissions();
      console.log("[health] requestPermissions result", permResult);
      const found = await checkStatus();
      if (!found) {
        setConnectError("No health data found. Make sure Health Connect is installed and has a data source (like Google Fit) connected.");
      }
    } catch (e) {
      console.error("[health] connect failed", e);
      setConnectError("Something went wrong connecting. Try again.");
    }
    setConnecting(false);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/health/disconnect", { method: "POST" });
      invalidateHealthSyncCache();
      setStatus("disconnected");
      setConfirmingDisconnect(false);
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleReconnect() {
    await fetch("/api/health/disconnect", { method: "DELETE" });
    invalidateHealthSyncCache();
    setConnectError("");
    await handleConnect();
  }

  if (inMedianApp === null) {
    return <div className="rounded-2xl border border-border bg-surface p-5 h-[92px] animate-pulse" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium">Apple Health / Google Health Connect</h3>
            {inMedianApp && status === "connected" && <span className="text-xs px-2 py-0.5 rounded-full bg-signal/15 text-signal">Connected</span>}
            {inMedianApp && status === "not-connected" && <span className="text-xs px-2 py-0.5 rounded-full bg-border text-foreground-dim">Not connected</span>}
            {inMedianApp && status === "disconnected" && <span className="text-xs px-2 py-0.5 rounded-full bg-border text-foreground-dim">Disconnected</span>}
          </div>
          <p className="text-sm text-foreground-dim">
            {!inMedianApp
              ? "Available in the mobile app."
              : status === "checking"
              ? "Checking access…"
              : status === "connected"
              ? "Syncing steps, distance, and duration from your phone's Health app."
              : status === "disconnected"
              ? "Train2Race has stopped reading your Health app data. Your phone's OS permission is unchanged — reconnect anytime."
              : "Grant access to sync steps, distance, and duration from your phone's Health app."}
          </p>
          {!inMedianApp && (
            <p className="text-xs text-foreground-dim mt-1">
              Install the Train2Race app on your phone to sync directly from Apple Health or Google Health Connect.
            </p>
          )}
          {connectError && <p className="text-xs text-alert mt-1">{connectError}</p>}
        </div>
        {inMedianApp && (connecting || status === "not-connected") && (
          <button onClick={handleConnect} disabled={connecting} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium disabled:opacity-60 shrink-0">
            {connecting ? "Connecting..." : "Connect"}
          </button>
        )}
        {inMedianApp && !connecting && status === "disconnected" && (
          <button onClick={handleReconnect} className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium shrink-0">
            Reconnect
          </button>
        )}
        {inMedianApp && !connecting && status === "connected" && (
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={openAppSettings} className="text-xs text-foreground-dim hover:text-signal transition-colors">
              Manage access
            </button>
            <button onClick={() => setConfirmingDisconnect(true)} className="text-xs text-foreground-dim hover:text-alert transition-colors">
              Disconnect
            </button>
          </div>
        )}
      </div>
      {confirmingDisconnect && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm mb-3">
            Disconnect Apple Health / Google Health Connect? Train2Race will stop syncing your steps, workouts, and recovery data. This doesn't revoke the permission on your phone — do that from your phone's Health app settings if you want to fully remove access.
          </p>
          <div className="flex gap-2">
            <button onClick={handleDisconnect} disabled={disconnecting} className="text-xs px-3 py-1.5 rounded-full bg-alert text-background font-medium disabled:opacity-60">
              {disconnecting ? "Disconnecting…" : "Disconnect"}
            </button>
            <button onClick={() => setConfirmingDisconnect(false)} className="text-xs px-3 py-1.5 rounded-full border border-border">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
