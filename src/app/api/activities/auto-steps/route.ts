// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MIN_STEPS = 500;

// Silently logs a completed day's step count as a "Walk" activity, called by
// DailyStepsAutoLog.tsx when the app detects a day (never today) that hasn't been recorded yet.
// Separate from /api/activities/manual since that route requires a positive duration, which a
// pure steps-for-the-day entry doesn't have.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { date, steps } = await req.json().catch(() => ({}));
  const stepCount = Number(steps);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(stepCount) || stepCount < MIN_STEPS) {
    return NextResponse.json({ error: "Invalid date or steps" }, { status: 400 });
  }

  const startTime = new Date(date + "T12:00:00");
  if (isNaN(startTime.getTime())) return NextResponse.json({ error: "Invalid date" }, { status: 400 });

  const externalId = `steps_${date}`;
  const data = {
    userId,
    source: "HEALTH_BRIDGE",
    externalId,
    type: "walk",
    title: "Daily Steps",
    startTime,
    durationSec: 0,
    distanceM: null,
    raw: { steps: Math.round(stepCount) },
  };

  await prisma.activity.upsert({
    where: { source_externalId: { source: "HEALTH_BRIDGE", externalId } },
    create: data,
    update: data,
  });

  return NextResponse.json({ ok: true });
}
