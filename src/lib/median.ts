import Median from "median-js-bridge";
import type { HealthBridge } from "median-js-bridge";

const HEALTH_PERMISSION_TYPES: HealthBridge.DataType[] = ["steps", "distance", "activeEnergy", "exerciseTime", "heartRate"];
const HEALTH_DATA_TYPES: HealthBridge.DataType[] = ["steps", "distance", "activeEnergy", "exerciseTime"];
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
