// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { newDate } = await req.json();
  if (!newDate) return NextResponse.json({ error: "Missing newDate" }, { status: 400 });
  const workout = await prisma.trainingWorkout.findUnique({ where: { id }, include: { plan: { select: { userId: true } } } });
  if (!workout || workout.plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workout.completed) return NextResponse.json({ error: "Cannot move a completed workout" }, { status: 400 });
  const date = new Date(newDate);
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const dayName = dayNames[date.getDay()];
  const updated = await prisma.trainingWorkout.update({ where: { id }, data: { date, day: dayName } });
  return NextResponse.json({ workout: updated });
}
