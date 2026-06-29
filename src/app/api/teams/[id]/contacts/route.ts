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

  const contacts = await prisma.teamContact.findMany({
    where: { teamId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ contacts });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canPost = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canPost) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { label, value, type } = await req.json();
  if (!label?.trim() || !value?.trim()) return NextResponse.json({ error: "Label and value required" }, { status: 400 });

  const contact = await prisma.teamContact.create({
    data: { teamId: id, label: label.trim(), value: value.trim(), type: type || "text" },
  });
  return NextResponse.json({ contact });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const canDelete = isSuperUser(session.user.email) || await isCaptain(id, userId);
  if (!canDelete) return NextResponse.json({ error: "Captains only" }, { status: 403 });

  const { contactId } = await req.json();
  await prisma.teamContact.delete({ where: { id: contactId } });
  return NextResponse.json({ ok: true });
}
