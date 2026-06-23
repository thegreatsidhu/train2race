// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: raceId } = await params;
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const race = await prisma.raceTarget.findUnique({ where: { id: raceId, userId } });
  if (!race) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { date, type, title, description, distanceKm, durationMin } = await req.json();
  if (!date || !type || !title?.trim()) return NextResponse.json({ error: "date, type, and title are required" }, { status: 400 });

  const workoutDate = new Date(date);

  // Get or create plan
  let plan = await prisma.trainingPlan.findUnique({ where: { raceId } });
  if (!plan) {
    plan = await prisma.trainingPlan.create({
      data: { userId, raceId, startDate: workoutDate, endDate: race.raceDate },
    });
  } else if (!plan.startDate || workoutDate < new Date(plan.startDate)) {
    // Extend start date backwards if new workout is earlier
    plan = await prisma.trainingPlan.update({ where: { raceId }, data: { startDate: workoutDate } });
  }

  const startDate = plan.startDate ? new Date(plan.startDate) : workoutDate;
  startDate.setHours(0, 0, 0, 0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weekNum = Math.max(1, Math.floor((workoutDate.getTime() - startDate.getTime()) / msPerWeek) + 1);
  const dayName = workoutDate.toLocaleDateString("en-US", { weekday: "long" });

  const workout = await prisma.trainingWorkout.create({
    data: {
      planId: plan.id,
      date: workoutDate,
      week: weekNum,
      day: dayName,
      type,
      title: title.trim(),
      description: description?.trim() || "",
      distanceKm: distanceKm ? Number(distanceKm) * 1.60934 : null, // miles → km
      durationMin: durationMin ? Number(durationMin) : null,
    },
  });

  return NextResponse.json({ workout }, { status: 201 });
}
