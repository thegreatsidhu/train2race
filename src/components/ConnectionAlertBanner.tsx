"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { isMedianApp, getHealthData, extractHealthValue } from "@/lib/median";

async function hasHealthData(): Promise<boolean> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 999);
  const result = await getHealthData(start.toISOString(), end.toISOString());
  const d = result?.data;
  return !!(d && Object.values(d).some((point) => extractHealthValue(point) !== null));
}

// Proactively flags a broken Apple Health / Google Health Connect link, since users who
// already connected once otherwise only find out it stopped syncing by noticing stale data.
export function ConnectionAlertBanner() {
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isMedianApp()) return;
    (async () => {
      try {
        const statusRes = await fetch("/api/health/status");
        const status = await statusRes.json().catch(() => ({}));
        if (!status.everConnected) return;
        const connected = await hasHealthData();
        if (!connected) setShow(true);
      } catch {}
    })();
  }, []);

  if (!show || dismissed) return null;

  return (
    <div className="rounded-2xl border border-alert/40 bg-alert/10 p-4 mb-4 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-alert">Your health connection needs attention</p>
        <p className="text-xs text-foreground-dim mt-1">Apple Health / Google Health Connect stopped syncing. Reconnect to keep your steps and recovery data up to date.</p>
        <Link href="/dashboard/connections" className="inline-block mt-2 text-xs text-signal hover:underline">
          Fix connection →
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="text-foreground-dim hover:text-foreground text-lg leading-none shrink-0">
        ×
      </button>
    </div>
  );
}
