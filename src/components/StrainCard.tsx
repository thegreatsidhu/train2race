"use client";
import { useState, useEffect } from "react";
import { isMedianApp, computeStrainEstimate, type StrainEstimate } from "@/lib/median";

type RealScore = { value: number; source: "WHOOP" | "GARMIN" };

export function StrainCard({ initialScore = null, initialSource = null }: { initialScore?: number | null; initialSource?: string | null }) {
  const real: RealScore | null = initialScore != null && (initialSource === "WHOOP" || initialSource === "GARMIN")
    ? { value: initialScore, source: initialSource }
    : null;
  const [estimate, setEstimate] = useState<StrainEstimate | null>(null);

  useEffect(() => {
    if (real) return; // real device score already takes priority
    if (!isMedianApp()) return;
    computeStrainEstimate().then((result) => { if (result) setEstimate(result); });
  }, [real]);

  if (!real && !estimate) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 flex items-center gap-3 mb-6">
      <span className="text-2xl">⚡</span>
      <div className="min-w-0">
        {real ? (
          <>
            <p className="text-sm font-medium">
              {real.source === "WHOOP" ? `Strain: ${real.value.toFixed(1)} / 21` : `Training Load: ${Math.round(real.value)}`}
            </p>
            <p className="text-xs text-foreground-dim">via {real.source === "WHOOP" ? "Whoop" : "Garmin"}</p>
          </>
        ) : estimate && (
          <>
            <p className="text-sm font-medium">{estimate.label} ({estimate.relativePct}% of typical)</p>
            <p className="text-xs text-foreground-dim">Estimated from your {estimate.sourcesUsed.join(", ")}</p>
          </>
        )}
      </div>
    </div>
  );
}
