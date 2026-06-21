// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const majorRaceId = searchParams.get("raceId");
  if (!majorRaceId) return NextResponse.json({ error: "Missing raceId" }, { status: 400 });
  const now = new Date();
  const weekAgo = new Date(now.getTime()-7*24*60*60*1000);
  const registrations = await prisma.raceRegistration.findMany({
    where: { majorRaceId, isPublic: true },
    select: { userId: true, goalTimeSec: true, user: { select: { id: true, name: true, trainingPlans: { take: 1, orderBy: { createdAt: "desc" }, select: { _count: { select: { workouts: true } }, workouts: { select: { completed: true, distanceKm: true, date: true }, where: { OR: [{ completed: true }, { date: { gte: weekAgo } }] } } } } } } },
    orderBy: { createdAt: "asc" },
  });
  const community = registrations.map(reg => {
    const plan = reg.user.trainingPlans[0];
    const workouts = plan?.workouts??[];
    const total = plan?._count?.workouts??0;
    const done = workouts.filter(w=>w.completed).length;
    const weeklyMiles = workouts.filter(w=>w.completed&&w.distanceKm&&new Date(w.date)>=weekAgo).reduce((sum,w)=>sum+(w.distanceKm||0)/1.60934,0);
    return { userId: reg.user.id, name: reg.user.name||"Anonymous", isMe: reg.userId===userId, goalTimeSec: reg.goalTimeSec, totalWorkouts: total, doneWorkouts: done, pct: total>0?Math.round((done/total)*100):0, weeklyMiles: Math.round(weeklyMiles*10)/10 };
  }).sort((a,b)=>b.pct-a.pct);
  return NextResponse.json({ community }, { headers: { "Cache-Control": "private, max-age=300" } });
}
