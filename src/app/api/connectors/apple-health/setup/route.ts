// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DataSource } from "@/generated/prisma/client";
import { randomBytes } from "crypto";

const BASE_URL = process.env.NEXTAUTH_URL || "https://train2race.com";

function webhookUrlFor(secret: string) {
  return `${BASE_URL}/api/connectors/apple-health?token=${secret}`;
}

// Lets a user set up the webhook-based Apple Health sync (for "Health Auto Export" or similar
// REST-automation export apps) — the alternative to the in-app Health Connect/HealthKit bridge,
// useful on iOS for richer historical export than the live bridge's lookback window supports.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const connection = await prisma.deviceConnection.findUnique({
    where: { userId_source: { userId, source: DataSource.APPLE_HEALTH } },
    select: { status: true, webhookSecret: true, lastSyncedAt: true, lastError: true },
  });

  if (!connection) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected: connection.status === "active",
    status: connection.status,
    webhookUrl: connection.status === "active" ? webhookUrlFor(connection.webhookSecret!) : null,
    lastSyncedAt: connection.lastSyncedAt,
    lastError: connection.lastError,
  });
}

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const webhookSecret = randomBytes(24).toString("hex");
  await prisma.deviceConnection.upsert({
    where: { userId_source: { userId, source: DataSource.APPLE_HEALTH } },
    create: { userId, source: DataSource.APPLE_HEALTH, webhookSecret, status: "active" },
    update: { webhookSecret, status: "active", lastError: null },
  });

  return NextResponse.json({ webhookUrl: webhookUrlFor(webhookSecret) });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  await prisma.deviceConnection.updateMany({
    where: { userId, source: DataSource.APPLE_HEALTH },
    data: { status: "disconnected" },
  });

  return NextResponse.json({ ok: true });
}
