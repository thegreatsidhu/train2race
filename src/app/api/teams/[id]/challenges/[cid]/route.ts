// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [member, team, challenge] = await Promise.all([
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } }),
    prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } }),
    prisma.teamChallenge.findUnique({ where: { id: cid } }),
  ]);

  const isCaptain = team?.createdBy === userId;
  const isAdmin = member?.role === "admin";
  if (!isCaptain && !isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!challenge || challenge.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.teamChallengeEntry.deleteMany({ where: { challengeId: cid } });
  await prisma.teamChallenge.delete({ where: { id: cid } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id: teamId, cid } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as { id: string }).id;

  const [member, team, challenge] = await Promise.all([
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } }),
    prisma.team.findUnique({ where: { id: teamId }, select: { createdBy: true } }),
    prisma.teamChallenge.findUnique({ where: { id: cid } }),
  ]);

  const isCaptain = team?.createdBy === userId;
  const isAdmin = member?.role === "admin";
  if (!isCaptain && !isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  if (!challenge || challenge.teamId !== teamId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();

  // Status-only update (approve/reject)
  if (body.status !== undefined && Object.keys(body).length === 1) {
    if (!["approved", "rejected"].includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    const updated = await prisma.teamChallenge.update({ where: { id: cid }, data: { status: body.status } });
    return NextResponse.json({ challenge: updated });
  }

  // Field edit
  const { title, type, metric, unit, goal, startDate, endDate, description, status } = body;
  const data: any = {};
  if (title !== undefined) data.title = title;
  if (type !== undefined) data.type = type;
  if (metric !== undefined) data.metric = metric;
  if (unit !== undefined) data.unit = unit;
  if (goal !== undefined) data.goal = goal != null ? parseFloat(goal) : null;
  if (startDate !== undefined) data.startDate = new Date(startDate);
  if (endDate !== undefined) data.endDate = new Date(endDate);
  if (description !== undefined) data.description = description || null;
  if (status !== undefined) data.status = status;

  const updated = await prisma.teamChallenge.update({ where: { id: cid }, data });
  return NextResponse.json({ challenge: updated });
}
