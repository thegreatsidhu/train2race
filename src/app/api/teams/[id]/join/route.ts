// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;
  const userRecord = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true } });
  if (userRecord?.isBanned) return NextResponse.json({ error: "Your account has been suspended" }, { status: 403 });
  const team = await prisma.team.findUnique({ where: { id }, select: { id: true, isPrivate: true } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });
  if (team.isPrivate) return NextResponse.json({ error: "This team is private" }, { status: 403 });
  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (existing) return NextResponse.json({ teamId: id }, { status: 409 });
  await prisma.teamMember.create({ data: { teamId: id, userId, role: "member" } });
  return NextResponse.json({ teamId: id });
}
