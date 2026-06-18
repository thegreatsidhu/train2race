"use client";

import { useEffect, useState } from "react";
import type { FitnessAssessment } from "@/lib/ai/fitness-score";

interface AssessmentData {
  assessment: FitnessAssessment;
  narrative: string;
  cached: boolean;
}

const DIMENSION_COLORS: Record<string, string> = {
  "Cardiovascular": "var(--signal)",
  "Recovery & HRV": "#7c9ef5",
  "Sleep": "var(--load)",
  "Training Load": "#b07cf5",
  "Consistency": "#5ec4c9",
};

const TREND_SYMBOL: Record<string, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
  unknown: "",
};

const TREND_COLOR: Record<string, string> = {
  improving: "text-signal",
  declining: "text-alert",
  stable: "text-foreground-dim",
  unknown: "text-foreground-dim",
};

function ScoreRing({ score, label }: { score: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 85 ? "var(--signal)"
    : score >= 70 ? "#7c9ef5"
    : score >= 55 ? "var(--load)"
    : score >= 40 ? "#e8a24c"
    : "var(--alert)";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="var(--border)" strokeWidth="10" />
          <circle cx="64" cy="64" r={radius} fill="none"
            stroke={color} strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-data text-4xl font-semibold">{score}</span>
          <span className="font-data text-xs text-foreground-dim">/100</span>
        </div>
      </div>
      <span className="text-lg font-semibold tracking-tight" style={{ color }}>{label}</span>
    </div>
  );
}

function DimensionBar({ dimension }: { dimension: FitnessAssessment["dimensions"][0] }) {
  const color = DIMENSION_COLORS[dimension.name] ?? "var(--signal)";
  const trendSymbol = TREND_SYMBOL[dimension.trend] ?? "";
  const trendColor = TREND_COLOR[dimension.trend] ?? "text-foreground-dim";

  return (
    <div className="rounded-xl border border-border bg-surface px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{dimension.name}</span>
          {trendSymbol && <span className={`text-xs font-data ${trendColor}`}>{trendSymbol}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-data text-sm" style={{ color }}>{dimension.score}</span>
          <span className="text-xs text-foreground-dim">{dimension.label}</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-border overflow-hidden mb-2">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${dimension.score}%`, background: color }} />
      </div>
      <p className="text-xs text-foreground-dim">{dimension.insight}</p>
    </div>
  );
}

export default function FitnessPage() {
  const [data, setData] = useState<AssessmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(force = false) {
    if (force) setRefreshing(true);
    else setLoading(true);

    const res = await fetch(`/api/fitness${force ? "?refresh=1" : ""}`)
      .then((r) => r.json())
      .catch(() => null);

    if (!res || res.error === "insufficient_data") {
      setError("Need at least 3 days of synced data. Sync your devices and check back.");
    } else if (res.error) {
      setError("Something went wrong loading your assessment.");
    } else {
      setData(res);
      setError(null);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-3xl px-8 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-2">
            Based on your last 30 days
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Fitness Assessment</h1>
        </div>
        {data && (
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="mt-2 px-4 py-2 rounded-full border border-border text-sm hover:border-foreground-dim transition-colors disabled:opacity-50"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </header>

      {loading && (
        <div className="rounded-2xl border border-border bg-surface p-8 flex items-center justify-center">
          <p className="text-foreground-dim text-sm">Analysing your data…</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-foreground-dim text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface p-8 flex flex-col md:flex-row items-center gap-8">
            <ScoreRing score={data.assessment.overallScore} label={data.assessment.overallLabel} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground-dim mb-3 uppercase tracking-wide font-data">
                Coach&apos;s assessment
              </p>
              <p className="text-foreground leading-relaxed">{data.narrative}</p>
              <div className="flex items-center gap-3 mt-4">
                <p className="text-xs text-foreground-dim font-data">
                  {data.assessment.daysOfData} days of data ·{" "}
                  {data.assessment.dataQuality === "good" ? "High confidence"
                    : data.assessment.dataQuality === "limited" ? "Limited data"
                    : "Insufficient data"}
                </p>
                {data.cached && (
                  <span className="text-xs text-foreground-dim font-data px-2 py-0.5 rounded-full border border-border">
                    Cached · refreshes every 24h
                  </span>
                )}
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-sm font-medium text-foreground-dim mb-3">Breakdown</h2>
            <div className="space-y-3">
              {data.assessment.dimensions.map((d) => (
                <DimensionBar key={d.name} dimension={d} />
              ))}
            </div>
          </div>

          <p className="text-xs text-foreground-dim">
            Scores are based on your own data trends and general fitness benchmarks. This is a wellness tool, not a medical assessment.
          </p>
        </div>
      )}
    </div>
  );
}