// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const teams = await prisma.team.findMany({
    where: {
      isPrivate: false,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: {
      majorRace: { select: { name: true } },
      _count: { select: { members: true } },
      members: { where: { userId }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({
    teams: teams.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      majorRace: t.majorRace,
      memberCount: t._count.members,
      isMember: t.members.length > 0,
    })),
  });
}
