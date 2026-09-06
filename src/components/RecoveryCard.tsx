"use client";
import { useState, useEffect } from "react";
import { isMedianApp, computeRecoveryEstimate, type RecoveryEstimate } from "@/lib/median";

const SOURCE_LABEL: Record<string, string> = { WHOOP: "Whoop", GARMIN: "Garmin" };

export function RecoveryCard({ initialScore = null, initialSource = null }: { initialScore?: number | null; initialSource?: string | null }) {
  const [estimate, setEstimate] = useState<RecoveryEstimate | null>(
    initialScore != null
      ? {
          score: Math.round(initialScore),
          label: initialScore >= 67 ? "Well recovered" : initialScore >= 34 ? "Moderate recovery" : "Low recovery",
          advice: initialScore >= 67 ? "Good day to push harder if you want to." : initialScore >= 34 ? "Listen to your body — moderate effort is probably right." : "Consider an easier day or rest.",
          sourcesUsed: [],
        }
      : null
  );
  const sourceLabel = initialScore != null ? SOURCE_LABEL[initialSource ?? ""] ?? null : null;
  const [estimatedLabel, setEstimatedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (initialScore != null) return; // real device score already takes priority
    if (!isMedianApp()) return;
    computeRecoveryEstimate().then((result) => {
      if (!result) return;
      setEstimate(result);
      setEstimatedLabel(`Estimated from your ${result.sourcesUsed.join(", ")}`);
    });
  }, [initialScore]);

  if (!estimate) return null;

  const color = estimate.score >= 67 ? "text-signal" : estimate.score >= 34 ? "text-load" : "text-alert";
  const ring = estimate.score >= 67 ? "border-signal/40" : estimate.score >= 34 ? "border-load/40" : "border-alert/40";

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 flex items-center gap-3 mb-6">
      <div className={"w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 " + ring}>
        <span className={"font-data text-sm font-semibold " + color}>{estimate.score}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{estimate.label}</p>
        <p className="text-xs text-foreground-dim">{estimate.advice}</p>
        <p className="text-xs text-foreground-dim mt-0.5">{sourceLabel ? `via ${sourceLabel}` : estimatedLabel}</p>
      </div>
    </div>
  );
}
