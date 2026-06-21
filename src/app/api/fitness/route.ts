// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMergedDailyMetrics, computeBaselineComparisons } from "@/lib/ai/metrics";
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const history = await getMergedDailyMetrics(userId, 30);
  const comparisons = computeBaselineComparisons(history);
  const latest = history[history.length - 1];
  if (!latest) return NextResponse.json({ error: "No data yet" }, { status: 404 });
  const flags = [];
  const hrv = comparisons.find(c => c.field === "hrvMs");
  const rhr = comparisons.find(c => c.field === "restingHeartRate");
  const sleep = comparisons.find(c => c.field === "sleepScore");
  const recovery = comparisons.find(c => c.field === "bodyBatteryOrRecoveryPct");
  if (hrv?.deltaPct && hrv.deltaPct < -20) flags.push({ type: "warning", metric: "HRV", message: "HRV is " + Math.abs(hrv.deltaPct) + "% below your 30-day average. Consider an easy day." });
  if (rhr?.deltaPct && rhr.deltaPct > 10) flags.push({ type: "warning", metric: "Resting HR", message: "Resting HR is " + rhr.deltaPct + "% above your average. Monitor for fatigue." });
  if (sleep?.deltaPct && sleep.deltaPct < -15) flags.push({ type: "info", metric: "Sleep", message: "Sleep score is below your usual range. Prioritize recovery tonight." });
  if (recovery?.deltaPct && recovery.deltaPct < -20) flags.push({ type: "warning", metric: "Recovery", message: "Recovery is " + Math.abs(recovery.deltaPct) + "% below your baseline. Avoid hard efforts today." });
  const fitnessScore = Math.round(((latest.hrvMs?Math.min(latest.hrvMs/80*100,100):50)*0.3)+((latest.sleepScore||50)*0.3)+((latest.bodyBatteryOrRecoveryPct||50)*0.4));
  const readiness = fitnessScore>=75?"Ready to train hard":fitnessScore>=55?"Moderate effort recommended":"Recovery day recommended";
  return NextResponse.json({ fitnessScore, readiness, flags, metrics: { hrvMs: latest.hrvMs, restingHeartRate: latest.restingHeartRate, sleepScore: latest.sleepScore, recovery: latest.bodyBatteryOrRecoveryPct }, comparisons }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
