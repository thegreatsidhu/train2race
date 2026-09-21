/**
 * Shared normalized shapes for health/activity data, regardless of source.
 * Currently only Apple Health / Google Health Connect (via the Health Bridge
 * webhook) populate these — see ./apple-health.ts.
 */

export interface NormalizedDailyMetrics {
  date: Date;
  restingHeartRate?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  hrvMs?: number;
  hrvSdnnMs?: number;
  sleepScore?: number;
  sleepDurationMin?: number;
  sleepDeepMin?: number;
  sleepRemMin?: number;
  sleepLightMin?: number;
  sleepAwakeMin?: number;
  respirationRate?: number;
  spo2Pct?: number;
  bodyBatteryOrRecoveryPct?: number;
  strainOrLoadScore?: number;
  steps?: number;
  activeCalories?: number;
  totalCalories?: number;
  vo2Max?: number;
  bodyWeightKg?: number;
  stressLevel?: number;
  raw?: unknown;
}

export interface NormalizedActivity {
  externalId: string;
  type: string; // normalized: "run" | "ride" | "swim" | "strength" | "walk" | "other"
  startTime: Date;
  durationSec: number;
  distanceM?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgPaceSecPerKm?: number;
  elevationGainM?: number;
  calories?: number;
  trainingLoad?: number;
  title?: string;
  raw?: unknown;
}
