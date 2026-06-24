// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const challenges = await prisma.teamChallenge.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    include: {
      entries: { include: { user: { select: { id: true, name: true } } } },
    },
  });
  return NextResponse.json({ challenges });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const member = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const existingActive = await prisma.teamChallenge.findFirst({
    where: { teamId, endDate: { gte: new Date() } },
    select: { id: true, title: true },
  });
  if (existingActive) {
    return NextResponse.json({ error: `This team already has an active challenge ("${existingActive.title}"). It must end before a new one can be created.` }, { status: 409 });
  }

  const { title, type, metric, unit, goal, startDate, endDate, description, isPublic } = await req.json();
  if (!title?.trim() || !type || !metric || !unit || !startDate || !endDate) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const challenge = await prisma.teamChallenge.create({
    data: {
      teamId,
      createdBy: userId,
      title: title.trim(),
      type,
      metric,
      unit,
      goal: goal ? Number(goal) : null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description: description?.trim() || null,
      isPublic: isPublic === true,
      status: member.role === "admin" ? "approved" : "pending",
    },
  });
  return NextResponse.json({ challenge }, { status: 201 });
}
