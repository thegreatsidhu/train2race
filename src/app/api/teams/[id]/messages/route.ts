// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/superuser";

const MSG_INCLUDE = {
  user: { select: { id: true, name: true } },
  replyTo: { include: { user: { select: { id: true, name: true } } } },
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!isMember && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const messages = await prisma.teamMessage.findMany({
    where: { teamId: id, isDeleted: false },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: MSG_INCLUDE,
  });

  return NextResponse.json({
    messages,
    isAdmin: isSuperUser(session.user.email),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!isMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { content, replyToId } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const message = await prisma.teamMessage.create({
    data: {
      teamId: id,
      userId,
      content: content.trim(),
      ...(replyToId ? { replyToId } : {}),
    },
    include: MSG_INCLUDE,
  });
  return NextResponse.json({ message });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const admin = isSuperUser(session.user.email);
  const { messageId, deleteAll } = await req.json();

  if (deleteAll) {
    if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    await prisma.teamMessage.updateMany({
      where: { teamId: id, isDeleted: false },
      data: { isDeleted: true, deletedBy: userId },
    });
    return NextResponse.json({ ok: true });
  }

  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });
  const message = await prisma.teamMessage.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.userId !== userId && !admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  await prisma.teamMessage.update({ where: { id: messageId }, data: { isDeleted: true, deletedBy: userId } });
  return NextResponse.json({ ok: true });
}
