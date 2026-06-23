// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { value, date, note } = await req.json();
  if (!value || !date) return NextResponse.json({ error: "value and date are required" }, { status: 400 });

  const entry = await prisma.teamChallengeEntry.create({
    data: {
      challengeId,
      userId,
      value: Number(value),
      date: new Date(date),
      note: note?.trim() || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ entry }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid: challengeId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  await prisma.teamChallengeEntry.deleteMany({ where: { challengeId, userId } });
  return NextResponse.json({ ok: true });
}
