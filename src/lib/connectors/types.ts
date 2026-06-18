import type { DataSource } from "@prisma/client";

/**
 * Every wearable integration (Garmin, Whoop, Strava, Apple Health) implements
 * this same interface. The rest of the app — sync job, advice engine, chat
 * coach — never needs to know which vendor a connection belongs to.
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

export interface ConnectorTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  externalUserId?: string;
}

export interface OAuthConnector {
  source: DataSource;

  /** Builds the URL the user is redirected to for the OAuth consent screen. */
  getAuthorizationUrl(state: string): string;

  /** Exchanges an authorization code (from the OAuth callback) for tokens. */
  exchangeCodeForTokens(code: string): Promise<ConnectorTokens>;

  /** Refreshes an access token using the stored refresh token. */
  refreshAccessToken(refreshToken: string): Promise<ConnectorTokens>;

  /** Fetches normalized daily health metrics for a date range. */
  fetchDailyMetrics(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedDailyMetrics[]>;

  /** Fetches normalized activities/workouts for a date range. */
  fetchActivities(
    accessToken: string,
    startDate: Date,
    endDate: Date
  ): Promise<NormalizedActivity[]>;
}

export class ConnectorAuthError extends Error {
  constructor(message: string, public source: DataSource) {
    super(message);
    this.name = "ConnectorAuthError";
  }
}
