import { DataSource } from "@prisma/client";
import type {
  ConnectorTokens,
  NormalizedActivity,
  NormalizedDailyMetrics,
  OAuthConnector,
} from "./types";

// Garmin Connect Developer Program. Docs: https://developer.garmin.com/gc-developer-program/
//
// UNLIKE Whoop/Strava, Garmin requires a business-use application and a
// ~2-business-day approval + onboarding call before you get real API
// credentials. Until GARMIN_MOCK_MODE is turned off in env, this connector
// returns realistic synthetic data so the rest of the app (dashboard,
// advice engine, chat coach) can be built and demoed without blocking on
// that approval.
//
// Garmin's real flow uses OAuth 2.0, and delivers data primarily via
// push webhooks (their "Ping" or "Push" service) rather than simple polling
// — once you have real access, see their Health API / Activity API specs
// for the exact webhook payload shapes, which will differ slightly from
// the shape below. The `raw` field model gives you a place to store
// whatever Garmin actually sends without needing a schema change.

const GARMIN_MOCK_MODE = process.env.GARMIN_MOCK_MODE !== "false"; // default ON

const GARMIN_OAUTH_BASE = "https://connect.garmin.com/oauth2Confirm";
const GARMIN_TOKEN_BASE = "https://diauthz.garmin.com/di-oauth2-service/oauth/token";
const GARMIN_API_BASE = "https://apis.garmin.com";

interface GarminTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export class GarminConnector implements OAuthConnector {
  source = DataSource.GARMIN;

  private clientId = process.env.GARMIN_CLIENT_ID ?? "";
  private clientSecret = process.env.GARMIN_CLIENT_SECRET ?? "";
  private redirectUri = process.env.GARMIN_REDIRECT_URI ?? "";

