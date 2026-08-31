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

  const challengeId = req.nextUrl.searchParams.get("challenge");
  let challenge = null;
  if (challengeId) {
    challenge = await prisma.teamChallenge.findFirst({
      where: { id: challengeId, teamId: team.id },
      select: { id: true, title: true, type: true, metric: true, unit: true, goal: true, goalPerDay: true, startDate: true, endDate: true, status: true },
    });
  }

  return NextResponse.json({ team, challenge });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { challengeId } = await req.json().catch(() => ({ challengeId: undefined }));

  const team = await prisma.team.findUnique({ where: { inviteCode: code }, select: { id: true } });
  if (!team) return NextResponse.json({ error: "Invalid invite link" }, { status: 404 });

  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: team.id, userId } } });
  if (!existing) {
    await prisma.teamMember.create({ data: { teamId: team.id, userId, role: "member" } });
  }

  let challengeJoined = false;
  let challengeError: string | undefined;
  if (challengeId) {
    const challenge = await prisma.teamChallenge.findFirst({ where: { id: challengeId, teamId: team.id } });
    if (!challenge) {
      challengeError = "That challenge invite is no longer valid.";
    } else if (challenge.acceptances.includes(userId)) {
      challengeJoined = true;
    } else {
      await prisma.teamChallenge.update({ where: { id: challenge.id }, data: { acceptances: { push: userId } } });
      challengeJoined = true;
    }
  }

  return NextResponse.json({ teamId: team.id, alreadyMember: !!existing, challengeJoined, challengeError });
}
