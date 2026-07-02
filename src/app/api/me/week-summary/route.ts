// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const fortyFiveDaysAgo = new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000);

  const [weeklyActivities, recentForStreak, user, activeRace] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, startTime: { gte: weekStart, lte: weekEnd } },
      select: { distanceM: true, durationSec: true, startTime: true },
    }),
    prisma.activity.findMany({
      where: { userId, startTime: { gte: fortyFiveDaysAgo } },
      select: { startTime: true },
      orderBy: { startTime: "desc" },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.raceTarget.findFirst({
      where: { userId, raceDate: { gte: today } },
      orderBy: { raceDate: "asc" },
      select: {
        raceName: true,
        raceDate: true,
        trainingPlan: {
          select: {
            workouts: {
              where: { date: { gte: weekStart, lte: weekEnd } },
              select: { completed: true },
            },
          },
        },
      },
    }),
  ]);

  // Streak: consecutive days with at least one activity ending at today
  const activityDays = new Set(
    recentForStreak.map(a => {
      const d = new Date(a.startTime);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    })
  );
  let streak = 0;
  const cursor = new Date(today);
  while (activityDays.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weeklyCount = weeklyActivities.length;
  const weeklyDistanceM = weeklyActivities.reduce((s, a) => s + (a.distanceM || 0), 0);
  const weeklyDurationSec = weeklyActivities.reduce((s, a) => s + (a.durationSec || 0), 0);

  const planWorkouts = activeRace?.trainingPlan?.workouts || [];
  const planTotal = planWorkouts.length;
  const planDone = planWorkouts.filter((w: any) => w.completed).length;

  return NextResponse.json({
    name: user?.name?.split(" ")[0] || null,
    streak,
    weeklyCount,
    weeklyMiles: parseFloat((weeklyDistanceM / 1609.34).toFixed(1)),
    weeklyHours: parseFloat((weeklyDurationSec / 3600).toFixed(1)),
    planTotal,
    planDone,
    raceName: activeRace?.raceName || null,
  });
}
