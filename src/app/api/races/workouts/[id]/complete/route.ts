// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { findLikelyDuplicateActivity } from "@/lib/activities/dedupe";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const workout = await prisma.trainingWorkout.findUnique({ where: { id }, include: { plan: { select: { userId: true } } } });
  if (!workout || workout.plan.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (workout.completed) return NextResponse.json({ error: "Already logged" }, { status: 409 });

  const body = await req.json().catch(() => ({}));
  const { existingActivityId } = body;

  // "I already logged it" — link an existing activity instead of creating a new one.
  if (existingActivityId) {
    const activity = await prisma.activity.findUnique({ where: { id: existingActivityId }, select: { id: true, userId: true } });
    if (!activity || activity.userId !== userId) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    const alreadyLinked = await prisma.trainingWorkout.findFirst({ where: { activityId: existingActivityId, id: { not: id } }, select: { id: true } });
    if (alreadyLinked) return NextResponse.json({ error: "That workout is already linked to a different plan entry" }, { status: 409 });

    const updated = await prisma.trainingWorkout.update({
      where: { id },
      data: { completed: true, completedAt: new Date(), activityId: existingActivityId },
    });
    return NextResponse.json({ workout: updated });
  }

  // Otherwise, create a new activity from the log form (optionally prefilled from a matched
  // Health Connect workout via healthExternalId, same upsert-safe tagging as manual logging).
  const { feel, effort, actualDistanceMi, actualDurationMin, notes, healthExternalId, confirmDuplicate } = body;
  const startTime = workout.date;
  const durationMin = Number(actualDurationMin) || workout.durationMin || 0;
  const distanceM = actualDistanceMi ? Number(actualDistanceMi) * 1609.34 : (workout.distanceKm ? workout.distanceKm * 1000 : null);

  if (!healthExternalId && !confirmDuplicate) {
    const dup = await findLikelyDuplicateActivity(userId, startTime);
    if (dup) {
      return NextResponse.json({
        duplicate: true,
        existing: { type: dup.type, title: dup.title, startTime: dup.startTime, source: dup.source },
        error: "This looks like it might already be logged.",
      }, { status: 409 });
    }
  }

  const raw = (() => {
    const r: any = {};
    if (feel) r.feel = feel;
    if (notes) r.notes = notes;
    return Object.keys(r).length ? r : null;
  })();

  const data = {
    userId,
    source: healthExternalId ? "HEALTH_BRIDGE" : "MANUAL",
    externalId: healthExternalId || `manual-${userId}-${Date.now()}`,
    type: workout.type,
    title: workout.title,
    startTime,
    durationSec: Math.round(durationMin * 60),
    distanceM,
    perceivedEffort: effort ? Number(effort) : null,
    raw,
  };

  const activity = healthExternalId
    ? await prisma.activity.upsert({
        where: { source_externalId: { source: "HEALTH_BRIDGE", externalId: healthExternalId } },
        create: data,
        update: data,
      })
    : await prisma.activity.create({ data });

  const updated = await prisma.trainingWorkout.update({
    where: { id },
    data: { completed: true, completedAt: new Date(), activityId: activity.id },
  });

  return NextResponse.json({ workout: updated, activity });
}
