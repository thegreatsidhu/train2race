// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const events = await prisma.team.findMany({
    where: { isCommunity: true },
    include: {
      _count: { select: { members: true } },
      members: { where: { userId }, select: { userId: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    events: events.map(e => ({
      id: e.id,
      name: e.name,
      description: e.description,
      createdAt: e.createdAt,
      memberCount: e._count.members,
      isMember: e.members.length > 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { teamId } = await req.json();
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  const team = await prisma.team.findUnique({ where: { id: teamId, isCommunity: true } });
  if (!team) return NextResponse.json({ error: "Community not found" }, { status: 404 });

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, role: "member" },
    update: {},
  });
  return NextResponse.json({ member });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { teamId } = await req.json();
  if (!teamId) return NextResponse.json({ error: "teamId required" }, { status: 400 });

  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
  return NextResponse.json({ ok: true });
}
