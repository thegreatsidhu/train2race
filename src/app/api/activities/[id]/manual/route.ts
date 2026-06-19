import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session!.user as { id: string }).id;

  const { type, title, date, durationMin, distanceKm, notes } = await req.json();

  await prisma.activity.create({
    data: {
      userId,
      source: "MANUAL",
      externalId: `manual-${userId}-${Date.now()}`,
      type,
      title: title || type,
      startTime: new Date(date),
      durationSec: Math.round(Number(durationMin) * 60),
      distanceM: distanceKm ? Number(distanceKm) * 1000 : null,
      raw: notes ? { notes } : null,
    },
  });

  return NextResponse.json({ ok: true });
}
