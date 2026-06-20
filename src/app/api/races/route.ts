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

  const existing = await prisma.raceTarget.findFirst({
    where: { userId, raceName, raceDate: new Date(raceDate) },
  });
  if (existing) {
    return NextResponse.json({ error: "You already have a race with this name and date." }, { status: 409 });
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

  return NextResponse.json({ race }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const races = await prisma.raceTarget.findMany({ where: { userId }, orderBy: { raceDate: "asc" } });
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
