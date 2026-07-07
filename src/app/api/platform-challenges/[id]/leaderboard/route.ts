// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeLeaderboard } from "@/lib/platformChallenge";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const myUserId = (session.user as { id: string }).id;

  const challenge = await (prisma as any).platformChallenge.findUnique({
    where: { id: challengeId },
    select: { id: true, title: true, type: true, activityFilter: true, startDate: true, endDate: true, status: true },
  });
  if (!challenge) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const participants = await (prisma as any).platformChallengeParticipant.findMany({
    where: { challengeId, optedOut: false },
    select: { userId: true },
  });
  const participantIds = participants.map((p: any) => p.userId);

  const entries = await computeLeaderboard(challenge, participantIds, true);

  return NextResponse.json({
    entries: entries.map((e, i) => ({
      rank: i + 1,
      userId: e.userId,
      name: e.name,
      score: e.score,
      stat: e.stat,
      isMe: e.userId === myUserId,
      dateOfBirth: (e as any).dateOfBirth ?? null,
    })),
  });
}
