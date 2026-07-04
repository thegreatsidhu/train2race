import { DataSource } from "@/generated/prisma/client";
import type {
  ConnectorTokens,
  NormalizedActivity,
  NormalizedDailyMetrics,
  OAuthConnector,
} from "./types";

// WHOOP API v2. Docs: https://developer.whoop.com/
// Auth URL:  https://api.prod.whoop.com/oauth/oauth2/auth
// Token URL: https://api.prod.whoop.com/oauth/oauth2/token
// Note: WHOOP access tokens are short-lived; always request the "offline"
// scope so you receive a refresh_token, and refresh proactively.

const WHOOP_API_BASE = "https://api.prod.whoop.com";
const SCOPES = [
  "offline",
  "read:profile",
  "read:cycles",
  "read:recovery",
  "read:sleep",
  "read:workout",
  "read:body_measurement",
].join(" ");

interface WhoopTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface WhoopCycle {
  id: number;
  start: string;
  end: string | null;
  score?: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  };
}

interface WhoopRecovery {
  cycle_id: number;
  sleep_id: string;
  score?: {
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  };
}

interface WhoopSleep {
  id: string;
  start: string;
  end: string;
  score?: {
    sleep_performance_percentage: number;
    respiratory_rate: number;
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
    };
  };
}

interface WhoopWorkout {
  id: string;
  sport_name: string;
  start: string;
  end: string;
  score?: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
  };
}

interface WhoopPaginated<T> {
  records: T[];
  next_token?: string;
}

async function whoopFetch<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${WHOOP_API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`WHOOP API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

async function whoopFetchAllPages<T>(
  path: string,
  accessToken: string,
  startDate: Date,
  endDate: Date
): Promise<T[]> {
  const results: T[] = [];
  let nextToken: string | undefined;

  do {
    const params: Record<string, string> = {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      limit: "25",
    };
    if (nextToken) params.nextToken = nextToken;

    const page = await whoopFetch<WhoopPaginated<T>>(path, accessToken, params);
    results.push(...page.records);
    nextToken = page.next_token;
  } while (nextToken);

  return results;
}

export class WhoopConnector implements OAuthConnector {
  source = DataSource.WHOOP;

  private clientId = process.env.WHOOP_CLIENT_ID!;
  private clientSecret = process.env.WHOOP_CLIENT_SECRET!;
  private redirectUri = process.env.WHOOP_REDIRECT_URI!;

  getAuthorizationUrl(state: string): string {
    const url = new URL(`${WHOOP_API_BASE}/oauth/oauth2/auth`);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForTokens(code: string): Promise<ConnectorTokens> {
    const res = await fetch(`${WHOOP_API_BASE}/oauth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
      }),
    });
    if (!res.ok) throw new Error(`WHOOP token exchange failed: ${await res.text()}`);
    const data = (await res.json()) as WhoopTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ConnectorTokens> {
    const res = await fetch(`${WHOOP_API_BASE}/oauth/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: "offline",
      }),
    });
    if (!res.ok) throw new Error(`WHOOP token refresh failed: ${await res.text()}`);
    const data = (await res.json()) as WhoopTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async fetchDailyMetrics(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedDailyMetrics[]> {
    const [cycles, recoveries, sleeps] = await Promise.all([
      whoopFetchAllPages<WhoopCycle>("/developer/v2/cycle", accessToken, startDate, endDate),
      whoopFetchAllPages<WhoopRecovery>("/developer/v2/recovery", accessToken, startDate, endDate),
      whoopFetchAllPages<WhoopSleep>("/developer/v2/activity/sleep", accessToken, startDate, endDate),
    ]);

    // Index recoveries by cycle_id and sleeps by id for joining
    const recoveryByCycle = new Map(recoveries.map((r) => [r.cycle_id, r]));
    const sleepById = new Map(sleeps.map((s) => [s.id, s]));

    return cycles.map((cycle) => {
      const recovery = recoveryByCycle.get(cycle.id);
      const sleep = recovery ? sleepById.get(recovery.sleep_id) : undefined;
      const stages = sleep?.score?.stage_summary;

      const metrics: NormalizedDailyMetrics = {
        date: new Date(cycle.start),
        avgHeartRate: cycle.score?.average_heart_rate,
        maxHeartRate: cycle.score?.max_heart_rate,
        strainOrLoadScore: cycle.score?.strain,
        activeCalories: cycle.score?.kilojoule ? cycle.score.kilojoule / 4.184 : undefined, // kJ -> kcal
        restingHeartRate: recovery?.score?.resting_heart_rate,
        hrvMs: recovery?.score?.hrv_rmssd_milli,
        bodyBatteryOrRecoveryPct: recovery?.score?.recovery_score,
        spo2Pct: recovery?.score?.spo2_percentage,
        sleepScore: sleep?.score?.sleep_performance_percentage,
        respirationRate: sleep?.score?.respiratory_rate,
        sleepDurationMin: stages
          ? (stages.total_in_bed_time_milli - stages.total_awake_time_milli) / 60000
          : undefined,
        sleepDeepMin: stages ? stages.total_slow_wave_sleep_time_milli / 60000 : undefined,
        sleepRemMin: stages ? stages.total_rem_sleep_time_milli / 60000 : undefined,
        sleepLightMin: stages ? stages.total_light_sleep_time_milli / 60000 : undefined,
        sleepAwakeMin: stages ? stages.total_awake_time_milli / 60000 : undefined,
        raw: { cycle, recovery, sleep },
      };
      return metrics;
    });
  }

  async fetchActivities(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedActivity[]> {
    const workouts = await whoopFetchAllPages<WhoopWorkout>(
      "/developer/v2/activity/workout",
      accessToken,
      startDate,
      endDate
    );

    return workouts.map((w) => {
      const durationSec =
        (new Date(w.end).getTime() - new Date(w.start).getTime()) / 1000;
      return {
        externalId: w.id,
        type: normalizeWhoopSport(w.sport_name),
        startTime: new Date(w.start),
        durationSec,
        distanceM: w.score?.distance_meter,
        avgHeartRate: w.score?.average_heart_rate,
        maxHeartRate: w.score?.max_heart_rate,
        elevationGainM: w.score?.altitude_gain_meter,
        calories: w.score?.kilojoule ? w.score.kilojoule / 4.184 : undefined,
        trainingLoad: w.score?.strain,
        title: w.sport_name,
        raw: w,
      };
    });
  }
}

function normalizeWhoopSport(sportName: string): string {
  const s = sportName.toLowerCase();
  if (s.includes("run")) return "run";
  if (s.includes("cycl") || s.includes("bik")) return "ride";
  if (s.includes("swim")) return "swim";
  if (s.includes("weight") || s.includes("strength")) return "strength";
  if (s.includes("walk")) return "walk";
  return "other";
}
