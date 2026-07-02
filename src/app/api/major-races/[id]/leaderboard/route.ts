// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: majorRaceId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const communityRegs = await prisma.raceRegistration.findMany({
    where: { majorRaceId, isPublic: true },
    select: { userId: true, raceTargetId: true, user: { select: { name: true } } },
    take: 20,
  });

  const raceTargetIds = communityRegs.map(r => r.raceTargetId).filter(Boolean) as string[];

  let progressMap: Record<string, { total: number; done: number }> = {};
  if (raceTargetIds.length > 0) {
    const plans = await prisma.trainingPlan.findMany({
      where: { raceId: { in: raceTargetIds } },
      select: { id: true, raceId: true, _count: { select: { workouts: true } } },
    });
    const planIds = plans.map(p => p.id);
    const doneCounts = planIds.length > 0
      ? await prisma.trainingWorkout.groupBy({
          by: ["planId"],
          where: { planId: { in: planIds }, completed: true },
          _count: { planId: true },
        })
      : [];
    const doneMap = Object.fromEntries(doneCounts.map(c => [c.planId, c._count.planId]));
    progressMap = Object.fromEntries(
      plans.map(p => [p.raceId, { total: p._count.workouts, done: doneMap[p.id] || 0 }])
    );
  }

  const entries = communityRegs.map(r => {
    const prog = r.raceTargetId ? progressMap[r.raceTargetId] : null;
    return {
      userId: r.userId,
      name: r.user.name || "Athlete",
      isMe: r.userId === userId,
      hasPlan: !!(prog && prog.total > 0),
      pct: prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0,
    };
  }).sort((a, b) => b.pct - a.pct).slice(0, 8);

  return NextResponse.json({ entries, count: communityRegs.length });
}
