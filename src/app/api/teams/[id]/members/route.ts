// @ts-nocheck
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: teamId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const requesterId = (session.user as { id: string }).id;

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const myMembership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: requesterId } },
  });
  if (!myMembership || (myMembership.role !== "admin" && team.createdBy !== requesterId)) {
    return NextResponse.json({ error: "Only team admins can add members" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const member = await prisma.teamMember.create({
      data: { teamId, userId, role: "member" },
    });
    return NextResponse.json({ member, name: target.name }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Already a member", alreadyMember: true }, { status: 409 });
    }
    throw e;
  }
}
