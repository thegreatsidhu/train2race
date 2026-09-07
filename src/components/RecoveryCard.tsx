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
          details: [],
        }
      : null
  );
  const isRealScore = initialScore != null;
  const sourceLabel = isRealScore ? SOURCE_LABEL[initialSource ?? ""] ?? null : null;

  useEffect(() => {
    if (isRealScore) return; // real device score already takes priority
    if (!isMedianApp()) return;
    computeRecoveryEstimate().then((result) => { if (result) setEstimate(result); });
  }, [isRealScore]);

  if (!estimate) return null;

  const hasScore = estimate.score != null;
  const color = !hasScore ? "text-foreground-dim" : estimate.score! >= 67 ? "text-signal" : estimate.score! >= 34 ? "text-load" : "text-alert";
  const ring = !hasScore ? "border-border" : estimate.score! >= 67 ? "border-signal/40" : estimate.score! >= 34 ? "border-load/40" : "border-alert/40";

  return (
    <div className="rounded-2xl border border-border bg-surface px-4 py-3 mb-6">
      <div className="flex items-center gap-3">
        <div className={"w-12 h-12 rounded-full border-2 flex items-center justify-center shrink-0 " + ring}>
          <span className={"font-data text-sm font-semibold " + color}>{hasScore ? estimate.score : "?"}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{estimate.label}</p>
          <p className="text-xs text-foreground-dim">{estimate.advice}</p>
          {isRealScore ? (
            <p className="text-xs text-foreground-dim mt-0.5">via {sourceLabel}</p>
          ) : estimate.sourcesUsed.length > 0 && (
            <p className="text-xs text-foreground-dim mt-0.5">Estimated from your {estimate.sourcesUsed.join(", ")}</p>
          )}
        </div>
      </div>
      {!isRealScore && estimate.details.length > 0 && (
        <details className="mt-2 group">
          <summary className="text-xs text-foreground-dim hover:text-foreground transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden select-none">
            How this was calculated <span className="inline-block transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-2 pt-2 border-t border-border space-y-1.5">
            {estimate.details.map((d) => (
              <div key={d.label} className="flex items-center justify-between text-xs">
                <span className="text-foreground-dim">{d.label}</span>
                {d.usedInScore ? (
                  <span>
                    {Math.round(d.todayValue * 10) / 10} {d.unit}
                    <span className="text-foreground-dim"> vs {Math.round(d.baselineValue * 10) / 10} avg ({d.daysOfHistory}d)</span>
                  </span>
                ) : (
                  <span className="text-foreground-dim">Only {d.daysOfHistory}d of history — not used</span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
