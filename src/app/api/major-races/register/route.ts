// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { majorRaceId, goalTimeSec, isPublic = true, raceTargetId } = await req.json();
  const reg = await prisma.raceRegistration.upsert({ where: { userId_majorRaceId: { userId, majorRaceId } }, update: { goalTimeSec, isPublic, raceTargetId }, create: { userId, majorRaceId, goalTimeSec, isPublic, raceTargetId } });
  return NextResponse.json({ registration: reg });
}
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { majorRaceId } = await req.json();
  await prisma.raceRegistration.deleteMany({ where: { userId, majorRaceId } });
  return NextResponse.json({ ok: true });
}
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const registrations = await prisma.raceRegistration.findMany({ where: { userId }, include: { majorRace: true } });
  return NextResponse.json({ registrations });
}
