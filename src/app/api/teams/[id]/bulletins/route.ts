// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isSuperUser } from "@/lib/superuser";

async function isCaptain(teamId: string, userId: string) {
  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  return member?.role === "admin";
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!isMember && !isSuperUser(session.user.email)) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const bulletins = await prisma.teamBulletin.findMany({
    where: { teamId: id },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ bulletins });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canPost = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canPost) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { title, content, isPinned } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Content required" }, { status: 400 });

  const bulletin = await prisma.teamBulletin.create({
    data: { teamId: id, userId, title: title?.trim() || null, content: content.trim(), isPinned: !!isPinned },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ bulletin });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canEdit = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canEdit) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { bulletinId, isPinned } = await req.json();
  const bulletin = await prisma.teamBulletin.update({ where: { id: bulletinId }, data: { isPinned } });
  return NextResponse.json({ bulletin });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canDelete = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canDelete) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { bulletinId } = await req.json();
  await prisma.teamBulletin.delete({ where: { id: bulletinId } });
  return NextResponse.json({ ok: true });
}
