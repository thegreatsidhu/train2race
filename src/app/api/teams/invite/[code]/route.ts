// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const team = await prisma.team.findUnique({
    where: { inviteCode: code },
    select: {
      id: true,
      name: true,
      description: true,
      isPrivate: true,
      _count: { select: { members: true } },
      majorRace: { select: { name: true, raceDate: true } },
    },
  });
  if (!team) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });
  return NextResponse.json({ team });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const team = await prisma.team.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!team) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: team.id, userId } } });
  if (existing) return NextResponse.json({ teamId: team.id, alreadyMember: true });

  await prisma.teamMember.create({ data: { teamId: team.id, userId, role: "member" } });
  return NextResponse.json({ teamId: team.id });
}
