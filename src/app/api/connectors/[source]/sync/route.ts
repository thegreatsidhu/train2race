import { NextRequest, NextResponse } from "next/server";
import { DataSource } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeAppleHealthDaily,
  normalizeAppleHealthWorkouts,
  type AppleHealthPayload,
} from "@/lib/connectors/apple-health";
import { upsertDailyMetrics, upsertActivities } from "@/lib/sync/persist";

// URL shape: /api/connectors/apple-health?token=<webhookSecret>
// The user pastes this exact URL (with their unique token) into their
// Health Auto Export "REST API" automation. No OAuth needed since Apple
// has no public web API — the export app pushes data from the device.

export async function POST(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const connection = await prisma.deviceConnection.findFirst({
    where: { source: DataSource.APPLE_HEALTH, webhookSecret: token, status: "active" },
  });

  if (!connection) {
    return NextResponse.json({ error: "Invalid or revoked token" }, { status: 401 });
  }

  let payload: AppleHealthPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload?.data) {
    return NextResponse.json({ error: "Missing data.metrics/workouts" }, { status: 400 });
  }

  try {
    const dailyMetrics = normalizeAppleHealthDaily(payload);
    const activities = normalizeAppleHealthWorkouts(payload);

    await upsertDailyMetrics(connection.userId, DataSource.APPLE_HEALTH, dailyMetrics);
    await upsertActivities(connection.userId, DataSource.APPLE_HEALTH, activities);

    await prisma.deviceConnection.update({
      where: { id: connection.id },
      data: { lastSyncedAt: new Date(), lastError: null },
    });

    return NextResponse.json({
      ok: true,
      daysReceived: dailyMetrics.length,
      workoutsReceived: activities.length,
    });
  } catch (err) {
    console.error("Apple Health webhook processing failed:", err);
    await prisma.deviceConnection.update({
      where: { id: connection.id },
      data: { lastError: err instanceof Error ? err.message : "Unknown error" },
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