  getAuthorizationUrl(state: string): string {
    if (GARMIN_MOCK_MODE) {
      // In mock mode we still go through a real-looking redirect so the UI
      // flow is identical; the callback route detects mock mode and skips
      // the real token exchange.
      return `/api/connectors/garmin/mock-consent?state=${encodeURIComponent(state)}`;
    }
    const url = new URL(GARMIN_OAUTH_BASE);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForTokens(code: string): Promise<ConnectorTokens> {
    if (GARMIN_MOCK_MODE) {
      return {
        accessToken: "mock-garmin-access-token",
        refreshToken: "mock-garmin-refresh-token",
        expiresAt: new Date(Date.now() + 3600 * 1000),
        externalUserId: "mock-garmin-user",
      };
    }

    const res = await fetch(GARMIN_TOKEN_BASE, {
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
    if (!res.ok) throw new Error(`Garmin token exchange failed: ${await res.text()}`);
    const data = (await res.json()) as GarminTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ConnectorTokens> {
    if (GARMIN_MOCK_MODE) {
      return {
        accessToken: "mock-garmin-access-token",
        refreshToken,
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };
    }

    const res = await fetch(GARMIN_TOKEN_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });
    if (!res.ok) throw new Error(`Garmin token refresh failed: ${await res.text()}`);
    const data = (await res.json()) as GarminTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async fetchDailyMetrics(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedDailyMetrics[]> {
    if (GARMIN_MOCK_MODE) {
      return generateMockDailyMetrics(startDate, endDate);
    }

    // Real Garmin Health API call (Activity/Health summaries).
    // Garmin's actual endpoint paths require your approved API path —
    // confirm exact paths during onboarding call; shape below is
    // illustrative of their documented summary structure.
    const res = await fetch(
      `${GARMIN_API_BASE}/wellness-api/rest/dailies?uploadStartTimeInSeconds=${Math.floor(
        startDate.getTime() / 1000
      )}&uploadEndTimeInSeconds=${Math.floor(endDate.getTime() / 1000)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Garmin API error ${res.status}: ${await res.text()}`);
    const dailies = await res.json();
    return mapGarminDailiesToNormalized(dailies);
  }

  async fetchActivities(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedActivity[]> {
    if (GARMIN_MOCK_MODE) {
      return generateMockActivities(startDate, endDate);
    }

    const res = await fetch(
      `${GARMIN_API_BASE}/wellness-api/rest/activities?uploadStartTimeInSeconds=${Math.floor(
        startDate.getTime() / 1000
      )}&uploadEndTimeInSeconds=${Math.floor(endDate.getTime() / 1000)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) throw new Error(`Garmin API error ${res.status}: ${await res.text()}`);
    const acts = await res.json();
    return mapGarminActivitiesToNormalized(acts);
  }
}

// ── Mock data generation ──────────────────────────────────────────────
// Deterministic-ish but slightly randomized so the dashboard/charts/advice
// engine have something realistic to chew on during development.

function dayRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

function jitter(base: number, spread: number): number {
  return Math.round((base + (Math.random() - 0.5) * spread) * 10) / 10;
}

function generateMockDailyMetrics(start: Date, end: Date): NormalizedDailyMetrics[] {
  return dayRange(start, end).map((date) => ({
    date,
    restingHeartRate: jitter(54, 6),
    avgHeartRate: jitter(72, 8),
    maxHeartRate: jitter(150, 20),
    hrvMs: jitter(62, 14),
    sleepScore: jitter(78, 16),
    sleepDurationMin: jitter(420, 60),
    sleepDeepMin: jitter(90, 25),
    sleepRemMin: jitter(95, 20),
    sleepLightMin: jitter(210, 40),
    sleepAwakeMin: jitter(20, 10),
    respirationRate: jitter(14.5, 1.5),
    spo2Pct: jitter(97, 1.5),
    bodyBatteryOrRecoveryPct: jitter(65, 25),
    stressLevel: jitter(35, 20),
    steps: Math.round(jitter(8200, 4000)),
    activeCalories: jitter(420, 200),
    totalCalories: jitter(2400, 300),
    vo2Max: jitter(46, 2),
    raw: { mock: true, source: "garmin-mock" },
  }));
}

function generateMockActivities(start: Date, end: Date): NormalizedActivity[] {
  const days = dayRange(start, end);
  const activities: NormalizedActivity[] = [];
  // roughly every other day has a workout
  days.forEach((date, i) => {
    if (i % 2 !== 0) return;
    const types = ["run", "ride", "strength"] as const;
    const type = types[i % types.length];
    const startTime = new Date(date);
    startTime.setHours(7, 0, 0, 0);
    const durationSec = type === "strength" ? jitter(2700, 600) : jitter(2400, 1200);
    activities.push({
      externalId: `mock-garmin-${date.toISOString()}-${type}`,
      type,
      startTime,
      durationSec,
      distanceM: type === "strength" ? undefined : jitter(7000, 4000),
      avgHeartRate: jitter(type === "strength" ? 120 : 145, 15),
      maxHeartRate: jitter(165, 15),
      avgPaceSecPerKm: type === "run" ? jitter(330, 40) : undefined,
      elevationGainM: type === "ride" ? jitter(150, 100) : jitter(30, 25),
      calories: jitter(type === "strength" ? 280 : 480, 150),
      trainingLoad: jitter(85, 30),
      title: `Mock ${type} workout`,
      raw: { mock: true },
    });
  });
  return activities;
}

// ── Real-mode mapping stubs ───────────────────────────────────────────
// Fill these in against the exact response shape once Garmin Developer
// Program approval is granted and you can see real payloads.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGarminDailiesToNormalized(dailies: any): NormalizedDailyMetrics[] {
  // TODO: map real Garmin Health API "dailies" summary fields once approved.
  // Expected fields per Garmin docs include restingHeartRateInBeatsPerMinute,
  // averageStressLevel, bodyBatteryChargedValue, sleepTimeInSeconds, etc.
  if (!Array.isArray(dailies)) return [];
  return dailies.map((d) => ({
    date: new Date(d.calendarDate),
    restingHeartRate: d.restingHeartRateInBeatsPerMinute,
    steps: d.steps,
    activeCalories: d.activeKilocalories,
    totalCalories: d.totalKilocalories,
    bodyBatteryOrRecoveryPct: d.bodyBatteryChargedValue,
    stressLevel: d.averageStressLevel,
    sleepDurationMin: d.sleepTimeInSeconds ? d.sleepTimeInSeconds / 60 : undefined,
    raw: d,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGarminActivitiesToNormalized(acts: any): NormalizedActivity[] {
  if (!Array.isArray(acts)) return [];
  return acts.map((a) => ({
    externalId: a.summaryId?.toString() ?? a.activityId?.toString(),
    type: (a.activityType ?? "other").toLowerCase(),
    startTime: new Date(a.startTimeInSeconds * 1000),
    durationSec: a.durationInSeconds,
    distanceM: a.distanceInMeters,
    avgHeartRate: a.averageHeartRateInBeatsPerMinute,
    maxHeartRate: a.maxHeartRateInBeatsPerMinute,
    elevationGainM: a.totalElevationGainInMeters,
    calories: a.activeKilocalories,
    title: a.activityName,
    raw: a,
  }));
}
