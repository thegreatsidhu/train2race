import Median from "median-js-bridge";
import type { HealthBridge } from "median-js-bridge";

const HEALTH_PERMISSION_TYPES: HealthBridge.DataType[] = ["steps", "distance", "activeEnergy", "exerciseTime", "heartRate", "heartRateVariability", "restingHeartRate", "sleep"];
const HEALTH_DATA_TYPES: HealthBridge.DataType[] = ["steps", "distance", "activeEnergy", "exerciseTime", "heartRateVariability", "restingHeartRate", "sleep"];
const BRIDGE_TIMEOUT_MS = 15000;

/**
 * Calls to the native bridge never reject when there's no native wrapper to answer them —
 * the underlying promise just hangs forever. isMedianApp() must gate every call, and this
 * timeout is a second line of defense in case the native side stalls after all.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Median bridge timed out")), ms)),
  ]);
}

/** True when running inside the Median native app wrapper (iOS or Android), false in a regular browser. */
export function isMedianApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return Median.isNativeApp();
  } catch {
    return false;
  }
}

/**
 * Requests Health app permissions. Returns null outside the Median app, or if the request fails.
 * Note: iOS never reports which individual permissions were granted or denied — treat a
 * non-null response as "the prompt was shown" and rely on getHealthData() returning empty
 * results to detect missing access, not on inspecting this response.
 */
export async function requestHealthPermissions(): Promise<HealthBridge.RequestPermissionsResponse | null> {
  if (!isMedianApp()) return null;
  try {
    return await withTimeout(Median.healthBridge.requestPermissions(HEALTH_PERMISSION_TYPES), BRIDGE_TIMEOUT_MS);
  } catch {
    return null;
  }
}

/**
 * Extracts a numeric value from a single entry of a getHealthData() response (e.g. `data.steps`).
 * Median's own docs show these as arrays of `{start,end,value}` points, but the installed
 * median-js-bridge package's TypeScript types (and possibly some native versions) describe a
 * single `{value}` object instead. Handle both shapes rather than trust one over the other.
 *
 * When given an array (e.g. a "raw"-bucket query with multiple entries — several workouts in
 * one day), picks the entry with the latest end/start time rather than assuming array order,
 * since that ordering isn't documented either way.
 */
export function extractHealthValue(point: unknown): number | null {
  if (point == null) return null;
  if (Array.isArray(point)) {
    if (point.length === 0) return null;
    const latest = [...point].sort((a: any, b: any) => {
      const aTime = new Date(a?.end ?? a?.start ?? 0).getTime();
      const bTime = new Date(b?.end ?? b?.start ?? 0).getTime();
      return aTime - bTime;
    })[point.length - 1] as { value?: unknown } | undefined;
    return typeof latest?.value === "number" ? latest.value : null;
  }
  const value = (point as { value?: unknown })?.value;
  return typeof value === "number" ? value : null;
}

/**
 * Fetches steps/distance/activeEnergy/exerciseTime for the given ISO date range. Returns null
 * outside the Median app, or if every type fails.
 *
 * Each data type is requested independently rather than in one combined call. On Android,
 * Health Connect throws a SecurityException for the *entire* request if even one requested
 * type lacks a granted permission — so a user who granted "steps" but not "distance" would
 * get nothing at all from a combined call, even though steps data was available. Requesting
 * types separately means a permission gap on one type doesn't sink the others.
 *
 * `bucket` defaults to "day" (one aggregated total per type — right for step counts, which are
 * naturally a running daily total). Pass "raw" to get individual entries instead — e.g. distinct
 * workout sessions — combined with extractHealthValue() picking the most recent one.
 */
export async function getHealthData(startDate: string, endDate: string, bucket: HealthBridge.GetDataParams["bucket"] = "day"): Promise<HealthBridge.GetDataResponse | null> {
  if (!isMedianApp()) return null;
  const results = await Promise.allSettled(
    HEALTH_DATA_TYPES.map((type) =>
      withTimeout(
        Median.healthBridge.getData({ dataTypes: [type], startDate, endDate, bucket }),
        BRIDGE_TIMEOUT_MS
      )
    )
  );
  const merged: HealthBridge.GetDataResponse["data"] = {};
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.data) Object.assign(merged, result.value.data);
  }
  return Object.keys(merged).length > 0 ? { data: merged } : null;
}

type HealthEntry = { start?: string; end?: string; value: number };

