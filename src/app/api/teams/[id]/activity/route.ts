// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true },
  });
  const memberIds = members.map(m => m.userId);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const activities = await prisma.activity.findMany({
    where: { userId: { in: memberIds }, startTime: { gte: sevenDaysAgo } },
    select: {
      id: true, type: true, title: true, startTime: true,
      distanceM: true, durationSec: true, userId: true, raw: true, photos: true,
      user: { select: { id: true, name: true, email: true } },
      highFives: { select: { fromUserId: true } },
    },
    orderBy: { startTime: "desc" },
    take: 40,
  });

  const formatted = activities.map(a => ({
    id: a.id,
    type: a.type,
    title: a.title,
    startTime: a.startTime.toISOString(),
    distanceM: a.distanceM,
    durationSec: a.durationSec,
    raw: a.raw,
    userId: a.userId,
    userName: a.user.name || a.user.email || "Athlete",
    isMe: a.userId === userId,
    highFiveCount: a.highFives.length,
    iHighFived: a.highFives.some(k => k.fromUserId === userId),
    photos: a.photos ?? [],
  }));

  return NextResponse.json({ activities: formatted });
}
