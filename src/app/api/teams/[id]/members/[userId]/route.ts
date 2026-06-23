// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/teams/[id]/members/[userId] — change a member's role
// Only the team creator (original admin who created the team) can promote/demote
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id: teamId, userId: targetUserId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requesterId = (session.user as { id: string }).id;

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (team.createdBy !== requesterId) return NextResponse.json({ error: "Only the team creator can change roles" }, { status: 403 });
  if (targetUserId === requesterId) return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });

  const { role } = await req.json();
  if (role !== "admin" && role !== "member") return NextResponse.json({ error: "Role must be admin or member" }, { status: 400 });

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: targetUserId } } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  await prisma.teamMember.update({ where: { teamId_userId: { teamId, userId: targetUserId } }, data: { role } });
  return NextResponse.json({ ok: true, role });
}
