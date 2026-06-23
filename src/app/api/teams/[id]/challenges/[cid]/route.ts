// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member || member.role !== "admin") return NextResponse.json({ error: "Admins only" }, { status: 403 });

  const challenge = await prisma.teamChallenge.findUnique({ where: { id: cid } });
  if (!challenge || challenge.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teamChallenge.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}
