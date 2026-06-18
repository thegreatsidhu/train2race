import { DataSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { getOAuthConnector } from "@/lib/connectors/registry";
import { upsertDailyMetrics, upsertActivities } from "./persist";

const SYNC_LOOKBACK_DAYS = 7; // re-pull a rolling week to catch any backfilled/corrected data

/**
 * Syncs a single OAuth-based connection (Garmin, Whoop, or Strava).
 * Apple Health is excluded — it has no pull-based sync, data only
 * arrives via its webhook (see /api/connectors/apple-health).
 */
export async function syncConnection(connectionId: string): Promise<{ ok: boolean; error?: string }> {
  const connection = await prisma.deviceConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.source === DataSource.APPLE_HEALTH) {
    return { ok: false, error: "Connection not found or not syncable" };
  }
  if (!connection.accessToken) {
    return { ok: false, error: "No access token stored" };
  }

  const connector = getOAuthConnector(connection.source as Exclude<DataSource, "APPLE_HEALTH">);

  let accessToken = decrypt(connection.accessToken);

  // Refresh proactively if expired or expiring within 5 minutes
  if (connection.expiresAt && connection.expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    if (!connection.refreshToken) {
      await markConnectionError(connectionId, "Token expired and no refresh token available");
      return { ok: false, error: "Token expired, no refresh token" };
    }
    try {
      const refreshed = await connector.refreshAccessToken(decrypt(connection.refreshToken));
      accessToken = refreshed.accessToken;
      await prisma.deviceConnection.update({
        where: { id: connectionId },
        data: {
          accessToken: encrypt(refreshed.accessToken),
          refreshToken: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : connection.refreshToken,
          expiresAt: refreshed.expiresAt,
          status: "active",
          lastError: null,
        },
      });
    } catch (err) {
      await markConnectionError(connectionId, `Token refresh failed: ${err}`);
      return { ok: false, error: "Token refresh failed" };
    }
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - SYNC_LOOKBACK_DAYS);

  try {
    const [dailyMetrics, activities] = await Promise.all([
      connector.fetchDailyMetrics(accessToken, startDate, endDate),
      connector.fetchActivities(accessToken, startDate, endDate),
    ]);

    await upsertDailyMetrics(connection.userId, connection.source, dailyMetrics);
    await upsertActivities(connection.userId, connection.source, activities);

    await prisma.deviceConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date(), status: "active", lastError: null },
    });

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown sync error";
    await markConnectionError(connectionId, message);
    return { ok: false, error: message };
  }
}

async function markConnectionError(connectionId: string, error: string) {
  await prisma.deviceConnection.update({
    where: { id: connectionId },
    data: { status: "error", lastError: error },
  });
}

/** Syncs every active OAuth connection for every user. Called by the nightly cron job. */
export async function syncAllConnections(): Promise<{ total: number; succeeded: number; failed: number }> {
  const connections = await prisma.deviceConnection.findMany({
    where: { status: { in: ["active", "error"] }, source: { not: DataSource.APPLE_HEALTH } },
  });

  let succeeded = 0;
  let failed = 0;

  const BATCH = 5;
  for (let i = 0; i < connections.length; i += BATCH) {
    const batch = connections.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map((c) => syncConnection(c.id)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) succeeded++;
      else failed++;
    }
  }

  return { total: connections.length, succeeded, failed };
}
