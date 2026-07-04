import { DataSource } from "@/generated/prisma/client";
import type {
  ConnectorTokens,
  NormalizedActivity,
  NormalizedDailyMetrics,
  OAuthConnector,
} from "./types";

// Strava API v3. Docs: https://developers.strava.com/
// IMPORTANT: As of the June 2026 developer program changes, your app needs
// an active Strava subscription to operate as a "Standard Tier" developer,
// and you must self-upgrade in the API settings dashboard to support up to
// 10 athletes before requesting Extended Access for more.
//
// IMPORTANT: Strava is an ACTIVITIES platform only. It does not provide
// sleep, HRV, recovery, or other passive daily health metrics — so
// fetchDailyMetrics() here only derives what it can (steps/calories are
// NOT available either; Strava has no daily summary endpoint).
// Use Whoop/Garmin/Apple Health for recovery & sleep data, and Strava
// purely as an activity-log source.

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_OAUTH_BASE = "https://www.strava.com/oauth";
const SCOPES = "read,activity:read_all,profile:read_all";

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  athlete?: { id: number };
}

interface StravaActivity {
  id: number;
  name: string;
  type: string; // "Run" | "Ride" | "Swim" | "WeightTraining" | etc
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  moving_time: number;
  distance: number; // meters
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  calories?: number;
  average_speed?: number; // m/s
  suffer_score?: number; // Strava's relative effort
}

async function stravaFetch<T>(path: string, accessToken: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${STRAVA_API_BASE}${path}`);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Strava API error ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export class StravaConnector implements OAuthConnector {
  source = DataSource.STRAVA;

  private clientId = process.env.STRAVA_CLIENT_ID!;
  private clientSecret = process.env.STRAVA_CLIENT_SECRET!;
  private redirectUri = process.env.STRAVA_REDIRECT_URI!;

  getAuthorizationUrl(state: string): string {
    const url = new URL(`${STRAVA_OAUTH_BASE}/authorize`);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("approval_prompt", "auto");
    url.searchParams.set("scope", SCOPES);
    url.searchParams.set("state", state);
    return url.toString();
  }

  async exchangeCodeForTokens(code: string): Promise<ConnectorTokens> {
    const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) throw new Error(`Strava token exchange failed: ${await res.text()}`);
    const data = (await res.json()) as StravaTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
      externalUserId: data.athlete?.id?.toString(),
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<ConnectorTokens> {
    const res = await fetch(`${STRAVA_OAUTH_BASE}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Strava token refresh failed: ${await res.text()}`);
    const data = (await res.json()) as StravaTokenResponse;
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    };
  }

  /**
   * Strava has no daily health-summary endpoint. We return an empty array
   * here; the sync job knows to skip merging "daily metrics" from Strava
   * and only pull activities below. Kept as a method (returning []) so
   * the OAuthConnector interface stays uniform across all four sources.
   */
  async fetchDailyMetrics(): Promise<NormalizedDailyMetrics[]> {
    return [];
  }

  async fetchActivities(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedActivity[]> {
    const activities: StravaActivity[] = [];
    let page = 1;
    const perPage = 100;

    // Strava paginates with page/per_page rather than tokens.
    while (true) {
      const batch = await stravaFetch<StravaActivity[]>("/athlete/activities", accessToken, {
        after: Math.floor(startDate.getTime() / 1000).toString(),
        before: Math.floor(endDate.getTime() / 1000).toString(),
        page: page.toString(),
        per_page: perPage.toString(),
      });
      activities.push(...batch);
      if (batch.length < perPage) break;
      page += 1;
    }

    return activities.map((a) => ({
      externalId: a.id.toString(),
      type: normalizeStravaType(a.sport_type || a.type),
      startTime: new Date(a.start_date),
      durationSec: a.moving_time,
      distanceM: a.distance,
      avgHeartRate: a.average_heartrate,
      maxHeartRate: a.max_heartrate,
      avgPaceSecPerKm:
        a.average_speed && a.average_speed > 0 ? 1000 / a.average_speed : undefined,
      elevationGainM: a.total_elevation_gain,
      calories: a.calories,
      trainingLoad: a.suffer_score,
      title: a.name,
      raw: a,
    }));
  }
}

function normalizeStravaType(sportType: string): string {
  const s = sportType.toLowerCase();
  if (s.includes("run")) return "run";
  if (s.includes("ride") || s.includes("cycl")) return "ride";
  if (s.includes("swim")) return "swim";
  if (s.includes("weighttraining") || s.includes("strength") || s.includes("workout")) return "strength";
  if (s.includes("walk") || s.includes("hike")) return "walk";
  return "other";
}
