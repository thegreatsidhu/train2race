// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!isMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  const messages = await prisma.teamMessage.findMany({ where: { teamId: id }, orderBy: { createdAt: "asc" }, take: 100, include: { user: { select: { id: true, name: true } } } });
  return NextResponse.json({ messages });
}
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;
  const isMember = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId: id, userId } } });
  if (!isMember) return NextResponse.json({ error: "Not a member" }, { status: 403 });
  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });
  const message = await prisma.teamMessage.create({ data: { teamId: id, userId, content: content.trim() }, include: { user: { select: { id: true, name: true } } } });
  return NextResponse.json({ message });
}
