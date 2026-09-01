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

/** Fetches steps/distance/activeEnergy/exerciseTime for the given ISO date range. Returns null outside the Median app, or if the fetch fails. */
export async function getHealthData(startDate: string, endDate: string): Promise<HealthBridge.GetDataResponse | null> {
  if (!isMedianApp()) return null;
  try {
    return await withTimeout(
      Median.healthBridge.getData({
        dataTypes: HEALTH_DATA_TYPES,
        startDate,
        endDate,
        bucket: "day",
      }),
      BRIDGE_TIMEOUT_MS
    );
  } catch {
    return null;
  }
}
