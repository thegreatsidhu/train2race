// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const memberTeamIds = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  }).then(rows => rows.map(r => r.teamId));

  if (memberTeamIds.length === 0) return NextResponse.json({ challenges: [] });

  const challenges = await (prisma as any).teamChallenge.findMany({
    where: { teamId: { in: memberTeamIds }, endDate: { gte: today }, status: "approved" },
    include: {
      team:    { select: { id: true, name: true } },
      entries: { where: { userId }, select: { value: true } },
    },
    orderBy: { endDate: "asc" },
    take: 10,
  });

  return NextResponse.json({ challenges });
}
