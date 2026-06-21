// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { inviteCode } = await req.json();
  if (!inviteCode) return NextResponse.json({ error: "Invite code required" }, { status: 400 });
  const team = await prisma.team.findUnique({ where: { inviteCode: inviteCode.toUpperCase() } });
  if (!team) return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: team.id, userId } } });
  if (existing) return NextResponse.json({ error: "Already a member", teamId: team.id }, { status: 409 });
  await prisma.teamMember.create({ data: { teamId: team.id, userId, role: "member" } });
  return NextResponse.json({ ok: true, teamId: team.id });
}
