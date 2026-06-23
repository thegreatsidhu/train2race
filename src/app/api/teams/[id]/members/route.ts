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

  // Check if already a member
  const existing = await prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
  if (existing) return NextResponse.json({ error: "Already a member", alreadyMember: true }, { status: 409 });

  // Check if there's already a pending invitation
  try {
    const existingInvite = await (prisma as any).teamInvitation.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });
    if (existingInvite && existingInvite.status === "pending") {
      return NextResponse.json({ error: "Invitation already sent", alreadyInvited: true }, { status: 409 });
    }

    // Upsert invitation (re-invite if previously declined)
    const invitation = await (prisma as any).teamInvitation.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, invitedBy: requesterId, status: "pending" },
      update: { status: "pending", invitedBy: requesterId },
    });
    return NextResponse.json({ invitation, name: target.name }, { status: 201 });
  } catch (e: any) {
    throw e;
  }
}
