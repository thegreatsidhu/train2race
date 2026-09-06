// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as { id: string }).id;
    const { type, title, date, durationMin, distance, unit, notes, steps, photos, healthExternalId } = await req.json();

    if (!date || !durationMin || Number(durationMin) <= 0) {
      return NextResponse.json({ error: "Date and duration are required" }, { status: 400 });
    }

    const startTime = new Date(date + "T12:00:00");
    if (isNaN(startTime.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    let distanceM = null;
    if (distance && Number(distance) > 0) {
      const d = Number(distance);
      if (unit === "km") distanceM = d * 1000;
      else if (unit === "m") distanceM = d;
      else if (unit === "yd") distanceM = d * 0.9144;
      else distanceM = d * 1609.34;
    }

    const raw = (() => {
      const r: any = {};
      if (notes) r.notes = notes;
      if (steps && Number(steps) > 0) r.steps = Number(steps);
      return Object.keys(r).length ? r : null;
    })();

    // Imports from the "last 3 workouts" health-bridge picker are tagged with the source
    // workout's own id so re-fetching later correctly recognizes it as already imported,
    // instead of the usual per-submission synthetic id.
    const data = {
      userId,
      source: healthExternalId ? "HEALTH_BRIDGE" : "MANUAL",
      externalId: healthExternalId || `manual-${userId}-${Date.now()}`,
      type,
      title: title || type,
      startTime,
      durationSec: Math.round(Number(durationMin) * 60),
      distanceM,
      photos: Array.isArray(photos) ? photos.filter(u => typeof u === "string") : [],
      raw,
    };

    if (healthExternalId) {
      await prisma.activity.upsert({
        where: { source_externalId: { source: "HEALTH_BRIDGE", externalId: healthExternalId } },
        create: data,
        update: data,
      });
    } else {
      await prisma.activity.create({ data });
    }
    const count = await prisma.activity.count({ where: { userId } });
    return NextResponse.json({ ok: true, isFirstWorkout: count === 1 });
  } catch (err: any) {
    console.error("manual activity create error:", err);
    return NextResponse.json({ error: "Failed to save workout" }, { status: 500 });
  }
}