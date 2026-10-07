"use client";
import { useState, useEffect } from "react";
import { isMedianApp, computeStrainEstimate, type StrainEstimate } from "@/lib/median";

// "How hard today has been" estimate computed on-device from the health bridge's active-energy
// and exercise-time history.
export function StrainCard() {
  const [estimate, setEstimate] = useState<StrainEstimate | null>(null);

  useEffect(() => {
    if (!isMedianApp()) return;
    computeStrainEstimate().then((result) => { if (result) setEstimate(result); });
  }, []);

  if (!estimate) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 flex items-center gap-3 mb-6">
      <span className="text-2xl">⚡</span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{estimate.label} ({estimate.relativePct}% of typical)</p>
        <p className="text-xs text-foreground-dim">Estimated from your {estimate.sourcesUsed.join(", ")}</p>
      </div>
    </div>
  );
}
