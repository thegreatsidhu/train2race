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
  const registrations = await prisma.raceRegistration.findMany({
    where: { majorRaceId, isPublic: true },
    include: { user: { select: { id: true, name: true, raceTargets: { include: { trainingPlan: { select: { workouts: { select: { completed: true, distanceKm: true, date: true } } } } }, take: 1, orderBy: { createdAt: "desc" } } } } },
    orderBy: { createdAt: "asc" },
  });
  const community = registrations.map(reg => {
    const plan = reg.user.raceTargets[0]?.trainingPlan;
    const workouts = plan?.workouts ?? [];
    const total = workouts.length;
    const done = workouts.filter(w => w.completed).length;
    const weeklyMiles = workouts.filter(w => { const d = new Date(w.date); const now = new Date(); const weekAgo = new Date(now.getTime()-7*24*60*60*1000); return d>=weekAgo&&d<=now&&w.completed&&w.distanceKm; }).reduce((sum,w)=>sum+(w.distanceKm||0)/1.60934,0);
    return { userId: reg.user.id, name: reg.user.name||"Anonymous", isMe: reg.userId===userId, goalTimeSec: reg.goalTimeSec, totalWorkouts: total, doneWorkouts: done, pct: total>0?Math.round((done/total)*100):0, weeklyMiles: Math.round(weeklyMiles*10)/10 };
  }).sort((a,b)=>b.pct-a.pct);
  return NextResponse.json({ community });
}
