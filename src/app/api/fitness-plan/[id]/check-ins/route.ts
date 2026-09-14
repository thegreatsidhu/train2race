// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { evaluateWeightCheckIn, calorieFloor } from "@/lib/health/weightLoss";

const ADJUSTMENT_KCAL = 150;

export async function GET(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const plan = await prisma.fitnessPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const checkIns = await prisma.weightCheckIn.findMany({
    where: { fitnessPlanId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ checkIns });
}

export async function POST(req, { params }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;
  const { id } = await params;

  const plan = await prisma.fitnessPlan.findUnique({ where: { id } });
  if (!plan || plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (plan.goal !== "Lose weight") {
    return NextResponse.json({ error: "Weight check-ins are only available on a weight-loss plan." }, { status: 400 });
  }

  const { weightKg: rawWeightKg, source } = await req.json();
  const weightKg = Number(rawWeightKg);
  if (!weightKg || isNaN(weightKg) || weightKg < 10 || weightKg > 500) {
    return NextResponse.json({ error: "Weight must be between 10 and 500 kg" }, { status: 400 });
  }

  const recent = await prisma.weightCheckIn.findMany({
    where: { fitnessPlanId: id },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  const previousWeightKg = recent[0]?.weightKg ?? plan.startWeightKg;
  if (previousWeightKg == null) {
    return NextResponse.json({ error: "No starting weight on record for this plan." }, { status: 400 });
  }
  // The baseline previousWeightKg's own weekly delta was measured against — needed to detect
  // 2 consecutive >1%-of-bodyweight weeks. Falls back to the plan's start weight when only one
  // prior check-in exists yet, and to null (skip the sustained-rate check) when there's none.
  const priorWeightKg = recent[0] ? (recent[1]?.weightKg ?? plan.startWeightKg) : null;

  const evaluation = evaluateWeightCheckIn({
    previousWeightKg,
    currentWeightKg: weightKg,
    priorWeightKg,
  });

  const checkIn = await prisma.weightCheckIn.create({
    data: {
      fitnessPlanId: id,
      userId,
      weightKg,
      source: source === "connected" ? "connected" : "manual",
      severity: evaluation.severity,
      message: evaluation.message,
    },
  });

  let updatedPlan = plan;
  if (evaluation.suggestAdjustment && plan.dailyCalorieTarget != null && plan.bmr != null) {
    const floor = calorieFloor(plan.bmr);
    const nextTarget = Math.max(floor, plan.dailyCalorieTarget - ADJUSTMENT_KCAL);
    const note = nextTarget < plan.dailyCalorieTarget
      ? `No weight change this week, so we've nudged your daily calorie target down to ${nextTarget} kcal to help restart progress. This is a suggestion — adjust based on how you feel.`
      : `No weight change this week. Your calorie target is already at a safe minimum, so consider adding a bit more activity instead of cutting calories further.`;
    updatedPlan = await prisma.fitnessPlan.update({
      where: { id },
      data: { dailyCalorieTarget: nextTarget, lastAdjustmentNote: note },
    });
  }

  return NextResponse.json({ checkIn, plan: updatedPlan, evaluation });
}
