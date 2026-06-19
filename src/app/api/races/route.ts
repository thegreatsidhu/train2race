import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const RaceSchema = z.object({
  raceName: z.string().min(1).max(120),
  raceDate: z.string(), // ISO date string from <input type="date">
  distanceM: z.number().positive(),
  goalTimeSec: z.number().positive().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const parsed = RaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const race = await prisma.raceTarget.create({
    data: {
      userId,
      raceName: parsed.data.raceName,
      raceDate: new Date(parsed.data.raceDate),
      distanceM: parsed.data.distanceM,
      goalTimeSec: parsed.data.goalTimeSec,
    },
  });

  return NextResponse.json({ race }, { status: 201 });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const races = await prisma.raceTarget.findMany({ where: { userId }, orderBy: { raceDate: "asc" } });
  return NextResponse.json({ races });
}
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await req.json();
  await prisma.raceTarget.delete({ where: { id, userId } });
  return NextResponse.json({ ok: true });
}
