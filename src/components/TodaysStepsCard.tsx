"use client";
import { useState, useEffect } from "react";
import { isMedianApp, getHealthData, extractHealthValue } from "@/lib/median";

export function TodaysStepsCard({ initialSteps = null, initialSourceLabel = null }: { initialSteps?: number | null; initialSourceLabel?: string | null }) {
  const [steps, setSteps] = useState<number | null>(initialSteps);
  const [sourceLabel, setSourceLabel] = useState<string | null>(initialSourceLabel);
  const [checkingBridge, setCheckingBridge] = useState(false);

  useEffect(() => {
    if (!isMedianApp()) return;
    setCheckingBridge(true);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    getHealthData(start.toISOString(), end.toISOString())
      .then(result => {
        const value = extractHealthValue(result?.data?.steps);
        if (value !== null) {
          setSteps(Math.round(value));
          setSourceLabel("your phone's Health app");
        }
      })
      .finally(() => setCheckingBridge(false));
  }, []);

  if (steps == null) {
    if (checkingBridge) return <div className="rounded-2xl border border-border bg-surface px-4 py-3 h-[60px] animate-pulse mb-6" />;
    return null;
  }

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 flex items-center gap-3 mb-6">
      <span className="text-2xl">👣</span>
      <div>
        <p className="font-data text-xl leading-none">{steps.toLocaleString()}</p>
        <p className="text-xs text-foreground-dim mt-1">Steps today{sourceLabel ? ` · ${sourceLabel}` : ""}</p>
      </div>
    </div>
  );
}
