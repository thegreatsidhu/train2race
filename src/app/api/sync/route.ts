// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncConnection } from "@/lib/sync/engine";

export async function POST(req: NextRequest) {
  const serverUserId = req.headers.get("x-user-id");
  let userId;
  if (serverUserId) {
    userId = serverUserId;
  } else {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = session.user.id;
  }
  const body = await req.json().catch(() => ({}));
  const { source } = body;
  const recentSync = await prisma.deviceConnection.findFirst({
    where: { userId, ...(source ? { source } : {}), lastSyncedAt: { gte: new Date(Date.now()-15*60*1000) } },
    select: { id: true, lastSyncedAt: true },
  });
  if (recentSync) return NextResponse.json({ ok: true, skipped: true, message: "Synced recently", lastSyncedAt: recentSync.lastSyncedAt });
  const connections = await prisma.deviceConnection.findMany({
    where: { userId, status: "active", ...(source ? { source } : {}), NOT: { source: "APPLE_HEALTH" } },
    select: { id: true, source: true },
  });
  if (connections.length === 0) return NextResponse.json({ ok: true, synced: 0, message: "No active connections" });
  const results = await Promise.allSettled(connections.map(c => syncConnection(c.id)));
  const synced = results.filter(r => r.status === "fulfilled" && r.value.ok).length;
  return NextResponse.json({ ok: true, synced, failed: results.length - synced, sources: connections.map(c => c.source) });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const connections = await prisma.deviceConnection.findMany({ where: { userId }, select: { source: true, status: true, lastSyncedAt: true, lastError: true } });
  return NextResponse.json({ connections });
}
