// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const plan = await prisma.fitnessPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { workoutId, workoutTitle, workoutType, durationMin } = await req.json();
  if (!workoutId) return NextResponse.json({ error: "workoutId required" }, { status: 400 });

  if ((plan.completedWorkoutIds as string[]).includes(workoutId)) {
    return NextResponse.json({ ok: true, alreadyLogged: true });
  }

  await Promise.all([
    prisma.fitnessPlan.update({
      where: { id },
      data: { completedWorkoutIds: { push: workoutId } },
    }),
    prisma.activity.create({
      data: {
        userId,
        source: "manual",
        externalId: `fitness_${id}_${workoutId}`,
        type: workoutType || "workout",
        name: workoutTitle || "Fitness Workout",
        startTime: new Date(),
        durationSeconds: (durationMin || 30) * 60,
        distanceMeters: 0,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
