// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — return visible platform challenges with current user's join status
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const challenges = await (prisma as any).platformChallenge.findMany({
    where: {
      OR: [
        { status: "active" },
        { status: "ended", finalAnnouncedAt: { gte: sevenDaysAgo } },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: {
      participants: { where: { userId }, select: { optedOut: true } },
      _count: { select: { participants: { where: { optedOut: false } } } },
    },
  });

  return NextResponse.json({
    challenges: challenges.map((c: any) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      activityFilter: c.activityFilter,
      badgeName: c.badgeName,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      participantCount: c._count.participants,
      isJoined: c.participants.length > 0 && !c.participants[0].optedOut,
      enrollmentLocked: c.enrollmentLocked || new Date(c.startDate) <= new Date(),
      dailyAwards: c.dailyAwards ?? null,
      finalAnnouncement: c.finalAnnouncement ?? null,
      finalAnnouncedAt: c.finalAnnouncedAt ?? null,
    })),
  });
}

// POST — join or leave
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const { challengeId, action, joinedVia } = await req.json();
  if (!challengeId || !["join", "leave"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const challenge = await (prisma as any).platformChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, status: true, startDate: true, enrollmentLocked: true },
  });
  if (!challenge || challenge.status === "ended") {
    return NextResponse.json({ error: "Challenge not found or ended" }, { status: 404 });
  }
  const enrollmentLocked = challenge.enrollmentLocked || new Date(challenge.startDate) <= new Date();
  if (action === "join" && enrollmentLocked) {
    return NextResponse.json({ error: "Enrollment closed" }, { status: 409 });
  }

  const existing = await (prisma as any).platformChallengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });

  if (action === "join") {
    if (existing) {
      await (prisma as any).platformChallengeParticipant.update({
        where: { challengeId_userId: { challengeId, userId } },
        data: { optedOut: false },
      });
    } else {
      await (prisma as any).platformChallengeParticipant.create({
        data: { challengeId, userId, joinedVia: joinedVia || "organic" },
      });
    }
  } else {
    if (existing) {
      await (prisma as any).platformChallengeParticipant.update({
        where: { challengeId_userId: { challengeId, userId } },
        data: { optedOut: true },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
