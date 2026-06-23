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
  const mine = url.searchParams.get("mine") === "1";
  const now = new Date();

  // ── My Challenges: all challenges from teams I'm a member of ─────────────────
  if (mine) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true, role: true },
    });
    const teamIds = memberships.map((m) => m.teamId);
    const adminTeamIds = new Set(memberships.filter((m) => m.role === "admin").map((m) => m.teamId));

    const challenges = await prisma.teamChallenge.findMany({
      where: {
        teamId: { in: teamIds },
        ...(activeOnly ? { endDate: { gte: now } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        team: { select: { id: true, name: true } },
        entries: { select: { userId: true, value: true } },
      },
    });

    const result = challenges.map((c) => {
      const myEntries = c.entries.filter((e) => e.userId === userId);
      const myTotal = myEntries.reduce((s, e) => s + e.value, 0);
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
        status: c.status,
        teamId: c.team.id,
        teamName: c.team.name,
        participants: uniqueParticipants,
        myTotal,
        isActive: c.endDate >= now && c.status === "approved",
        isAdmin: adminTeamIds.has(c.teamId),
      };
    });

    return NextResponse.json({ challenges: result });
  }

  // ── Discover: public approved challenges ─────────────────────────────────────
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
      totalEntries: c.entries.length,
      isMember: memberIds.has(userId),
      isActive: c.endDate >= now,
    };
  });

  return NextResponse.json({ challenges: result });
}
