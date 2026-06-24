// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/superuser";

const MSG_INCLUDE = {
  user: { select: { id: true, name: true } },
  replyTo: { include: { user: { select: { id: true, name: true } } } },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const majorRaceId = searchParams.get("raceId");
  if (!majorRaceId) return NextResponse.json({ error: "Missing raceId" }, { status: 400 });

  const messages = await prisma.eventMessage.findMany({
    where: { majorRaceId, isDeleted: false },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: MSG_INCLUDE,
  });

  return NextResponse.json({
    messages,
    isAdmin: isSuperUser(session.user.email),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const { majorRaceId, content, replyToId } = await req.json();
  if (!majorRaceId || !content?.trim()) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const registered = await prisma.raceRegistration.findFirst({ where: { userId, majorRaceId } });
  if (!registered) return NextResponse.json({ error: "You must join this race to chat" }, { status: 403 });

  const message = await prisma.eventMessage.create({
    data: {
      majorRaceId,
      userId,
      content: content.trim(),
      ...(replyToId ? { replyToId } : {}),
    },
    include: MSG_INCLUDE,
  });
  return NextResponse.json({ message });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const admin = isSuperUser(session.user.email);
  const { messageId, majorRaceId, deleteAll } = await req.json();

  if (deleteAll && majorRaceId) {
    if (!admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    await prisma.eventMessage.updateMany({
      where: { majorRaceId, isDeleted: false },
      data: { isDeleted: true, deletedBy: userId },
    });
    return NextResponse.json({ ok: true });
  }

  if (!messageId) return NextResponse.json({ error: "messageId required" }, { status: 400 });
  const message = await prisma.eventMessage.findUnique({ where: { id: messageId } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (message.userId !== userId && !admin) return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  await prisma.eventMessage.update({ where: { id: messageId }, data: { isDeleted: true, deletedBy: userId } });
  return NextResponse.json({ ok: true });
}
