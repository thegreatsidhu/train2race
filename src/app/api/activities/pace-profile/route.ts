// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Returns the user's own typical pace per activity type, from their logged history — used to
// personalize guessing a Health Bridge-synced workout's type (run vs. ride vs. walk), since a
// fast runner and a casual cyclist can have near-identical average speeds and no fixed threshold
// separates everyone correctly. Only types with at least 2 data points are included, to avoid a
// single odd outlier skewing the guess.
const RELEVANT_TYPES = ["run", "ride", "walk", "swim"];

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const activities = await prisma.activity.findMany({
    where: { userId, type: { in: RELEVANT_TYPES }, distanceM: { not: null, gt: 0 }, durationSec: { gt: 0 } },
    select: { type: true, distanceM: true, durationSec: true },
    take: 500,
  });

  const byType = new Map<string, number[]>();
  for (const a of activities) {
    const speedMps = a.distanceM / a.durationSec;
    if (!byType.has(a.type)) byType.set(a.type, []);
    byType.get(a.type).push(speedMps);
  }

  const profile = [...byType.entries()]
    .filter(([, speeds]) => speeds.length >= 2)
    .map(([type, speeds]) => ({ type, avgSpeedMps: speeds.reduce((s, v) => s + v, 0) / speeds.length }));

  return NextResponse.json({ profile });
}
