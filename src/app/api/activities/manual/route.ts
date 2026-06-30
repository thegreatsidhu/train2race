// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;
  const { type, title, date, durationMin, distance, unit, notes } = await req.json();

  let distanceM = null;
  if (distance) {
    const d = Number(distance);
    if (unit === "km") distanceM = d * 1000;
    else if (unit === "m") distanceM = d;
    else if (unit === "yd") distanceM = d * 0.9144;
    else distanceM = d * 1609.34;
  }

  await prisma.activity.create({
    data: {
      userId,
      source: "MANUAL",
      externalId: `manual-${userId}-${Date.now()}`,
      type,
      title: title || type,
      startTime: new Date(date),
      durationSec: Math.round(Number(durationMin) * 60),
      distanceM,
      raw: notes ? { notes } : null,
    },
  });
  return NextResponse.json({ ok: true });
}