/** Normalizes a getData() field (single object or array, per the shape ambiguity noted above) into a plain array of entries. */
function normalizeEntries(point: unknown): HealthEntry[] {
  if (point == null) return [];
  if (Array.isArray(point)) {
    return point.filter((p): p is HealthEntry => typeof (p as any)?.value === "number");
  }
  const value = (point as { value?: unknown })?.value;
  return typeof value === "number" ? [point as HealthEntry] : [];
}

export type HealthWorkout = {
  /** Stable id derived from the workout's own start/end time — used to detect "already imported." */
  externalId: string;
  start: string;
  end: string;
  durationMin: number;
  distanceM: number | null;
  calories: number | null;
};

/**
 * Returns individual workout sessions from the last `days` days, most recent first.
 *
 * The Health Bridge API has no "workout" concept — it only exposes separate metric arrays
 * (steps, distance, activeEnergy, exerciseTime). Each "exerciseTime" entry is treated as one
 * workout session (it's the metric that most closely maps to a discrete session, unlike steps
 * or distance which can accumulate continuously outside of any workout), and distance/calories
 * are attached by matching entries whose time window overlaps that session's.
 *
 * Returns [] outside the Median app, or if the native side never reports start/end times on its
 * entries (in which case there's no way to tell individual workouts apart at all).
 */
export async function getRecentWorkouts(days = 14): Promise<HealthWorkout[]> {
  if (!isMedianApp()) return [];
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const result = await getHealthData(start.toISOString(), end.toISOString(), "raw");

  const exerciseEntries = normalizeEntries(result?.data?.exerciseTime);
  const distanceEntries = normalizeEntries(result?.data?.distance);
  const energyEntries = normalizeEntries(result?.data?.activeEnergy);

  function overlapping(entries: HealthEntry[], winStart: number, winEnd: number): number | null {
    for (const e of entries) {
      const eStart = new Date(e.start ?? e.end ?? 0).getTime();
      const eEnd = new Date(e.end ?? e.start ?? 0).getTime();
      if (eStart <= winEnd && eEnd >= winStart) return e.value;
    }
    return null;
  }

  return exerciseEntries
    .filter((e) => e.start || e.end)
    .map((e) => {
      const s = e.start ?? e.end!;
      const en = e.end ?? e.start!;
      const winStart = new Date(s).getTime();
      const winEnd = new Date(en).getTime();
      return {
        externalId: `hb_${s}_${en}`,
        start: s,
        end: en,
        durationMin: e.value,
        distanceM: overlapping(distanceEntries, winStart, winEnd),
        calories: overlapping(energyEntries, winStart, winEnd),
      };
    })
    .sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime());
}

export type DailyMetricPoint = { date: string; value: number };

/**
 * Returns per-day values for a single data type over the last `days` calendar days (oldest
 * first), using "day"-bucketed data — one entry per day. Works for any daily-total-style metric
 * (steps, HRV, resting heart rate, sleep duration). Returns [] outside the Median app, or if the
 * type isn't in HEALTH_DATA_TYPES / the native side never reports it.
 */
