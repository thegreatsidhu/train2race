import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMergedDailyMetrics, computeBaselineComparisons } from "@/lib/ai/metrics";
import { Waveform } from "@/components/Waveform";
import { AdviceCardView } from "@/components/AdviceCardView";
import { TrendChart } from "@/components/TrendChart";
import { GenerateAdviceButton } from "@/components/GenerateAdviceButton";
import { ActivityList } from "@/components/ActivityList";

export default async function TodayPage() {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [adviceCard, history, connections, recentActivities] = await Promise.all([
    prisma.adviceCard.findUnique({ where: { userId_date: { userId, date: today } } }),
    getMergedDailyMetrics(userId, 30),
    prisma.deviceConnection.findMany({ where: { userId } }),
    prisma.activity.findMany({ where: { userId }, orderBy: { startTime: "desc" }, take: 5 }),
  ]);

  const comparisons = computeBaselineComparisons(history);
  const latest = history[history.length - 1];
  const hasAnyConnection = connections.length > 0;
  const hasData = history.length > 0;

  const rhrComparison = comparisons.find((c) => c.field === "restingHeartRate");
  const hrvComparison = comparisons.find((c) => c.field === "hrvMs");
  const sleepComparison = comparisons.find((c) => c.field === "sleepScore");
  const recoveryComparison = comparisons.find((c) => c.field === "bodyBatteryOrRecoveryPct");

  return (
    <div className="max-w-4xl px-4 md:px-8 py-6 md:py-10">
      <header className="mb-6 md:mb-8">
        <p className="font-data text-xs uppercase tracking-[0.16em] text-foreground-dim mb-2">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">Today</h1>
      </header>

      {!hasAnyConnection && (
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <p className="text-sm text-foreground-dim mb-3">No devices connected yet.</p>
          <a href="/dashboard/connections"
            className="inline-block px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors">
            Connect a device
          </a>
        </div>
      )}

      {hasAnyConnection && !hasData && (
        <div className="rounded-2xl border border-border bg-surface p-6 mb-6">
          <p className="text-sm text-foreground-dim">Connected, but no data has synced yet.</p>
        </div>
      )}

      {hasData && (
        <>
          <div className="rounded-2xl border border-border bg-surface p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-data text-xs text-foreground-dim uppercase tracking-wide">Resting heart rate</span>
              <span className="font-data text-2xl text-signal">
                {latest?.restingHeartRate ?? "—"} <span className="text-sm text-foreground-dim">bpm</span>
              </span>
            </div>
            <Waveform restingHeartRate={latest?.restingHeartRate ?? 60} className="h-14" />
          </div>

          {adviceCard ? (
            <AdviceCardView card={adviceCard} />
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-4 md:p-6 mb-6 flex items-center justify-between">
              <p className="text-sm text-foreground-dim">Tonight&apos;s advice hasn&apos;t generated yet.</p>
              <GenerateAdviceButton />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
            <MetricTile label="HRV" value={latest?.hrvMs} unit="ms" comparison={hrvComparison} />
            <MetricTile label="Sleep score" value={latest?.sleepScore} unit="" comparison={sleepComparison} />
            <MetricTile label="Recovery" value={latest?.bodyBatteryOrRecoveryPct} unit="%" comparison={recoveryComparison} />
            <MetricTile label="Resting HR" value={latest?.restingHeartRate} unit="bpm" comparison={rhrComparison} invertGood />
          </div>

          <section className="mb-6 md:mb-8">
            <h2 className="text-sm font-medium text-foreground-dim mb-3">30-day trend</h2>
            <TrendChart history={history} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-foreground-dim">Recent activity</h2>
              <a href="/dashboard/log-workout"
                className="px-4 py-2 rounded-full bg-signal text-background text-sm font-medium hover:bg-signal-dim transition-colors">
                + Log workout
              </a>
            </div>
            <ActivityList activities={recentActivities.map(a => ({
              id: a.id,
              title: a.title,
              type: a.type,
              startTime: a.startTime,
              durationSec: a.durationSec,
              distanceM: a.distanceM,
              source: a.source,
            }))} />
          </section>
        </>
      )}
    </div>
  );
}

function MetricTile({ label, value, unit, comparison, invertGood = false }: {
  label: string;
  value?: number | null;
  unit: string;
  comparison?: { direction: "up" | "down" | "flat" | "unknown"; deltaPct?: number };
  invertGood?: boolean;
}) {
  const direction = comparison?.direction ?? "unknown";
  const isGoodDirection = invertGood ? direction === "down" : direction === "up";
  const isBadDirection = invertGood ? direction === "up" : direction === "down";
  const color = isGoodDirection ? "text-signal" : isBadDirection ? "text-alert" : "text-foreground-dim";
  const arrow = direction === "up" ? "↑" : direction === "down" ? "↓" : direction === "flat" ? "→" : "";

  return (
    <div className="rounded-xl border border-border bg-surface px-3 md:px-4 py-3">
      <p className="text-xs text-foreground-dim uppercase tracking-wide mb-1">{label}</p>
      <p className="font-data text-lg md:text-xl">
        {value != null ? Math.round(value * 10) / 10 : "—"}
        <span className="text-xs text-foreground-dim ml-1">{unit}</span>
      </p>
      {comparison?.deltaPct != null && (
        <p className={`text-xs ${color} mt-0.5`}>
          {arrow} {Math.abs(comparison.deltaPct)}% vs 30d
        </p>
      )}
    </div>
  );
}
