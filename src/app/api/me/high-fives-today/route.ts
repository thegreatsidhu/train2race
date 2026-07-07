// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [rawHighFives, rawComments] = await Promise.all([
    (prisma as any).highFive.findMany({
      where: { activity: { userId }, createdAt: { gte: since } },
      select: {
        id: true,
        fromUserId: true,
        createdAt: true,
        fromUser: { select: { name: true } },
        activity: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    (prisma as any).activityComment.findMany({
      where: {
        activity: { userId },
        userId: { not: userId },
        isDeleted: false,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
        user: { select: { name: true } },
        activity: { select: { id: true, title: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  if (rawHighFives.length === 0 && rawComments.length === 0) {
    return NextResponse.json({ highFives: [], comments: [], linkTeamId: null });
  }

  // Find a shared team with any interactor for the link destination
  const interactorIds = [
    ...new Set([
      ...rawHighFives.map((hf: any) => hf.fromUserId),
      ...rawComments.map((c: any) => c.userId),
    ]),
  ];
  const sharedMembership = await (prisma as any).teamMember.findFirst({
    where: {
      userId: { in: interactorIds },
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

  const comments = rawComments.map((c: any) => ({
    id: c.id,
    fromUserId: c.userId,
    createdAt: c.createdAt,
    fromName: c.user?.name || "A teammate",
    activityId: c.activity.id,
    activityTitle: c.activity.title || c.activity.type || "workout",
    preview: c.content.length > 40 ? c.content.slice(0, 40) + "…" : c.content,
  }));

  return NextResponse.json({ highFives, comments, linkTeamId });
}