export async function getDailyMetricHistory(type: HealthBridge.DataType, days: number): Promise<DailyMetricPoint[]> {
  if (!isMedianApp()) return [];
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);
  const result = await getHealthData(start.toISOString(), end.toISOString(), "day");

  return normalizeEntries((result?.data as Record<string, unknown> | undefined)?.[type])
    .filter((e) => e.start || e.end)
    .map((e) => {
      const d = new Date(e.start ?? e.end!);
      return { date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, value: e.value };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export type DailySteps = { date: string; steps: number };

/** Returns per-day step totals for the last `days` calendar days (oldest first). Returns [] outside the Median app. */
export async function getRecentDailySteps(days = 7): Promise<DailySteps[]> {
  const points = await getDailyMetricHistory("steps", days);
  return points.map((p) => ({ date: p.date, steps: Math.round(p.value) }));
}

export type RecoveryComponentDetail = {
  label: string;
  todayValue: number;
  baselineValue: number;
  unit: string;
  daysOfHistory: number;
  usedInScore: boolean;
};

export type RecoveryEstimate = {
  /** null when there isn't enough history for a trustworthy number — show "not enough information," not a guessed label. */
  score: number | null;
  label: string;
  advice: string;
  sourcesUsed: string[];
  /** Every metric checked, whether or not it had enough history to count — for a transparent "how this was calculated" view. */
  details: RecoveryComponentDetail[];
};

const MIN_BASELINE_DAYS = 7;

/**
 * Rough recovery estimate from HRV/resting-heart-rate/sleep history, for users without a
 * Whoop/Garmin connection (which provide a real, device-computed recovery score instead — always
 * prefer that when available, this is a fallback). Compares the most recent day's values against
 * a rolling baseline from the preceding days, since normal HRV/RHR/sleep vary enormously between
 * people — there's no meaningful universal scale, only "better or worse than your own normal."
 * Sleep is compared the same baseline-relative way as HRV/RHR (not a fixed hours target), since a
 * fixed target doesn't account for someone whose normal sleep genuinely isn't 7.5 hours.
 *
 * Returns null outside the Median app. Otherwise always returns an estimate object — `score` is
 * null when there's under MIN_BASELINE_DAYS of baseline for every metric that has any data at
 * all, so the UI can say "not enough information" instead of presenting a guess from 2-3 days of
 * data as if it were a confident "Low recovery."
 */
export async function computeRecoveryEstimate(): Promise<RecoveryEstimate | null> {
  if (!isMedianApp()) return null;
  const [hrv, rhr, sleep] = await Promise.all([
    getDailyMetricHistory("heartRateVariability", 30),
    getDailyMetricHistory("restingHeartRate", 30),
    getDailyMetricHistory("sleep", 30),
  ]);

  // Overnight metrics can produce absurd values when a native day-bucket boundary splits a
  // session that spans midnight (e.g. an 11pm-7am sleep session reporting as "2 minutes" for one
  // of the two days it crosses). Filtering these out before they're used as either "today's"
  // value or part of the baseline average prevents a confident-looking score from garbage data —
  // a day like that is treated as no data for that day, not as a real (terrible) reading.
  function scoreComponent(label: string, unit: string, rawHistory: DailyMetricPoint[], higherIsBetter: boolean, minPlausible: number): { detail: RecoveryComponentDetail; score: number | null } | null {
    const history = rawHistory.filter((p) => p.value >= minPlausible);
    if (history.length === 0) return null;
    const latest = history[history.length - 1];
    const baseline = history.slice(0, -1);
    const baselineAvg = baseline.length > 0 ? baseline.reduce((s, p) => s + p.value, 0) / baseline.length : 0;
    const enoughHistory = baseline.length >= MIN_BASELINE_DAYS && baselineAvg > 0;
    const score = enoughHistory
      ? Math.max(0, Math.min(100, 50 + ((higherIsBetter ? latest.value / baselineAvg : baselineAvg / latest.value) - 1) * 200))
      : null;
    return {
      score,
      detail: { label, unit, todayValue: latest.value, baselineValue: baselineAvg, daysOfHistory: baseline.length, usedInScore: enoughHistory },
    };
  }

  const hrvResult = scoreComponent("HRV", "ms", hrv, true, 1);
  const rhrResult = scoreComponent("Resting heart rate", "bpm", rhr, false, 1);
  // A real full night's sleep is virtually never under an hour — anything less is almost
  // certainly a midnight-boundary split artifact, not an accurate reading of that night.
  const sleepResult = scoreComponent("Sleep", "min", sleep, true, 60);

  const details = [hrvResult, rhrResult, sleepResult].filter((r): r is NonNullable<typeof r> => r !== null).map((r) => r.detail);

  const weighted: { score: number; weight: number; label: string }[] = [];
  if (hrvResult?.score != null) weighted.push({ score: hrvResult.score, weight: 0.4, label: "HRV" });
  if (rhrResult?.score != null) weighted.push({ score: rhrResult.score, weight: 0.35, label: "resting heart rate" });
  if (sleepResult?.score != null) weighted.push({ score: sleepResult.score, weight: 0.25, label: "sleep" });

  if (weighted.length === 0) {
    const daysAvailable = details.length > 0 ? Math.max(...details.map((d) => d.daysOfHistory)) : 0;
    return {
      score: null,
      label: "Not enough information",
      advice: details.length > 0
        ? `${daysAvailable} of ${MIN_BASELINE_DAYS} days of history so far — check back once more data builds up.`
        : "No HRV, resting heart rate, or sleep data found yet.",
      sourcesUsed: [],
      details,
    };
  }

  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  const score = Math.round(weighted.reduce((s, w) => s + w.score * w.weight, 0) / totalWeight);

  const label = score >= 67 ? "Well recovered" : score >= 34 ? "Moderate recovery" : "Low recovery";
  const advice = score >= 67
    ? "Good day to push harder if you want to."
    : score >= 34
    ? "Listen to your body — moderate effort is probably right."
    : "Consider an easier day or rest.";

  return { score, label, advice, sourcesUsed: weighted.map((w) => w.label), details };
}

export type StrainEstimate = {
  /** e.g. 130 means "30% more effort than a typical day" — relative to the user's own baseline, not an absolute scale. */
  relativePct: number;
  label: string;
  sourcesUsed: string[];
};

/**
 * Rough "how hard today has been" estimate from active-energy and exercise-time history, for
 * users without a Whoop/Garmin connection. Unlike recovery, Whoop's strain (0-21) and Garmin's
 * training load use completely different, incompatible scales — there's no honest way to
 * normalize a computed estimate onto either one. So this reports a plain "% of your typical day"
 * instead of pretending to match either platform's number.
 *
 * Compares today's still-accumulating totals against the trailing 30-day baseline, so it reads
 * low early in the day before a workout happens — that's an inherent tradeoff of a live, same-day
 * estimate, not a bug.
 *
 * Returns null if there's under 6 days of history, or no active-energy/exercise-time data at all.
 */
export async function computeStrainEstimate(): Promise<StrainEstimate | null> {
  if (!isMedianApp()) return null;
  const [energy, exercise] = await Promise.all([
    getDailyMetricHistory("activeEnergy", 30),
    getDailyMetricHistory("exerciseTime", 30),
  ]);

  function relativeToBaseline(history: DailyMetricPoint[]): number | null {
    if (history.length < 6) return null;
    const latest = history[history.length - 1];
    const baseline = history.slice(0, -1);
    const baselineAvg = baseline.reduce((s, p) => s + p.value, 0) / baseline.length;
    if (baselineAvg === 0) return null;
    return (latest.value / baselineAvg) * 100;
  }

  const energyPct = relativeToBaseline(energy);
  const exercisePct = relativeToBaseline(exercise);

  const weighted: { pct: number; weight: number; label: string }[] = [];
  if (energyPct != null) weighted.push({ pct: energyPct, weight: 0.6, label: "active calories" });
  if (exercisePct != null) weighted.push({ pct: exercisePct, weight: 0.4, label: "exercise time" });

  if (weighted.length === 0) return null;

  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);
  const relativePct = Math.round(weighted.reduce((s, w) => s + w.pct * w.weight, 0) / totalWeight);
  const label = relativePct >= 130 ? "Higher effort than usual" : relativePct <= 70 ? "Lighter effort than usual" : "Typical effort";

  return { relativePct, label, sourcesUsed: weighted.map((w) => w.label) };
}

/**
 * Associates this device with our own user ID (so server-side OneSignal REST calls can target
 * it via include_aliases.external_id) and prompts for native push permission. Returns false
 * outside the Median app, or if the user declines / the bridge fails.
 */
export async function registerPushNotifications(userId: string): Promise<boolean> {
  if (!isMedianApp()) return false;
  try {
    await withTimeout(Median.onesignal.login(userId), BRIDGE_TIMEOUT_MS);
    const result = await withTimeout(Median.onesignal.register(), BRIDGE_TIMEOUT_MS);
    return !!result?.isSubscribed;
  } catch {
    return false;
  }
}

/** Reads current push opt-in status. Returns null outside the Median app, or if the check fails. */
export async function getPushOptedIn(): Promise<boolean | null> {
  if (!isMedianApp()) return null;
  try {
    const info = await withTimeout(Median.onesignal.info(), BRIDGE_TIMEOUT_MS);
    return !!info?.subscription?.optedIn;
  } catch {
    return null;
  }
}

/** Disassociates this device's external user ID — call on sign-out or when disabling push. No-op outside the Median app. */
export async function unregisterPushNotifications(): Promise<void> {
  if (!isMedianApp()) return;
  try {
    await withTimeout(Median.onesignal.logout(), BRIDGE_TIMEOUT_MS);
  } catch {
    // best-effort
  }
}

/**
 * Opens the OS-level settings screen for this app, where Health Connect / Health app access
 * can be reviewed or revoked. There's no bridge method to grant/revoke health permissions
 * directly — that's managed entirely by the OS (Health Connect on Android, Settings > Privacy
 * > Health on iOS), so this is the closest thing to a "disconnect" action we can offer.
 * No-op outside the Median app.
 */
export function openAppSettings(): void {
  if (!isMedianApp()) return;
  try {
    Median.open.appSettings();
  } catch {
    // best-effort
  }
}

/**
 * Sets the native status bar color to match the page background. Android renders the status
 * bar outside the WebView by default (overlay: false), so it's a separate solid color from
 * whatever our CSS draws underneath — without this, it shows up as a mismatched color block
 * above the app's top nav bar. No-op outside the Median app.
 */
export function syncStatusBarColor(): void {
  if (!isMedianApp()) return;
  try {
    Median.statusbar.matchBodyBackgroundColor({ active: true });
  } catch {
    // best-effort
  }
}
