// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const memberTeamIds = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  }).then(rows => rows.map(r => r.teamId));

  if (memberTeamIds.length === 0) return NextResponse.json({ challenges: [] });

  const challenges = await (prisma as any).teamChallenge.findMany({
    where: { teamId: { in: memberTeamIds }, endDate: { gte: fourteenDaysAgo }, status: "approved" },
    include: {
      team: { select: { id: true, name: true } },
      entries: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { endDate: "asc" },
    take: 10,
  });

  const enriched = challenges.map((c: any) => {
    const startDate = new Date(c.startDate);
    const endDate = new Date(c.endDate);
    const isUpcoming = startDate > now;
    const isEnded = endDate < now;
    const myEntries = c.entries.filter((e: any) => e.userId === userId);
    return {
      ...c,
      userAccepted: Array.isArray(c.acceptances) && c.acceptances.includes(userId),
      isUpcoming,
      isEnded,
      isActive: !isUpcoming && !isEnded,
      myEntries,
    };
  });

  return NextResponse.json({ challenges: enriched });
}
