// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Disconnects Apple Health / Google Health Connect at the app level. There's no bridge API to
// revoke the underlying OS permission (see openAppSettings() in src/lib/median.ts) — this just
// stops the app from reading or using that data going forward. Historical synced data is left
// alone; only future syncing (auto-logged steps, recovery/strain estimates, the workout-import
// picker) stops.
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  await prisma.user.update({ where: { id: userId }, data: { healthSyncDisabled: true } });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  await prisma.user.update({ where: { id: userId }, data: { healthSyncDisabled: false } });
  return NextResponse.json({ ok: true });
}
