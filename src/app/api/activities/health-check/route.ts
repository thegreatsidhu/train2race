// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Given a batch of health-bridge workout ids (see getRecentWorkouts() in src/lib/median.ts),
// returns which ones the user has already imported, so the "last 3 workouts" picker can skip them.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { externalIds } = await req.json().catch(() => ({ externalIds: [] }));
  if (!Array.isArray(externalIds) || externalIds.length === 0) {
    return NextResponse.json({ imported: [] });
  }

  const existing = await prisma.activity.findMany({
    where: { userId, source: "HEALTH_BRIDGE", externalId: { in: externalIds.filter((id) => typeof id === "string") } },
    select: { externalId: true },
  });

  return NextResponse.json({ imported: existing.map((a) => a.externalId) });
}
