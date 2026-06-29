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

  const events = await prisma.teamEvent.findMany({
    where: { teamId: id },
    orderBy: { eventDate: "asc" },
    take: 50,
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canPost = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canPost) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { title, description, eventDate, location, link } = await req.json();
  if (!title?.trim() || !eventDate) return NextResponse.json({ error: "Title and date required" }, { status: 400 });

  const event = await prisma.teamEvent.create({
    data: {
      teamId: id, userId,
      title: title.trim(),
      description: description?.trim() || null,
      eventDate: new Date(eventDate),
      location: location?.trim() || null,
      link: link?.trim() || null,
    },
    include: { user: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ event });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canDelete = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canDelete) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { eventId } = await req.json();
  await prisma.teamEvent.delete({ where: { id: eventId } });
  return NextResponse.json({ ok: true });
}
