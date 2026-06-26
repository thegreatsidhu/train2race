// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const otherActive = await prisma.teamChallengeEntry.findFirst({
    where: {
      userId,
      challengeId: { not: challengeId },
      challenge: { teamId, endDate: { gte: new Date() }, status: "approved" },
    },
  });
  if (otherActive) {
    return NextResponse.json({ error: "You are already participating in another active challenge in this team." }, { status: 409 });
  }

  const { value, date, note } = await req.json();
  if (!value || !date) return NextResponse.json({ error: "value and date are required" }, { status: 400 });
  const numVal = Number(value);
  if (isNaN(numVal) || numVal <= 0) return NextResponse.json({ error: "Value must be a positive number" }, { status: 400 });

  const challenge = await prisma.teamChallenge.findUnique({ where: { id: challengeId } });
  if (!challenge || challenge.teamId !== teamId) return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  if (challenge.status !== "approved") return NextResponse.json({ error: "Challenge is not active" }, { status: 400 });
  const now = new Date();
  if (now < challenge.startDate || now > challenge.endDate) return NextResponse.json({ error: "Challenge is not currently running" }, { status: 400 });

  const entry = await prisma.teamChallengeEntry.create({
    data: {
      challengeId,
      userId,
      value: numVal,
      date: new Date(date),
      note: note?.trim() || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId") || userId;

  if (targetUserId !== userId) {
    const [member, team] = await Promise.all([
      prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } }),
      prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } }),
    ]);
    if (member?.role !== "admin" && team?.createdBy !== userId) {
      return NextResponse.json({ error: "Admins only" }, { status: 403 });
    }
  } else {
    const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
    if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  await prisma.teamChallengeEntry.deleteMany({ where: { challengeId, userId: targetUserId } });
  return NextResponse.json({ ok: true });
}
