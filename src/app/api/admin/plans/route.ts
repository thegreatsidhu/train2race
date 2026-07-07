// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { checkRateLimit } from "@/lib/rateLimit";

function rateLimited(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  return !checkRateLimit(`admin:${ip}`, 30, 15 * 60 * 1000);
}

export async function GET(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const { searchParams } = new URL(req.url);
  const password = searchParams.get("password") || "";
  const userId = searchParams.get("userId") || "";
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const [trainingPlans, fitnessPlans] = await Promise.all([
    prisma.trainingPlan.findMany({
      where: { userId },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        race: { select: { raceName: true, raceDate: true, distanceM: true } },
        workouts: {
          select: {
            id: true, week: true, day: true, date: true,
            type: true, title: true, description: true,
            distanceKm: true, durationMin: true, completed: true,
          },
          orderBy: [{ week: "asc" }, { date: "asc" }],
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fitnessPlan.findMany({
      where: { userId },
      select: {
        id: true, goal: true, location: true, currentFitness: true,
        daysPerWeek: true, createdAt: true,
        planContent: true, nutritionContent: true, completedWorkoutIds: true,
      },
      orderBy: { createdAt: "desc" },
      take: 1,
    }),
  ]);

  return NextResponse.json({ trainingPlans, fitnessPlans });
}

export async function POST(req: NextRequest) {
  if (rateLimited(req)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const body = await req.json();
  const { password, action } = body;
  if (!(await isAdminAuthorized(password))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "toggleTrainingWorkout") {
    const { workoutId, completed } = body;
    if (!workoutId) return NextResponse.json({ error: "workoutId required" }, { status: 400 });
    const workout = await prisma.trainingWorkout.update({
      where: { id: workoutId },
      data: { completed, completedAt: completed ? new Date() : null },
      select: { id: true, completed: true, completedAt: true },
    });
    return NextResponse.json({ ok: true, workout });
  }

  if (action === "toggleFitnessWorkout") {
    const { planId, workoutId, complete } = body;
    if (!planId || !workoutId) return NextResponse.json({ error: "planId and workoutId required" }, { status: 400 });
    const plan = await prisma.fitnessPlan.findUnique({
      where: { id: planId },
      select: { completedWorkoutIds: true },
    });
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    const ids = plan.completedWorkoutIds as string[];
    const updated = complete
      ? [...new Set([...ids, workoutId])]
      : ids.filter((id: string) => id !== workoutId);
    await prisma.fitnessPlan.update({ where: { id: planId }, data: { completedWorkoutIds: updated } });
    return NextResponse.json({ ok: true, completedWorkoutIds: updated });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
