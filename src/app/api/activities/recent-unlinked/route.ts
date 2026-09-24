// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Returns the user's own recent activities that aren't already linked to a training-plan
// workout, for the "I already logged it" picker when marking a plan workout done.
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const days = Math.min(14, Math.max(1, parseInt(url.searchParams.get("days") || "5", 10) || 5));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [activities, linked] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, startTime: { gte: since } },
      select: { id: true, type: true, title: true, startTime: true, distanceM: true, durationSec: true, source: true },
      orderBy: { startTime: "desc" },
      take: 20,
    }),
    prisma.trainingWorkout.findMany({ where: { activityId: { not: null } }, select: { activityId: true } }),
  ]);

  const linkedIds = new Set(linked.map((w) => w.activityId));
  const unlinked = activities.filter((a) => !linkedIds.has(a.id));

  return NextResponse.json({ activities: unlinked });
}
