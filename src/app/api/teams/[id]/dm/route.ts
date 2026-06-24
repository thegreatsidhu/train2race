// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/teams/[id]/dm?withUserId=xxx — fetch thread between current user and another member
// GET /api/teams/[id]/dm — fetch all DM threads the current user is part of in this team
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const withUserId = searchParams.get("withUserId");

  if (withUserId) {
    // Mark incoming messages as read
    await prisma.directMessage.updateMany({
      where: { teamId, fromUserId: withUserId, toUserId: userId, isRead: false },
      data: { isRead: true },
    });

    const messages = await prisma.directMessage.findMany({
      where: {
        teamId,
        OR: [
          { fromUserId: userId, toUserId: withUserId },
          { fromUserId: withUserId, toUserId: userId },
        ],
      },
      include: { fromUser: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ messages });
  }

  // List all threads: unique conversation partners
  const sent = await prisma.directMessage.findMany({
    where: { teamId, fromUserId: userId },
    include: { toUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const received = await prisma.directMessage.findMany({
    where: { teamId, toUserId: userId },
    include: { fromUser: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const threadMap = new Map<string, { userId: string; name: string; lastMessage: string; lastAt: Date; unread: number }>();
  for (const m of received) {
    const key = m.fromUserId;
    if (!threadMap.has(key)) threadMap.set(key, { userId: m.fromUser.id, name: m.fromUser.name ?? "?", lastMessage: m.content, lastAt: m.createdAt, unread: 0 });
    if (!m.isRead) threadMap.get(key)!.unread++;
  }
  for (const m of sent) {
    const key = m.toUserId;
    if (!threadMap.has(key)) threadMap.set(key, { userId: m.toUser.id, name: m.toUser.name ?? "?", lastMessage: m.content, lastAt: m.createdAt, unread: 0 });
  }

  const threads = Array.from(threadMap.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  return NextResponse.json({ threads });
}

// POST /api/teams/[id]/dm — send a direct message { toUserId, content }
// Only captains (role=admin or createdBy) can initiate; anyone in a thread can reply
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!membership) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const { toUserId, content } = await req.json();
  if (!toUserId || !content?.trim()) return NextResponse.json({ error: "toUserId and content required" }, { status: 400 });

  // Check if recipient is a team member
  const recipientMembership = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId: toUserId } } });
  if (!recipientMembership) return NextResponse.json({ error: "Recipient is not a team member" }, { status: 400 });

  const isCaptain = membership.role === "admin" || team.createdBy === userId;

  // Check if a thread already exists between these two users
  const existingThread = await prisma.directMessage.findFirst({
    where: {
      teamId,
      OR: [
        { fromUserId: userId, toUserId },
        { fromUserId: toUserId, toUserId: userId },
      ],
    },
  });

  // Only captains can start new threads; existing thread participants can reply
  if (!existingThread && !isCaptain) {
    return NextResponse.json({ error: "Only captains can start new conversations" }, { status: 403 });
  }

  const message = await prisma.directMessage.create({
    data: { teamId, fromUserId: userId, toUserId, content: content.trim() },
    include: { fromUser: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ message });
}
