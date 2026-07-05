// @ts-nocheck
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { raceName, raceDate, distanceM, goalTimeSec, raceType, weeklyMileageKm, recentRaceTime, trainingDaysPerWeek, isTriathlon } = body;

  if (!raceName || !raceDate || !distanceM) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.raceTarget.findFirst({ where: { userId } });
  if (existing) {
    return NextResponse.json({ error: "You can only have one race plan at a time. Delete your current race first." }, { status: 409 });
  }

  const race = await prisma.raceTarget.create({
    data: {
      userId,
      raceName,
      raceDate: new Date(raceDate),
      distanceM,
      goalTimeSec: goalTimeSec || null,
      raceType: raceType || "main",
      weeklyMileageKm: weeklyMileageKm || null,
      recentRaceTime: recentRaceTime || null,
      trainingDaysPerWeek: trainingDaysPerWeek || 5,
      isTriathlon: isTriathlon || false,
    },
  });

  // Reset plan generation count so the user gets fresh attempts for the new race
  await prisma.user.update({ where: { id: userId }, data: { planGenerationCount: 0 } });

  return NextResponse.json({ race }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const races = await prisma.raceTarget.findMany({
    where: { userId },
    orderBy: { raceDate: "asc" },
    include: {
      trainingPlan: {
        select: {
          id: true,
          _count: { select: { workouts: true } },
          workouts: { where: { date: { lte: now } }, select: { id: true, completed: true } },
        },
      },
    },
  });

  // Silently backfill RaceRegistration for any race with a training plan that isn't registered yet
  const racesWithPlans = races.filter(r => r.trainingPlan && r.trainingPlan._count.workouts > 0);
  if (racesWithPlans.length > 0) {
    const window = 8 * 24 * 60 * 60 * 1000;
    for (const race of racesWithPlans) {
      try {
        const raceDate = new Date(race.raceDate);
        const major = await prisma.majorRace.findFirst({
          where: {
            name: { contains: race.raceName, mode: "insensitive" },
            raceDate: { gte: new Date(raceDate.getTime() - window), lte: new Date(raceDate.getTime() + window) },
          },
          select: { id: true },
        });
        if (major) {
          await prisma.raceRegistration.upsert({
            where: { userId_majorRaceId: { userId, majorRaceId: major.id } },
            update: { raceTargetId: race.id },
            create: { userId, majorRaceId: major.id, raceTargetId: race.id, isPublic: true, goalTimeSec: race.goalTimeSec ?? null },
          });
        }
      } catch (_) { /* non-fatal */ }
    }
  }

  return NextResponse.json({ races });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await prisma.raceTarget.delete({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
