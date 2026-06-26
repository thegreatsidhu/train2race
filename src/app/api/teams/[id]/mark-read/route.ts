// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!isMember) return NextResponse.json({ ok: true }); // not a member — no-op, not an error

  await Promise.all([
    prisma.teamMember.update({
      where: { teamId_userId: { teamId: id, userId } },
      data: { lastViewedChatAt: new Date() },
    }),
    prisma.directMessage.updateMany({
      where: { teamId: id, toUserId: userId, isRead: false },
      data: { isRead: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
