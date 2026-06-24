// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const plans = await prisma.trainingPlan.findMany({
    where: { userId },
    include: {
      race: { select: { id: true, raceName: true, raceDate: true, distanceM: true } },
      workouts: { orderBy: { date: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  const result = plans.map(plan => {
    const weekMap: Record<number, any[]> = {};
    for (const w of plan.workouts) {
      if (!weekMap[w.week]) weekMap[w.week] = [];
      weekMap[w.week].push(w);
    }
    const weeks = Object.entries(weekMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, workouts]) => ({ week: Number(week), workouts }));

    const total = plan.workouts.length;
    const done = plan.workouts.filter(w => w.completed).length;

    return {
      id: plan.id,
      raceId: plan.race.id,
      raceName: plan.race.raceName,
      raceDate: plan.race.raceDate,
      distanceM: plan.race.distanceM,
      startDate: plan.startDate,
      endDate: plan.endDate,
      totalWorkouts: total,
      completedWorkouts: done,
      weeks,
    };
  });

  return NextResponse.json({ plans: result });
}
