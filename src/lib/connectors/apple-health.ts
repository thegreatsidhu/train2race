import type { NormalizedActivity, NormalizedDailyMetrics } from "./types";

// Apple has NO public web API for HealthKit — data only lives on-device.
// The standard workaround (used by Terra, Open Wearables, and most
// indie health apps) is: the user installs a small export app on their
// iPhone — e.g. "Health Auto Export" — which reads HealthKit locally and
// POSTs the data to a webhook URL on a schedule the user sets.
//
// This file normalizes that webhook payload shape. Users get a unique
// per-account webhook URL + secret from /settings/connections, paste it
// into their export app's "REST API automation" config, and from then on
// new data arrives automatically with no app of our own needed.
//
// Payload shape below matches the common "Health Auto Export" JSON format:
// { "data": { "metrics": [ { "name": "heart_rate", "units": "bpm",
//   "data": [ { "date": "...", "qty": 64 }, ... ] }, ... ],
//   "workouts": [ { "name": "Running", "start": "...", "end": "...",
//   "duration": 1800, "totalDistance": 5000, "totalEnergyBurned": 350,
//   "avgHeartRate": 145, "maxHeartRate": 168 }, ... ] } }

interface AppleHealthMetricPoint {
  date: string;
  qty?: number;
  Avg?: number;
  Min?: number;
  Max?: number;
}

interface AppleHealthMetric {
  name: string;
  units?: string;
  data: AppleHealthMetricPoint[];
}

interface AppleHealthWorkout {
  name: string;
  start: string;
  end: string;
  duration?: number; // seconds
  totalDistance?: number; // meters
  totalEnergyBurned?: number; // kcal
  avgHeartRate?: number;
  maxHeartRate?: number;
  elevationAscended?: number;
}

export interface AppleHealthPayload {
  data: {
    metrics?: AppleHealthMetric[];
    workouts?: AppleHealthWorkout[];
  };
}

function dayKey(isoDate: string): string {
  return new Date(isoDate).toISOString().slice(0, 10);
}

const METRIC_NAME_MAP: Record<string, keyof NormalizedDailyMetrics> = {
  resting_heart_rate: "restingHeartRate",
  heart_rate: "avgHeartRate",
  heart_rate_variability: "hrvMs",
  heart_rate_variability_sdnn: "hrvMs",
  respiratory_rate: "respirationRate",
  blood_oxygen_saturation: "spo2Pct",
  step_count: "steps",
  active_energy_burned: "activeCalories",
  basal_energy_burned: "totalCalories",
  vo2_max: "vo2Max",
  weight_body_mass: "bodyWeightKg",
};

/**
 * Groups Apple Health metric points by calendar day and maps them onto
 * our shared NormalizedDailyMetrics shape. Sleep is handled separately
 * below since Apple reports it as "sleep_analysis" categorical stages
 * rather than a simple quantity series.
 */
export function normalizeAppleHealthDaily(
  payload: AppleHealthPayload
): NormalizedDailyMetrics[] {
  const byDay = new Map<string, NormalizedDailyMetrics>();

  const getOrCreateDay = (key: string): NormalizedDailyMetrics => {
    let entry = byDay.get(key);
    if (!entry) {
      entry = { date: new Date(key) };
      byDay.set(key, entry);
    }
    return entry;
  };

  for (const metric of payload.data.metrics ?? []) {
    const targetField = METRIC_NAME_MAP[metric.name];
    if (!targetField) continue; // ignore metrics we don't map yet

    // Group this metric's points by day and average them.
    const dayBuckets = new Map<string, number[]>();
    for (const point of metric.data) {
      const key = dayKey(point.date);
      const value = point.qty ?? point.Avg;
      if (value == null) continue;
      const bucket = dayBuckets.get(key) ?? [];
      bucket.push(value);
      dayBuckets.set(key, bucket);
    }

    for (const [key, values] of dayBuckets) {
      const entry = getOrCreateDay(key);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      (entry[targetField] as number) = Math.round(avg * 10) / 10;
    }
  }

  return Array.from(byDay.values());
}

export function normalizeAppleHealthWorkouts(
  payload: AppleHealthPayload
): NormalizedActivity[] {
  return (payload.data.workouts ?? []).map((w) => ({
    externalId: `${w.name}-${w.start}`, // Apple workouts have no stable numeric id in this export format
    type: normalizeAppleWorkoutName(w.name),
    startTime: new Date(w.start),
    durationSec: w.duration ?? Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 1000),
    distanceM: w.totalDistance,
    avgHeartRate: w.avgHeartRate,
    maxHeartRate: w.maxHeartRate,
    elevationGainM: w.elevationAscended,
    calories: w.totalEnergyBurned,
    title: w.name,
    raw: w,
  }));
}

function normalizeAppleWorkoutName(name: string): string {
  const s = name.toLowerCase();
  if (s.includes("run")) return "run";
  if (s.includes("cycl") || s.includes("bik")) return "ride";
  if (s.includes("swim")) return "swim";
  if (s.includes("strength") || s.includes("weight") || s.includes("functional")) return "strength";
  if (s.includes("walk") || s.includes("hik")) return "walk";
  return "other";
}
