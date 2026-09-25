"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { isMedianApp, getHealthData, extractHealthValue } from "@/lib/median";

const SNOOZE_KEY = "connection-alert-snoozed-until";
const SNOOZE_DAYS = 7;

async function hasHealthData(): Promise<boolean> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const result = await getHealthData(start.toISOString(), end.toISOString());
  const d = result?.data;
  return !!(d && Object.values(d).some((point) => extractHealthValue(point) !== null));
}

type Reason = "broken" | "never_connected" | null;

// Proactively flags a missing or broken Apple Health / Google Health Connect link — either a
// connection that was working and stopped, or one that was never actually set up (past a grace
// period), since users otherwise only find out by noticing stale data much later.
export function ConnectionAlertBanner() {
  const [reason, setReason] = useState<Reason>(null);
  const [platform, setPlatform] = useState<"ios" | "android" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMedianApp()) return;

    const snoozedUntil = Number(localStorage.getItem(SNOOZE_KEY) || "0");
    if (Date.now() < snoozedUntil) return;

    const ua = navigator.userAgent;
    setPlatform(/iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : null);

    (async () => {
      try {
        const statusRes = await fetch("/api/health/status");
        const status = await statusRes.json().catch(() => ({}));
        if (!status.everConnected && !status.pastGracePeriod) return;
        const connected = await hasHealthData();
        if (!connected) setReason(status.everConnected ? "broken" : "never_connected");
      } catch {}
    })();
  }, []);

  function dismiss() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000));
    setDismissed(true);
  }

  if (!reason || dismissed) return null;

  return (
    <div className="rounded-2xl border border-alert/40 bg-alert/10 p-4 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-alert">
            {reason === "broken" ? "Your health connection needs attention" : "Set up your health connection"}
          </p>
          <p className="text-xs text-foreground-dim mt-1">
            {reason === "broken"
              ? "Apple Health / Google Health Connect stopped syncing. Reconnect to keep your steps and recovery data up to date."
              : "We haven't seen any Apple Health / Google Health Connect data yet. Connect it to auto-sync your steps and workouts."}
          </p>
          <div className="mt-2 flex items-center gap-3">
            <Link href="/dashboard/connections" className="text-xs text-signal hover:underline">Fix connection →</Link>
            {platform === "android" && (
              <button onClick={() => setExpanded((e) => !e)} className="text-xs text-signal hover:underline">
                {expanded ? "Hide tip" : "Using a Samsung phone?"}
              </button>
            )}
          </div>
          {expanded && (
            <p className="text-xs text-foreground-dim mt-2 leading-relaxed">
              Samsung Health doesn't send data to Health Connect automatically — open Samsung Health → Settings (gear icon) → Data permissions and sync → Health Connect, and turn syncing on. Then come back and hit Connect above.
            </p>
          )}
        </div>
        <button onClick={dismiss} className="text-foreground-dim hover:text-foreground text-lg leading-none shrink-0">
          ×
        </button>
      </div>
    </div>
  );
}
