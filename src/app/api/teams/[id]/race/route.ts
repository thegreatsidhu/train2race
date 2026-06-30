// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const team = await prisma.team.findUnique({ where: { id }, select: { majorRaceId: true } });
  if (!team?.majorRaceId) return NextResponse.json({ members: [], myJoined: false });

  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: id },
    select: { userId: true, user: { select: { name: true } } },
  });
  const memberIds = teamMembers.map(m => m.userId);

  const registrations = await prisma.raceRegistration.findMany({
    where: { majorRaceId: team.majorRaceId, userId: { in: memberIds } },
    select: { userId: true },
  });
  const registeredIds = new Set(registrations.map(r => r.userId));

  const members = teamMembers
    .filter(m => registeredIds.has(m.userId))
    .map(m => ({ userId: m.userId, name: m.user.name || "Athlete" }));

  return NextResponse.json({ members, myJoined: registeredIds.has(userId) });
}
