// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rawHighFives = await (prisma as any).highFive.findMany({
    where: {
      activity: { userId },
      createdAt: { gte: since },
    },
    select: {
      id: true,
      fromUserId: true,
      createdAt: true,
      fromUser: { select: { name: true } },
      activity: { select: { id: true, title: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (rawHighFives.length === 0) {
    return NextResponse.json({ highFives: [], linkTeamId: null });
  }

  // Find a team shared between the current user and any giver to build the link
  const giverIds = [...new Set(rawHighFives.map((hf: any) => hf.fromUserId))];
  const sharedMembership = await (prisma as any).teamMember.findFirst({
    where: {
      userId: { in: giverIds },
      team: { members: { some: { userId } } },
    },
    select: { teamId: true },
  });
  let linkTeamId = sharedMembership?.teamId ?? null;
  if (!linkTeamId) {
    const myTeam = await (prisma as any).teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
    });
    linkTeamId = myTeam?.teamId ?? null;
  }

  const highFives = rawHighFives.map((hf: any) => ({
    id: hf.id,
    fromUserId: hf.fromUserId,
    createdAt: hf.createdAt,
    fromName: hf.fromUser?.name || "A teammate",
    activityId: hf.activity.id,
    activityTitle: hf.activity.title || hf.activity.type || "workout",
  }));

  return NextResponse.json({ highFives, linkTeamId });
}
