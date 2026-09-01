"use client";
import { useState, useEffect } from "react";
import { isMedianApp } from "@/lib/median";

export function MedianHealthCard() {
  const [inMedianApp, setInMedianApp] = useState<boolean | null>(null);

  useEffect(() => {
    setInMedianApp(isMedianApp());
  }, []);

  if (inMedianApp === null) {
    return <div className="rounded-2xl border border-border bg-surface p-5 h-[92px] animate-pulse" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium">Apple Health / Google Health Connect</h3>
          {inMedianApp && <span className="text-xs px-2 py-0.5 rounded-full bg-signal/15 text-signal">Connected</span>}
        </div>
        <p className="text-sm text-foreground-dim">
          {inMedianApp
            ? "Syncs steps, distance, and duration straight from your phone's Health app when you log a workout."
            : "Available in the mobile app."}
        </p>
        {!inMedianApp && (
          <p className="text-xs text-foreground-dim mt-1">
            Install the Train2Race app on your phone to sync directly from Apple Health or Google Health Connect.
          </p>
        )}
      </div>
    </div>
  );
}
