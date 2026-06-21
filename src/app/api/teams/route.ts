// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
function generateInviteCode(){return Math.random().toString(36).substring(2,8).toUpperCase();}
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { name, description, majorRaceId } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Team name required" }, { status: 400 });
  const team = await prisma.team.create({ data: { name: name.trim(), description: description||null, majorRaceId: majorRaceId||null, inviteCode: generateInviteCode(), createdBy: userId, members: { create: { userId, role: "admin" } } }, include: { members: true, majorRace: { select: { name: true } } } });
  return NextResponse.json({ team }, { status: 201 });
}
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const teams = await prisma.team.findMany({ where: { members: { some: { userId } } }, include: { majorRace: { select: { id: true, name: true, raceDate: true } }, _count: { select: { members: true } }, members: { where: { userId }, select: { role: true } } }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ teams });
}
