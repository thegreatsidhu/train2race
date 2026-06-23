// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "1";
  const now = new Date();

  const challenges = await prisma.teamChallenge.findMany({
    where: {
      isPublic: true,
      status: "approved",
      ...(activeOnly ? { endDate: { gte: now } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          members: { select: { userId: true } },
        },
      },
      entries: { select: { userId: true, value: true } },
    },
    take: 50,
  });

  const result = challenges.map((c) => {
    const memberIds = new Set(c.team.members.map((m) => m.userId));
    const totalEntries = c.entries.length;
    const uniqueParticipants = new Set(c.entries.map((e) => e.userId)).size;
    return {
      id: c.id,
      title: c.title,
      type: c.type,
      metric: c.metric,
      unit: c.unit,
      goal: c.goal,
      startDate: c.startDate,
      endDate: c.endDate,
      description: c.description,
      teamId: c.team.id,
      teamName: c.team.name,
      participants: uniqueParticipants,
      totalEntries,
      isMember: memberIds.has(userId),
      isActive: c.endDate >= now,
    };
  });

  return NextResponse.json({ challenges: result });
}
