import { prisma } from "@/lib/prisma";

export interface MergedDayMetrics {
  date: string; // YYYY-MM-DD
  restingHeartRate?: number;
  hrvMs?: number;
  sleepScore?: number;
  sleepDurationMin?: number;
  bodyBatteryOrRecoveryPct?: number;
  strainOrLoadScore?: number;
  steps?: number;
  vo2Max?: number;
  stressLevel?: number;
  spo2Pct?: number;
}

/**
 * A user may have multiple sources reporting the same day (e.g. Whoop +
 * Strava). This merges them into one row per day, preferring whichever
 * source actually has a value for each individual field rather than
 * preferring one vendor wholesale — Whoop tends to have the best
 * HRV/recovery data, Garmin the best steps/VO2max, etc.
 */
export async function getMergedDailyMetrics(
  userId: string,
  days: number
): Promise<MergedDayMetrics[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.dailyMetrics.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  const byDay = new Map<string, MergedDayMetrics>();

  for (const row of rows) {
    const key = row.date.toISOString().slice(0, 10);
    const existing: MergedDayMetrics = byDay.get(key) ?? { date: key };

    existing.restingHeartRate ??= row.restingHeartRate ?? undefined;
    existing.hrvMs ??= row.hrvMs ?? undefined;
    existing.sleepScore ??= row.sleepScore ?? undefined;
    existing.sleepDurationMin ??= row.sleepDurationMin ?? undefined;
    existing.bodyBatteryOrRecoveryPct ??= row.bodyBatteryOrRecoveryPct ?? undefined;
    existing.strainOrLoadScore ??= row.strainOrLoadScore ?? undefined;
    existing.steps ??= row.steps ?? undefined;
    existing.vo2Max ??= row.vo2Max ?? undefined;
    existing.stressLevel ??= row.stressLevel ?? undefined;
    existing.spo2Pct ??= row.spo2Pct ?? undefined;

    byDay.set(key, existing);
  }

  return Array.from(byDay.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface BaselineComparison {
  field: keyof MergedDayMetrics;
  today?: number;
  baseline30d?: number;
  deltaPct?: number;
  direction: "up" | "down" | "flat" | "unknown";
}

const TREND_FIELDS: (keyof MergedDayMetrics)[] = [
  "restingHeartRate",
  "hrvMs",
  "sleepScore",
  "sleepDurationMin",
  "bodyBatteryOrRecoveryPct",
  "stressLevel",
];

/**
 * Compares today's metrics against the trailing 30-day average for the
 * same fields. This is the core signal both the advice engine and any
 * cardiac-relevant flagging logic rely on — e.g. resting HR notably
 * above personal baseline, or HRV notably below it.
 */
export function computeBaselineComparisons(history: MergedDayMetrics[]): BaselineComparison[] {
  if (history.length === 0) return [];

  const today = history[history.length - 1];
  const priorDays = history.slice(0, -1);

  return TREND_FIELDS.map((field) => {
    const todayValue = today[field] as number | undefined;
    const priorValues = priorDays
      .map((d) => d[field] as number | undefined)
      .filter((v): v is number => v != null);

    if (priorValues.length < 5 || todayValue == null) {
      return { field, today: todayValue, direction: "unknown" as const };
    }

    const baseline = priorValues.reduce((a, b) => a + b, 0) / priorValues.length;
    const deltaPct = ((todayValue - baseline) / baseline) * 100;

    let direction: BaselineComparison["direction"] = "flat";
    if (deltaPct > 5) direction = "up";
    else if (deltaPct < -5) direction = "down";

    return {
      field,
      today: todayValue,
      baseline30d: Math.round(baseline * 10) / 10,
      deltaPct: Math.round(deltaPct * 10) / 10,
      direction,
    };
  });
}

/**
 * Heuristic, non-diagnostic flagging for patterns worth a doctor visit.
 * This NEVER diagnoses — it only surfaces "this is meaningfully outside
 * your own normal range, consider mentioning it to a clinician."
 */
export function detectCardiacFlags(comparisons: BaselineComparison[]): string[] {
  const flags: string[] = [];

  const rhr = comparisons.find((c) => c.field === "restingHeartRate");
  if (rhr?.direction === "up" && rhr.deltaPct && rhr.deltaPct > 15) {
    flags.push(
      `Resting heart rate is ${rhr.deltaPct.toFixed(0)}% above your 30-day baseline (${rhr.today} vs ~${rhr.baseline30d} bpm).`
    );
  }

  const hrv = comparisons.find((c) => c.field === "hrvMs");
  if (hrv?.direction === "down" && hrv.deltaPct && hrv.deltaPct < -25) {
    flags.push(
      `HRV is ${Math.abs(hrv.deltaPct).toFixed(0)}% below your 30-day baseline (${hrv.today} vs ~${hrv.baseline30d} ms).`
    );
  }

  return flags;
}
